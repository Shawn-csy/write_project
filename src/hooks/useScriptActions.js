import { useRef, useState } from "react";
import { buildPrintHtml } from "../lib/print";

export function useScriptActions({ 
    exportMode, accentConfig, processedScriptHtml, rawScriptHtml, 
    titleHtml, titleName, activeFile, titleSummary, titleNote 
}) {
    const [shareCopied, setShareCopied] = useState(false);
    const shareCopiedTimer = useRef(null);

    const handleExportPdf = (e) => {
        e?.stopPropagation();
        const bodyHtml = exportMode === "processed" ? processedScriptHtml || rawScriptHtml : rawScriptHtml;
        const hasContent = Boolean(bodyHtml || titleHtml);
        if (!hasContent) {
            window.print();
            return;
        }
        const accentValue = getComputedStyle(document.documentElement).getPropertyValue("--accent") || accentConfig.accent;
        const accentForegroundValue = getComputedStyle(document.documentElement).getPropertyValue("--accent-foreground") || accentConfig.accentForeground;
        const accentMutedValue = getComputedStyle(document.documentElement).getPropertyValue("--accent-muted") || accentConfig.accentMuted;

        const exportHtml = buildPrintHtml({
            titleName,
            activeFile,
            titleHtml,
            rawScriptHtml: bodyHtml,
            accent: accentValue.trim(),
            accentForeground: accentForegroundValue.trim(),
            accentMuted: accentMutedValue.trim(),
        });

        const blob = new Blob([exportHtml], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "-9999px";
        iframe.style.bottom = "-9999px";
        iframe.src = url;
        iframe.onload = () => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => {
                URL.revokeObjectURL(url);
                iframe.remove();
            }, 1000);
        };
        document.body.appendChild(iframe);
    };

    const handleShareUrl = async (e) => {
        e?.stopPropagation?.();
        if (typeof window === "undefined") return;
        const shareUrl = window.location.href;
        
        const title = titleName || activeFile || "Screenplay Reader";
        const summary = titleSummary || titleNote || (titleName ? `${titleName} 劇本摘要` : "線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。");

        if (navigator.share) {
            try {
                await navigator.share({ title, text: summary, url: shareUrl });
                return;
            } catch (err) {}
        }
        const richText = `【${title}】\n${summary}\n\n${shareUrl}`;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(richText);
                setShareCopied(true);
                if (shareCopiedTimer.current) clearTimeout(shareCopiedTimer.current);
                shareCopiedTimer.current = setTimeout(() => setShareCopied(false), 1800);
            } else {
                window.prompt("複製分享連結", shareUrl);
            }
        } catch (err) { console.error(err); }
    };

    return {
        handleExportPdf,
        handleShareUrl,
        shareCopied
    };
}
