/**
 * 三階段式腳本匯入處理系統 - 共用常數
 */

/**
 * 接行規則定義
 * 用於判斷哪些行應該被接回上一行
 */
export const JOIN_RULES = {
  // 高確信度：自動接行
  HIGH_CONFIDENCE: [
    {
      name: 'sfx_prefix',
      pattern: /^#SE$/,
      description: '音效標記後接內容',
      nextLinePattern: /^[^\s#@><\\/（【《▼▲☆].+$/  // 非標記開頭的內容
    },
    {
      name: 'position_prefix',
      pattern: /^[@＠]$/,
      description: '位置標記後接說明',
      nextLinePattern: /^[^\s#@><\\/（【《▼▲☆].+$/
    },
    {
      name: 'continuous_sfx_start',
      pattern: /^>{2,3}SE$/,
      description: '持續音效開始後接說明',
      nextLinePattern: /^[^\s#@><\\/（【《▼▲☆].+$/
    },
    {
      name: 'continuous_sfx_end',
      pattern: /^<{2,3}SE$/,
      description: '持續音效結束後接說明',
      nextLinePattern: /^[^\s#@><\\/（【《▼▲☆].+$/
    },
    {
      name: 'bg_start',
      pattern: /^\/\/BG[M]?$/i,
      description: '背景音開始後接說明',
      nextLinePattern: /^[^\s#@><\\/（【《▼▲☆].+$/
    }
  ],
  
  // 中確信度：接行但標記，讓使用者可以在預覽中看到
  MEDIUM_CONFIDENCE: [],
  
  // 低確信度：不接行，但在預覽中高亮提示
  LOW_CONFIDENCE: []
};

/**
 * 符號正規化對照表
 * key: 原始符號, value: 正規化後符號
 */
export const SYMBOL_NORMALIZATION = {
  // 全形轉半形（部分需要統一）
  '＠': '@',
  '＊': '*',
  '＃': '#',
  '＞': '>',
  '＜': '<',
  '／': '/',
  '＼': '\\',
  
  // 需要保留全形的不在此列表中
  // 例如：（）保留全形，因為語意和半形不同
};

/**
 * 預設的 Prefix 模式標記
 * 用於 MarkerDiscoverer 的預掃描
 */
export const KNOWN_PREFIX_PATTERNS = [
  { pattern: '#SE', type: 'sfx', label: '效果音' },
  { pattern: '@', type: 'position', label: '位置指示' },
  { pattern: '＠', type: 'position', label: '位置指示（全形）' },
  { pattern: '>>SE', type: 'sfx_continuous_start', label: '持續音效開始' },
  { pattern: '>>>SE', type: 'sfx_continuous_start', label: '持續音效開始' },
  { pattern: '><SE', type: 'sfx_continuous_mid', label: '持續音效中途' },
  { pattern: '<<SE', type: 'sfx_continuous_end', label: '持續音效結束' },
  { pattern: '<<<SE', type: 'sfx_continuous_end', label: '持續音效結束' },
  { pattern: '//BG', type: 'bg_start', label: '背景音開始' },
  { pattern: '//BGM', type: 'bg_start', label: '背景音樂開始' },
  { pattern: '\\\\BG', type: 'bg_end', label: '背景音結束' },
  { pattern: '\\\\BGM', type: 'bg_end', label: '背景音樂結束' },
  { pattern: '/\\BG', type: 'bg_mid', label: '背景音中途' },
  { pattern: '▼', type: 'section_start', label: '整段指示開始' },
  { pattern: '▲', type: 'section_end', label: '整段指示結束' },
  { pattern: '☆', type: 'note', label: '註解' },
  { pattern: '<blank>', type: 'visual_blank', label: '視覺留白' },
];

/**
 * 預設的 Enclosure 模式標記
 * 用於 MarkerDiscoverer 的預掃描
 */
export const KNOWN_ENCLOSURE_PATTERNS = [
  { start: '（', end: '）', type: 'paren', label: '全形括號' },
  { start: '(', end: ')', type: 'paren_half', label: '半形括號' },
  { start: '【', end: '】', type: 'post', label: '後製效果' },
  { start: '{{', end: '}}', type: 'sound', label: '音效（雙括號）' },
  { start: '((', end: '))', type: 'section', label: '段落（雙括號）' },
  { start: '<<', end: '>>', type: 'post_angle', label: '後期（角括號）' },
  { start: '＜', end: '＞', type: 'duration', label: '時長說明' },
];

/**
 * 判斷一行是否可能是角色名
 */
export const CHARACTER_PATTERNS = [
  /^[\u4e00-\u9fa5]{2,4}$/,  // 2-4 個中文字
  /^[\u4e00-\u9fa5]{2,4}[\s]*（.*）$/,  // 角色名（語氣）
];

/**
 * 空行判斷
 */
export const isBlankLine = (line) => line.trim() === '';
