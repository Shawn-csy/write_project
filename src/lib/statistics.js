import { Fountain } from "fountain-js";

/**
 * Calculate statistics from a raw Fountain script string.
 * @param {string} rawScript 
 */
export const calculateStats = (rawScript = "") => {
  const fountain = new Fountain();
  const output = fountain.parse(rawScript, true); // true = get tokens
  const tokens = output.tokens || [];

  let sceneCount = 0;
  let actionCount = 0;
  let dialogueCount = 0;
  const characterLines = {}; // { "JOHN": 12 }
  const timeframeDistribution = { INT: 0, EXT: 0, OTHER: 0 };

  tokens.forEach((token) => {
    switch (token.type) {
      case "scene_heading":
        sceneCount++;
        const text = token.text.toUpperCase().trim();
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
        const charName = token.text.trim().replace(/\s*\(.*\)$/, "" /* remove parens */).trim();
        if (charName) {
            characterLines[charName] = (characterLines[charName] || 0) + 1;
        }
        break;

      case "dialogue":
        dialogueCount++;
        break;
      
      case "parenthetical":
        // Count as part of dialogue technically, but token-wise distinct
        break;
    }
  });

  // Sort characters by line count
  const sortedCharacters = Object.entries(characterLines)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const totalBlocks = actionCount + dialogueCount;
  const actionRatio = totalBlocks ? Math.round((actionCount / totalBlocks) * 100) : 0;
  const dialogueRatio = totalBlocks ? Math.round((dialogueCount / totalBlocks) * 100) : 0;

  // Speaking time estimate (Rough heuristic)
  // Avg dialogue block ~ 3 seconds? Or word count?
  // Let's stick to line counts for now as it's more deterministic.

  return {
    sceneCount,
    totalBlocks,
    actionRatio,
    dialogueRatio,
    characterStats: sortedCharacters,
    timeframeDistribution
  };
};
