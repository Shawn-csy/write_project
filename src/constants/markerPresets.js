export const RECOMMENDED_PRESETS = [
    {
        id: "preset-screenplay",
        label: "標準劇本增強 (Screenplay+)",
        description: "加上常用的製作標記，如音效、視覺特效、情緒提示。",
        configs: [
            {
                id: "sfx-marker",
                label: "音效 (SFX)",
                type: "block",
                matchMode: "prefix",
                start: "SFX:",
                style: { 
                    color: "#e11d48", 
                    fontWeight: "bold", 
                    textAlign: "right", 
                    textTransform: "uppercase",
                    fontSize: "0.9em"
                },
                renderer: { template: "[🔊 音效: {{content}}]" }
            },
            {
                id: "vfx-marker",
                label: "視覺特效 (VFX)",
                type: "block",
                matchMode: "prefix",
                start: "VFX:",
                style: { 
                    color: "#7c3aed", 
                    fontWeight: "bold", 
                    textAlign: "right",
                    fontSize: "0.9em"
                },
                renderer: { template: "[✨ 特效: {{content}}]" }
            },
            {
                id: "note-inline",
                label: "劇本筆記 (Note)",
                type: "inline",
                matchMode: "enclosure",
                start: "[[",
                end: "]]",
                style: { 
                    backgroundColor: "#fef9c3", 
                    color: "#854d0e",
                    padding: "2px 4px",
                    borderRadius: "4px"
                }
            }
        ]
    },
    {
        id: "preset-novel",
        label: "小說/散文模式 (Novel Mode)",
        description: "適合一般寫作，包含心理活動、粗體強調與註釋。",
        configs: [
             {
                id: "thought-marker",
                label: "內心獨白 (Thought)",
                type: "inline",
                matchMode: "enclosure",
                start: "(",
                end: ")",
                style: { 
                    color: "#64748b",
                    fontStyle: "italic" 
                }
            },
            {
                id: "emphasis-marker",
                label: "重點強調",
                type: "inline",
                matchMode: "enclosure",
                start: "*",
                end: "*",
                style: { 
                    color: "#0f172a",
                    fontWeight: "bold",
                    textDecoration: "underline",
                    textDecorationColor: "#f43f5e"
                }
            },
            {
                id: "comment-block",
                label: "作者備註",
                type: "block",
                matchMode: "prefix",
                start: "//",
                style: {
                    color: "#10b981",
                    fontSize: "0.85em",
                    borderLeft: "2px solid #10b981",
                    paddingLeft: "8px",
                    opacity: 0.8
                }
            }
        ]
    },
    {
        id: "preset-productivity",
        label: "生產力筆記 (Productivity)",
        description: "將編輯器變身為待辦清單與專案管理工具。",
        configs: [
            {
                id: "todo-checkbox",
                label: "待辦事項 (Todo)",
                type: "block",
                matchMode: "prefix",
                start: "- [ ]",
                style: {
                    color: "#334155"
                },
                renderer: { template: "⬜️ {{content}}" }
            },
            {
                id: "done-checkbox",
                label: "已完成 (Done)",
                type: "block",
                matchMode: "prefix",
                start: "- [x]",
                style: {
                    color: "#94a3b8",
                    textDecoration: "line-through"
                },
                renderer: { template: "✅ {{content}}" }
            },
            {
                id: "priority-high",
                label: "高優先級 !!!",
                type: "inline",
                matchMode: "enclosure",
                start: "!!!",
                end: "!!!",
                style: {
                    backgroundColor: "#fee2e2",
                    color: "#dc2626",
                    fontWeight: "bold",
                    padding: "2px 6px",
                    borderRadius: "12px",
                    fontSize: "0.8em"
                }
            }
        ]
    }
];
