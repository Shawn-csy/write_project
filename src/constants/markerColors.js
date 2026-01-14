export const MARKER_COLORS = [
    // Red / Pink
    { id: 'russet', name: 'Russet (赭紅)', light: '#663A35', dark: '#B3837D' },
    { id: 'pastel-rose', name: 'Rose (乾燥玫瑰)', light: '#B87B7B', dark: '#EBC0C0' },
    
    // Yellow / Brown
    { id: 'antique-gold', name: 'Antique Gold (古金)', light: '#70552D', dark: '#BC9E6A' },
    { id: 'sand', name: 'Sand (沙色)', light: '#B89C72', dark: '#E8D1AC' },
    
    // Green
    { id: 'olive', name: 'Olive (橄欖灰)', light: '#8C8C78', dark: '#CBCBBA' },
    { id: 'sage', name: 'Sage (鼠尾草)', light: '#6B966A', dark: '#AED9AD' },
    { id: 'deep-teal', name: 'Deep Teal (墨綠)', light: '#26524C', dark: '#6EA39C' },
    { id: 'verdigris', name: 'Verdigris (灰綠)', light: '#4B8F84', dark: '#8CC9BE' },

    // Blue
    { id: 'cadet', name: 'Cadet (灰藍)', light: '#6D8F8C', dark: '#B0CCC9' },
    { id: 'steel', name: 'Steel (鐵灰藍)', light: '#587B88', dark: '#9ABCC9' },
    { id: 'slate-blue', name: 'Slate Blue (靛灰)', light: '#3D4C5C', dark: '#7D8D9E' },
    
    // Purple
    { id: 'periwinkle', name: 'Periwinkle (長春花)', light: '#7582C0', dark: '#BDC8F2' },
    { id: 'deep-iris', name: 'Deep Iris (深鳶尾)', light: '#4E4057', dark: '#91809C' },
    { id: 'orchid', name: 'Orchid (蘭花紫)', light: '#96708F', dark: '#D9B9D2' },

    // Grays
    { id: 'warm-gray', name: 'Warm Gray (暖灰)', light: '#63625F', dark: '#A8A7A4' },
    { id: 'charcoal', name: 'Charcoal (炭灰)', light: '#333333', dark: '#808080' },

    // Legacy mapping support kept in index.css but hidden from UI default list
];

export const getCssDetails = (colorId) => {
    const color = MARKER_COLORS.find(c => c.id === colorId);
    if (!color) return null;
    return `var(--marker-color-${colorId})`;
};
