
import re
from typing import List, Dict, Any, Optional

class ScriptAnalyzer:
    def __init__(self, raw_script: str, marker_configs: List[Dict] = None):
        self.raw_script = raw_script or ""
        self.marker_configs = marker_configs or []
        self.defaults = {
            "durationMinutes": 0,
            "counts": {
                "scenes": 0,
                "nodes": 0, 
                "dialogueLines": 0,
                "dialogueChars": 0,
                "actionChars": 0,
                "totalChars": 0,
                "cues": 0
            },
            "locations": [],
            "sentences": {
                "dialogue": {},
                "action": [],
                "sceneHeadings": [],
                "sfx": []
            },
            "characterStats": [],
            "timeframeDistribution": {"INT": 0, "EXT": 0, "OTHER": 0},
            "customLayers": {},
            "dialogueRatio": 0,
            "actionRatio": 0,
            "actionRatio": 0,
            "pauseSeconds": 0,
            "customDurationSeconds": 0,
            "pauseItems": []
        }
        
    def analyze(self) -> Dict[str, Any]:
        result = self.defaults.copy()
        
        # 1. Split Title Page
        body_text = self._strip_title_page(self.raw_script)
        lines = body_text.split('\n')
        
        # 2. Parse
        self._parse_with_state_machine(lines, result)
        
        # Post Calculations
        self._calculate_post_stats(result)
        
        return result

    def _strip_title_page(self, text: str) -> str:
        # Simple heuristic
        if not text: return ""
        lines = text.split('\n')
        body_start = 0
        has_key_value = False
        
        for i, line in enumerate(lines):
            if ':' in line and not line.strip().startswith('INT') and not line.strip().startswith('EXT'):
               has_key_value = True
            elif line.strip() == '' and has_key_value:
               body_start = i + 1
               break
            elif not ':' in line and has_key_value:
                # Ending metadata block
                pass
            elif i > 20: # Safety break
                break
                
        if body_start > 0:
            return '\n'.join(lines[body_start:])
        return text

    def _parse_with_state_machine(self, lines: List[str], result: Dict):
        state = "ACTION" # ACTION, DIALOGUE
        current_character = None
        
        # Prepare Markers
        block_configs = [c for c in self.marker_configs if c.get('isBlock')]
        inline_configs = [c for c in self.marker_configs if not c.get('isBlock')]
        
        # Sorting by priority (if exists) or order
        # Assuming list is ordered
        
        active_block_config = None
        block_buffer = []
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                # End Block if needed
                if active_block_config:
                    self._flush_block(active_block_config, block_buffer, result)
                    active_block_config = None
                    block_buffer = []

                state = "ACTION"
                current_character = None
                continue

            # 1. Active Block Handling
            if active_block_config:
                end_tag = active_block_config.get('end')
                if end_tag and stripped.startswith(end_tag):
                    self._flush_block(active_block_config, block_buffer, result)
                    active_block_config = None
                    block_buffer = []
                else:
                    block_buffer.append(stripped)
                continue

            # 2. Check for Start of Block
            block_started = False
            for config in block_configs:
                start_tag = config.get('start')
                end_tag = config.get('end')
                if start_tag and stripped.startswith(start_tag):
                    if end_tag and stripped.endswith(end_tag) and len(stripped) > len(start_tag) + len(end_tag):
                        # Single line block
                        content = stripped[len(start_tag):-len(end_tag)].strip()
                        self._add_custom_layer(config, content, result)
                        block_started = True
                        break
                    else:
                        # Start of multi-line block
                        active_block_config = config
                        block_buffer = []
                        # If content on same line? 
                        content = stripped[len(start_tag):].strip()
                        if content: block_buffer.append(content)
                        block_started = True
                        break
            if block_started:
                continue

            # 3. Inline Markers
            inline_handled = False
            for config in inline_configs:
                match_mode = config.get('matchMode')
                
                # Prefix
                if match_mode == 'prefix' and config.get('start'):
                    prefix = config.get('start')
                    if stripped.startswith(prefix):
                        content = stripped[len(prefix):].strip()
                        self._add_custom_layer(config, content, result)
                        inline_handled = True
                        break
                
                # Enclosure
                if match_mode == 'enclosure' and config.get('start') and config.get('end'):
                    start = re.escape(config.get('start'))
                    end = re.escape(config.get('end'))
                    pattern = f"{start}(.*?){end}"
                    
                    # We need to find all matches, handle them, and remove them from the line for downstream stats
                    # But be careful about index shifting if we modify 'stripped' in place.
                    # Better to collect matches first.
                    matches = list(re.finditer(pattern, stripped))
                    found = False
                    for m in matches:
                        content = m.group(1).strip()
                        if content:
                            self._add_custom_layer(config, content, result)
                            found = True
                    
                    if found:
                        # Remove markers from line so they aren't counted as dialogue text
                        stripped = re.sub(pattern, "", stripped).strip() 
                        # inline_handled = True # No longer need to force skip, just stripped it.
                        
            # if inline_handled:
            #    continue 
            
            # If stripped is now empty, skip
            if not stripped:
                continue

            # 4. Standard Parsing
            result["counts"]["totalChars"] += len(stripped)
            
            # Scene Heading (Force reset)
            if stripped.isupper() and (stripped.startswith("INT") or stripped.startswith("EXT") or "." in stripped):
                result["counts"]["scenes"] += 1
                result["locations"].append(stripped)
                result["sentences"]["sceneHeadings"].append(stripped)
                # Timeframe
                if "INT" in stripped: 
                    result["timeframeDistribution"]["INT"] += 1
                elif "EXT" in stripped: 
                    result["timeframeDistribution"]["EXT"] += 1
                else: 
                    result["timeframeDistribution"]["OTHER"] += 1
                
                state = "ACTION"
                continue
            
            # Character Cue
            if state == "ACTION" and stripped.isupper() and not stripped.endswith("TO:"):
                current_character = stripped
                state = "DIALOGUE"
                continue
            
            if state == "DIALOGUE":
                if stripped.startswith("(") and stripped.endswith(")"):
                    pass # Parenthetical
                else:
                    if current_character:
                        if current_character not in result["sentences"]["dialogue"]:
                            result["sentences"]["dialogue"][current_character] = []
                        result["sentences"]["dialogue"][current_character].append(stripped)
                        
                        length = len(stripped.replace(" ", ""))
                        result["counts"]["dialogueChars"] += length
                        result["counts"]["dialogueLines"] += 1
            else:
                result["sentences"]["action"].append(stripped)
                length = len(stripped.replace(" ", ""))
                result["counts"]["actionChars"] += length
        
        # Flush pending block
        if active_block_config:
             self._flush_block(active_block_config, block_buffer, result)

    def _flush_block(self, config, buffer, result):
        content = "\n".join(buffer).strip()
        if content:
             self._add_custom_layer(config, content, result)

    def _add_custom_layer(self, config, content, result):
        layer_id = config.get('id')
        layer_name = config.get('name') or layer_id
        if layer_name not in result["customLayers"]:
            result["customLayers"][layer_name] = []
        result["customLayers"][layer_name].append(content)
        result["counts"]["cues"] += 1
        
        # Fixed Duration
        if 'fixedDuration' in config:
            try:
                duration = float(config['fixedDuration'])
                result["customDurationSeconds"] += duration
            except (ValueError, TypeError):
                pass


    def _calculate_post_stats(self, result: Dict):
        # Character Stats
        char_stats = []
        for char, lines in result["sentences"]["dialogue"].items():
            char_stats.append({
                "name": char,
                "count": len(lines),
                "percentage": 0
            })
        char_stats.sort(key=lambda x: x["count"], reverse=True)
        
        total_lines = sum(c["count"] for c in char_stats)
        if total_lines > 0:
            for c in char_stats:
                c["percentage"] = round((c["count"] / total_lines) * 100)
        
        result["characterStats"] = char_stats
        
        # Duration
        d_chars = result["counts"]["dialogueChars"]
        a_chars = result["counts"]["actionChars"]
        
        result["durationMinutes"] = (d_chars / 200) + (result["customDurationSeconds"] / 60)
        result["estimates"] = {
            "pure": (d_chars / 200) + (result["customDurationSeconds"] / 60),
            "all": ((d_chars + a_chars) / 300) + (result["customDurationSeconds"] / 60)
        }
        
        # Ratios
        total = d_chars + a_chars
        if total > 0:
            result["dialogueRatio"] = round((d_chars / total) * 100)
            result["actionRatio"] = round((a_chars / total) * 100)
