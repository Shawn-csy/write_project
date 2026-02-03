/**
 * 預設標記模板
 * 提供常用的標記設定範本，讓用戶快速建立規則
 */
export const MARKER_PRESETS = [
  {
    id: 'sound-effect',
    name: '音效/SFX',
    description: '標記單行音效說明',
    icon: 'Volume2',
    category: 'audio',
    config: {
      id: '', // Will be generated
      label: '音效',
      matchMode: 'prefix',
      isBlock: true,
      type: 'block',
      start: '#SE',
      style: { color: '#eab308', fontWeight: 'bold' }
    }
  },
  {
    id: 'continuous-sound',
    name: '持續性音效',
    description: '標記多行持續播放的音效區間',
    icon: 'Music',
    category: 'audio',
    config: {
      id: '',
      label: '持續音效',
      matchMode: 'range',
      isBlock: true,
      type: 'block',
      start: '>>SE',
      end: '<<SE',
      pause: '><SE',
      pauseLabel: '',
      style: { 
        borderLeft: '2px solid #1565C0',
        paddingLeft: '8px',
        color: '#1565C0'
      }
    }
  },
  {
    id: 'dialogue-note',
    name: '對白註記',
    description: '標記對白中的說明（如 V.O., O.S.）',
    icon: 'MessageSquare',
    category: 'dialogue',
    config: {
      id: '',
      label: '對白註記',
      matchMode: 'enclosure',
      isBlock: false,
      type: 'inline',
      start: '(',
      end: ')',
      keywords: ['V.O.', 'O.S.', 'O.C.', '畫外音', '旁白'],
      dimIfNotKeyword: true,
      showDelimiters: true,
      style: { color: '#f97316' }
    }
  },
  {
    id: 'action-note',
    name: '動作指示',
    description: '標記動作或場景說明',
    icon: 'Clapperboard',
    category: 'scene',
    config: {
      id: '',
      label: '動作',
      matchMode: 'enclosure',
      isBlock: true,
      type: 'block',
      start: '{{',
      end: '}}',
      style: { 
        fontStyle: 'italic',
        color: '#6b7280'
      }
    }
  },
  {
    id: 'post-production',
    name: '後期處理',
    description: '標記需要後期處理的內容',
    icon: 'Film',
    category: 'production',
    config: {
      id: '',
      label: '後期',
      matchMode: 'enclosure',
      isBlock: true,
      type: 'block',
      start: '<<',
      end: '>>',
      style: { 
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        color: '#8b5cf6'
      }
    }
  },
  {
    id: 'custom-blank',
    name: '自訂（空白）',
    description: '從頭開始建立自訂標記',
    icon: 'Edit3',
    category: 'custom',
    config: {
      id: '',
      label: '新標記',
      matchMode: 'prefix',
      isBlock: true,
      type: 'block',
      start: '',
      style: {}
    }
  }
];

/**
 * 類型選項（Step 1 使用）
 */
export const MARKER_TYPES = [
  {
    id: 'single',
    name: '單行標記',
    description: '標記獨立的一行內容',
    icon: 'FileText',
    example: '#SE 門鈴響',
    matchModes: ['prefix', 'enclosure']
  },
  {
    id: 'range',
    name: '區間標記',
    description: '標記多行內容的開始與結束',
    icon: 'Package',
    example: '>>SE 開始\n內容...\n<<SE 結束',
    matchModes: ['range']
  },
  {
    id: 'inline',
    name: '行內樣式',
    description: '標記行中的特定片段',
    icon: 'Highlighter',
    example: '角色名 (V.O.)',
    matchModes: ['enclosure']
  }
];

/**
 * 樣式預設選項（Step 3 使用）
 */
export const STYLE_PRESETS = [
  {
    id: 'solid-line',
    name: '連接線',
    icon: 'AlignLeft', 
    style: {
      borderLeft: '2px solid currentColor',
      paddingLeft: '8px'
    }
  },
  {
    id: 'dashed-line',
    name: '虛線',
    icon: 'AlignLeft', // Will style as dashed in UI
    style: {
      borderLeft: '2px dashed currentColor',
      paddingLeft: '8px'
    }
  },
  {
    id: 'background',
    name: '背景色',
    icon: 'Square',
    style: {
      backgroundColor: 'rgba(100, 100, 100, 0.08)'
    }
  },
  {
    id: 'none',
    name: '無樣式',
    icon: 'CircleOff',
    style: {}
  }
];
