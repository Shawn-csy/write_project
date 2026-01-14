export const defaultMarkerConfigs = [
  // Block Markers
  { id: 'sound', label: '效果音', start: '{{', end: '}}', isBlock: true, type: 'block', style: { fontWeight: 'bold', color: '#eab308' } },
  { id: 'section', label: '段落', start: '((', end: '))', isBlock: true, type: 'block', style: { fontWeight: 'bold', borderLeft: '4px solid #94a3b8' } },
  { id: 'post', label: '後期', start: '<<', end: '>>', isBlock: true, type: 'block', style: { color: '#94a3b8', fontStyle: 'italic' } },
  { id: 'dual', label: '雙人對話', start: '^{', end: '}', isBlock: true, type: 'dual', style: {} },

  // Inline Markers (Migrated from hardcoded)
  {
    id: "paren",
    label: "括號與距離",
    start: "(",
    end: ")",
    type: "inline",
    matchMode: "enclosure",
    keywords: ["V.O.", "O.S.", "O.C.", "畫外音", "旁白", "電話", "話筒"],
    style: { color: "#f97316" }, // Orange for distance
    dimIfNotKeyword: true, // Opacity 0.6 if not distance
    showDelimiters: true,
  },
  // Body Text (Action) - Explicitly configurable now
  { 
    id: 'action', 
    label: '內文 (Action)', 
    start: '', 
    end: '', 
    isBlock: true, 
    type: 'block', 
    priority: 100, // Low priority default
    style: { textAlign: 'left', color: '#000000', fontFamily: "'Courier New', 'Songti TC', 'SimSun', serif" } 
  },
];
