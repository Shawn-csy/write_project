import { buildPrintHtml } from "./printHtml";
import { getRenderedSnapshot } from "./exportShared";

export const exportScriptAsPdf = async (
  title: string,
  payload: { renderedHtml?: string; text?: string; headerHtml?: string } = {}
) => {
  const snapshot = getRenderedSnapshot(payload);
  const headerHtml = payload?.headerHtml || `<h1>${title || "Script"}</h1>`;
  const exportHtml = buildPrintHtml({
    titleName: title || "Script",
    activeFile: title || "Script",
    titleHtml: headerHtml,
    rawScriptHtml: snapshot.html,
  });

  const styles = Array.from(document.querySelectorAll("style, link[rel=\"stylesheet\"]"))
    .map((node) => node.cloneNode(true));

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "-9999px";
  iframe.style.bottom = "-9999px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    iframe.remove();
    window.print();
    return;
  }

  iframeDoc.open();
  iframeDoc.write(exportHtml);
  iframeDoc.close();
  styles.forEach((styleNode) => iframeDoc.head.appendChild(styleNode));

  // Force light theme in print iframe regardless of reader's active dark/light setting.
  iframeDoc.documentElement.classList.remove("dark");
  iframeDoc.documentElement.classList.add("light");
  iframeDoc.documentElement.style.colorScheme = "light";

  const waitForImages = (doc: Document, timeoutMs = 2200) =>
    new Promise<void>((resolve) => {
      const images = Array.from(doc.images || []).filter((img) => !img.complete);
      if (images.length === 0) {
        resolve();
        return;
      }
      let done = 0;
      const finish = () => {
        done += 1;
        if (done >= images.length) resolve();
      };
      images.forEach((img) => {
        img.addEventListener("load", finish, { once: true });
        img.addEventListener("error", finish, { once: true });
      });
      window.setTimeout(resolve, timeoutMs);
    });

  waitForImages(iframeDoc).finally(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => {
      iframe.remove();
    }, 2000);
  });
};
