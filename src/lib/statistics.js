import { parseScreenplay } from "./screenplayAST";

/**
 * Calculate statistics using the AST parser which respects custom markers.
 * @param {string} rawScript 
 * @param {Array} markerConfigs - New: Pass current marker configurations
 */
export const calculateStats = (rawScript = "", markerConfigs = []) => {
  // Use the shared AST parser
  const { ast } = parseScreenplay(rawScript, markerConfigs);
  const nodes = ast.children || [];

  let sceneCount = 0;
  let actionCount = 0;
  let dialogueCount = 0;
  const characterLines = {}; // { "JOHN": 12 }
  const timeframeDistribution = { INT: 0, EXT: 0, OTHER: 0 };

  const processNode = (node) => {
    switch (node.type) {
      case "scene_heading":
        sceneCount++;
        const text = (node.text || "").toUpperCase().trim();
        if (text.startsWith("INT") || text.startsWith("I/E")) {
            timeframeDistribution.INT++;
        } else if (text.startsWith("EXT")) {
            timeframeDistribution.EXT++;
        } else {
            timeframeDistribution.OTHER++;
        }
        break;
      
      case "action":
        actionCount++;
        break;

      case "character":
        // In our AST, character node is a child of speech, or just a token.
        // It uses .text for the name.
        const charName = (node.text || "").trim().replace(/\s*\(.*\)$/, "").trim();
        if (charName) {
            characterLines[charName] = (characterLines[charName] || 0) + 1;
        }
        break;

      case "dialogue":
        dialogueCount++;
        break;

      case "layer": // Block markers
        // Custom markers can be defined as 'dialogue', 'action', or other types.
        // For now, let's look at the config to decide how to count them.
        // If config says `style` is something, we might infer. 
        // But usually markers are structurally "Action" or "Dialogue" in nature?
        // Let's assume most custom block markers are Action-like unless specified otherwise?
        // Or if they wrap text, maybe counts as 1 block.
        actionCount++; 
        break;
    }

    // AST is flat mostly, but if we had children we'd recurse.
    // parseScriptToAST returns a flat list of nodes mostly (except for potential future nesting).
    if (node.children) {
        node.children.forEach(processNode);
    }
  };

  nodes.forEach(processNode);

  // Sort characters by line count
  const sortedCharacters = Object.entries(characterLines)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const totalBlocks = actionCount + dialogueCount;
  const actionRatio = totalBlocks ? Math.round((actionCount / totalBlocks) * 100) : 0;
  const dialogueRatio = totalBlocks ? Math.round((dialogueCount / totalBlocks) * 100) : 0;

  return {
    sceneCount,
    totalBlocks,
    actionRatio,
    dialogueRatio,
    characterStats: sortedCharacters,
    timeframeDistribution
  };
};
