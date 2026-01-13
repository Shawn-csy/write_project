export const defaultMarkerConfigs = [
    // Block Markers
    { id: 'sound', label: '效果音', start: '{{', end: '}}', isBlock: true, type: 'block', style: { fontWeight: 'bold', color: '#eab308' } },
    { id: 'section', label: '段落', start: '((', end: '))', isBlock: true, type: 'block', style: { fontWeight: 'bold', borderLeft: '4px solid #94a3b8' } },
    { id: 'post', label: '後期', start: '<<', end: '>>', isBlock: true, type: 'block', style: { color: '#94a3b8', fontStyle: 'italic' } },
    { id: 'dual', label: '雙人對話', start: '^{', end: '}', isBlock: true, type: 'dual', style: {} },
    
    // Inline Markers (Migrated from hardcoded)
    { 
        id: 'paren', 
        label: '括號與距離', 
        start: '(', 
        end: ')', 
        type: 'inline', 
        matchMode: 'enclosure', 
        keywords: ['V.O.', 'O.S.', 'O.C.', '畫外音', '旁白', '電話', '話筒'], 
        style: { color: '#f97316' }, // Orange for distance
        dimIfNotKeyword: true,       // Opacity 0.6 if not distance
        showDelimiters: true
    },
    { 
        id: 'brace', 
        label: '花括號', 
        start: '{', 
        end: '}', 
        type: 'inline', 
        matchMode: 'enclosure', 
        style: { color: '#f97316' }, // Orange
        showDelimiters: true // Usually shown? Or hidden? Fountain spec says {notes} are strictly ignored? 
        // Implementation before: {Orange} -> text-orange-500. So content is shown.
    },
    { 
        id: 'pipe', 
        label: '紅字備註', 
        start: '|', 
        end: '', 
        type: 'inline', 
        matchMode: 'prefix', 
        style: { color: '#ef4444' } // Red
    },
  // System Markers exposed as Regex
  { 
      id: 'sfx_system', 
      label: '音效 (SFX)', 
      type: 'inline', 
      matchMode: 'regex', 
      regex: '\\[\\s*(?:sfx|SFX)[:：]\\s*(.*?)\\s*\\]', 
      style: { color: 'var(--script-sfx-color, #a855f7)', fontSize: '0.9em' },
      showDelimiters: false,
      priority: 100 // High priority
  },
  {
      id: 'whitespace_system',
      label: '留白指令',
      type: 'inline',
      matchMode: 'regex',
      // Matches (長留白) or （長留白）
      regex: '^[（\\(]\\s*(長留白|中留白|短留白|留白)\\s*[）\\)]$',
      style: { display: 'block', textAlign: 'center', margin: '1em 0', fontStyle: 'italic', color: '#94a3b8' },
      priority: 100
  }
];
