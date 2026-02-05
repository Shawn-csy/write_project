import { useRef, useState } from "react";
import { buildPrintHtml } from "../lib/print";

export function useScriptActions({ 
    accentConfig, processedScriptHtml, rawScriptHtml, 
    titleHtml, titleName, activeFile, titleSummary, titleNote 
}) {
    const [shareCopied, setShareCopied] = useState(false);
    const shareCopiedTimer = useRef(null);

    const handleExportPdf = (e) => {
        e?.stopPropagation();
        const bodyHtml = processedScriptHtml || rawScriptHtml;
        const hasContent = Boolean(bodyHtml || titleHtml);
        if (!hasContent) {
            window.print();
            return;
        }
        // Clone all styles from the main document (Tailwind, global CSS, etc.)
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(node => node.cloneNode(true));

        const exportHtml = buildPrintHtml({
            titleName,
            activeFile,
            titleHtml,
            rawScriptHtml: bodyHtml,
        });

        const blob = new Blob([exportHtml], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "-9999px";
        iframe.style.bottom = "-9999px";
        iframe.style.width = "0px";
        iframe.style.height = "0px";
        iframe.style.border = "none";
        
        document.body.appendChild(iframe);
        
        // Write content and inject styles
        const iframeDoc = iframe.contentWindow?.document;
        if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(exportHtml);
            iframeDoc.close();
            
            // Append cloned styles to head
            styles.forEach(styleNode => {
                iframeDoc.head.appendChild(styleNode);
            });

            // Wait for images/fonts/styles to apply
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                
                // Cleanup after print dialog might be closed (approx)
                // Note: There is no reliable event for "print finished" across browsers.
                setTimeout(() => {
                     URL.revokeObjectURL(url);
                     iframe.remove();
                }, 2000); // Give user time to see dialog
            }, 500);
        } else {
             // Fallback if iframe access fails (unlikely for blob)
             console.error("Failed to access print iframe");
        }
    };

    const handleShareUrl = async (e) => {
        e?.stopPropagation?.();
        if (typeof window === "undefined") return;
        const shareUrl = window.location.href;
        
        const title = titleName || activeFile || "Screenplay Reader";
        const summary = titleSummary || titleNote || (titleName ? `${titleName} 劇本摘要` : "線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。");

        // Force Clipboard Copy (User requested to skip native share menu)
        // Fallback: Copy to clipboard (URL only for better preview generation)
        const textToCopy = shareUrl;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(textToCopy);
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
