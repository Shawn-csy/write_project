export const MARKER_COLORS = [
    { id: 'red', name: 'Coral Red', light: '#dc2626', dark: '#f87171' },
    { id: 'orange', name: 'Pumpkin', light: '#ea580c', dark: '#fb923c' },
    { id: 'amber', name: 'Amber', light: '#d97706', dark: '#fbbf24' },
    { id: 'yellow', name: 'Daisy', light: '#ca8a04', dark: '#facc15' },
    { id: 'lime', name: 'Lime', light: '#65a30d', dark: '#a3e635' },
    { id: 'green', name: 'Forest', light: '#16a34a', dark: '#4ade80' },
    { id: 'emerald', name: 'Emerald', light: '#059669', dark: '#34d399' },
    { id: 'teal', name: 'Teal', light: '#0d9488', dark: '#2dd4bf' },
    { id: 'cyan', name: 'Cyan', light: '#0891b2', dark: '#22d3ee' },
    { id: 'sky', name: 'Sky', light: '#0284c7', dark: '#38bdf8' },
    { id: 'blue', name: 'Royal', light: '#2563eb', dark: '#60a5fa' },
    { id: 'indigo', name: 'Indigo', light: '#4f46e5', dark: '#818cf8' },
    { id: 'violet', name: 'Violet', light: '#7c3aed', dark: '#a78bfa' },
    { id: 'purple', name: 'Purple', light: '#9333ea', dark: '#c084fc' },
    { id: 'fuchsia', name: 'Fuchsia', light: '#c026d3', dark: '#e879f9' },
    { id: 'pink', name: 'Pink', light: '#db2777', dark: '#f472b6' },
    { id: 'rose', name: 'Rose', light: '#e11d48', dark: '#fb7185' },
    { id: 'slate', name: 'Slate', light: '#475569', dark: '#94a3b8' },
    { id: 'gray', name: 'Gray', light: '#4b5563', dark: '#9ca3af' },
    { id: 'zinc', name: 'Zinc', light: '#52525b', dark: '#a1a1aa' },
];

export const getCssDetails = (colorId) => {
    const color = MARKER_COLORS.find(c => c.id === colorId);
    if (!color) return null;
    return `var(--marker-color-${colorId})`;
};
