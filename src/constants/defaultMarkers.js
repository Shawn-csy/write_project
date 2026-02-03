/**
 * 預設 Marker 設定（純 Marker 模式）
 * 
 * 必要欄位：
 * - id: 唯一識別碼
 * - label: 顯示名稱
 * - start: 起始標記
 * - matchMode: 'prefix' (前綴) | 'enclosure' (包圍) | 'range' (區間) | 'virtual' (虛擬樣式)
 * - isBlock: true (block 級別) | false (inline)
 * 
 * 選填欄位：
 * - end: 結束標記 (enclosure 模式需要)
 * - type: 'block' | 'inline' | 'dual'
 * - style: 渲染樣式
 * - priority: 優先權（數字越大越先匹配）
 * 
 * Range 模式專用欄位：
 * - rangeRole: 'start' | 'end' (區間開始或結束)
 * - rangeGroupId: 配對的區間群組 ID
 * - rangeStyle: 區間內容的樣式 (用於 matchMode: 'virtual')
 */
export const defaultMarkerConfigs = [
  // === Block Markers (Enclosure 模式) ===
  { 
    id: 'sound', 
    label: '效果音', 
    start: '{{', 
    end: '}}', 
    isBlock: true, 
    matchMode: 'enclosure',
    type: 'block', 
    style: { fontWeight: 'bold', color: '#eab308' } 
  },
  { 
    id: 'section', 
    label: '段落', 
    start: '((', 
    end: '))', 
    isBlock: true, 
    matchMode: 'enclosure',
    type: 'block', 
    style: { fontWeight: 'bold', borderLeft: '4px solid #94a3b8' } 
  },
  { 
    id: 'post', 
    label: '後期', 
    start: '<<', 
    end: '>>', 
    isBlock: true, 
    matchMode: 'enclosure',
    type: 'block', 
    style: { color: '#94a3b8', fontStyle: 'italic' } 
  },
  { 
    id: 'dual', 
    label: '雙人對話', 
    start: '^{', 
    end: '}', 
    isBlock: true, 
    matchMode: 'enclosure',
    type: 'dual', 
    style: {} 
  },

  // === Range Markers (區間模式) ===
  // 持續音效區間：>>SE ... <<SE
  { 
    id: 'se-continuous-start', 
    label: '持續音效開始', 
    start: '>>SE', 
    isBlock: true, 
    matchMode: 'range',
    rangeRole: 'start',
    rangeGroupId: 'se-continuous',
    type: 'block', 
    style: { 
      color: '#1565C0', 
      fontWeight: 'bold',
      borderLeft: '4px solid #1565C0',
      paddingLeft: '8px'
    } 
  },
  { 
    id: 'se-continuous-end', 
    label: '持續音效結束', 
    start: '<<SE', 
    isBlock: true, 
    matchMode: 'range',
    rangeRole: 'end',
    rangeGroupId: 'se-continuous',
    type: 'block', 
    style: { 
      color: '#1565C0', 
      fontWeight: 'bold',
      borderLeft: '4px solid #90CAF9',
      paddingLeft: '8px'
    } 
  },
  // 區間內容的虛擬樣式
  { 
    id: 'se-continuous', 
    label: '持續音效區間', 
    matchMode: 'virtual',
    rangeStyle: { 
      backgroundColor: 'rgba(21, 101, 192, 0.08)',
      borderLeft: '2px dashed #1565C0',
      paddingLeft: '8px'
    } 
  },

  // === Inline Markers ===
  {
    id: "paren",
    label: "括號與距離",
    start: "(",
    end: ")",
    isBlock: false,
    type: "inline",
    matchMode: "enclosure",
    keywords: ["V.O.", "O.S.", "O.C.", "畫外音", "旁白", "電話", "話筒"],
    style: { color: "#f97316" },
    dimIfNotKeyword: true,
    showDelimiters: true,
  },
  
  // === 預設 Action 樣式 ===
  // 這個不會被匹配，只是提供預設樣式
  { 
    id: 'action', 
    label: '內文 (Action)', 
    start: '', 
    end: '', 
    isBlock: true, 
    matchMode: 'none',
    type: 'block', 
    priority: 100,
    style: { 
      textAlign: 'left', 
      color: '#000000', 
      fontFamily: "'Courier New', 'Songti TC', 'SimSun', serif" 
    } 
  },
];
