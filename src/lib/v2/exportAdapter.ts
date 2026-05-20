import type { OrchestratedDocument, TrackConfig } from './types';

export interface V2TableCellRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

export interface V2TableCellStyle {
  backgroundColor?: string;
}

export interface V2TableExport {
  columns: string[];
  rows: string[][];
  cellStyles?: Array<Array<V2TableCellStyle | null>>;
  cellRuns?: Array<Array<V2TableCellRun[]>>;
}

/**
 * Converts OrchestratedDocument to a multi-column table.
 * Columns: 行號 + each enabled track name (by order).
 * Rows: one per unique line number; each track column filled with
 * all events on that line for that track (joined by " / " if multiple).
 */
const normalizeColor = (value: string): string | undefined => {
  const raw = String(value || '').trim();
  if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return undefined;
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase();
  const rgb = raw.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgb) return undefined;
  const parts = rgb[1].split(',').map((part) => part.trim());
  if (parts.length < 3) return undefined;
  if (parts.length >= 4 && Number(parts[3]) === 0) return undefined;
  const nums = parts.slice(0, 3).map((part) => Math.max(0, Math.min(255, Number.parseInt(part, 10) || 0)));
  return `#${nums.map((num) => num.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
};

const runStyleFromElement = (element: Element): Omit<V2TableCellRun, 'text'> => {
  const computed = window.getComputedStyle(element);
  const fontWeight = String(computed.fontWeight || '').toLowerCase();
  const fontStyle = String(computed.fontStyle || '').toLowerCase();
  const textDecoration = String(computed.textDecorationLine || computed.textDecoration || '').toLowerCase();
  return {
    bold: fontWeight === 'bold' || Number(fontWeight) >= 600,
    italic: fontStyle === 'italic',
    underline: textDecoration.includes('underline'),
    color: normalizeColor(computed.color),
  };
};

const mergeAdjacentRuns = (runs: V2TableCellRun[]): V2TableCellRun[] => {
  const merged: V2TableCellRun[] = [];
  runs.forEach((run) => {
    if (!run.text) return;
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.bold === run.bold &&
      prev.italic === run.italic &&
      prev.underline === run.underline &&
      (prev.color || '') === (run.color || '')
    ) {
      prev.text += run.text;
      return;
    }
    merged.push({ ...run });
  });
  return merged;
};

const collectRuns = (root: Element): V2TableCellRun[] => {
  const runs: V2TableCellRun[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (!text) return;
      if (/^\s+$/.test(text)) return;
      const parent = node.parentElement || root;
      runs.push({ text, ...runStyleFromElement(parent) });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    if (element.tagName.toLowerCase() === 'br') {
      runs.push({ text: '\n', ...runStyleFromElement(element) });
      return;
    }
    Array.from(element.childNodes).forEach(walk);
  };
  Array.from(root.childNodes).forEach(walk);
  return mergeAdjacentRuns(runs);
};

const cellStyleFromElement = (element: Element): V2TableCellStyle | null => {
  const styledElement = element.querySelector('article, [style]') || element;
  const computed = window.getComputedStyle(styledElement);
  const backgroundColor = normalizeColor(computed.backgroundColor);
  return backgroundColor ? { backgroundColor } : null;
};

const escapeAttributeValue = (value: string): string => {
  const cssApi = (globalThis as { CSS?: { escape?: (value: string) => string } }).CSS;
  if (typeof cssApi?.escape === 'function') return cssApi.escape(value);
  return value.replace(/["\\]/g, '\\$&');
};

export const buildV2TableExportFromRenderedHtml = (renderedHtml = ''): V2TableExport | null => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const html = String(renderedHtml || '').trim();
  if (!html) return null;

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.style.width = '1000px';
  host.style.pointerEvents = 'none';
  host.style.opacity = '0';
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    const root = host.querySelector('[data-v2-presentation="columns"]');
    if (!root) return null;
    const headerRow = root.querySelector('.sticky');
    const headerCells = Array.from(headerRow?.querySelectorAll('[data-track-id]') || []);
    const trackIds = headerCells.map((cell) => String(cell.getAttribute('data-track-id') || '').trim()).filter(Boolean);
    if (trackIds.length === 0) return null;

    const trackNames = headerCells.map((cell, index) => String(cell.textContent || trackIds[index] || '').trim());
    const columns = ['行號', ...trackNames];
    const rows: string[][] = [];
    const cellRuns: V2TableCellRun[][][] = [];
    const cellStyles: Array<Array<V2TableCellStyle | null>> = [];

    const lineRows = Array.from(root.querySelectorAll('[data-v2-line-row]'));
    lineRows.forEach((lineRow) => {
      const line = String(lineRow.getAttribute('data-v2-line-row') || '').trim();
      const row = [line];
      const runRow: V2TableCellRun[][] = [[{ text: line }]];
      const styleRow: Array<V2TableCellStyle | null> = [null];

      trackIds.forEach((trackId) => {
        const cell = lineRow.querySelector(`[data-track-id="${escapeAttributeValue(trackId)}"]`);
        if (!cell) {
          row.push('');
          runRow.push([]);
          styleRow.push(null);
          return;
        }
        const runs = collectRuns(cell);
        const text = runs.map((run) => run.text).join('').replace(/\s+\n/g, '\n').trim();
        row.push(text);
        runRow.push(text ? runs : []);
        styleRow.push(cellStyleFromElement(cell));
      });

      if (row.slice(1).some((value) => value.trim())) {
        rows.push(row);
        cellRuns.push(runRow);
        cellStyles.push(styleRow);
      }
    });

    return rows.length > 0 ? { columns, rows, cellRuns, cellStyles } : null;
  } finally {
    document.body.removeChild(host);
  }
};

export const buildV2TableExport = (doc: OrchestratedDocument): V2TableExport => {
  const tracks: TrackConfig[] = [...doc.layoutConfig.tracks]
    .filter((t) => t.enabled)
    .sort((a, b) => a.order - b.order);
  const hasUnassignedEvents = (doc.unassignedEvents || []).length > 0;
  const unassignedTrackId = "__unassigned__";
  const unassignedTrackName = "未分配";

  // Collect all line numbers across all lanes
  const lineSet = new Set<number>();
  doc.lanes.forEach((lane) => {
    lane.events.forEach((event) => {
      lineSet.add(Number.isFinite(event.lineSpan?.start) ? event.lineSpan.start : 0);
    });
  });
  (doc.unassignedEvents || []).forEach((event) => {
    lineSet.add(Number.isFinite(event.lineSpan?.start) ? event.lineSpan.start : 0);
  });
  const lines = Array.from(lineSet).sort((a, b) => a - b);

  // Build lookup: trackId -> lineNum -> event texts[]
  const cellMap = new Map<string, Map<number, string[]>>();
  tracks.forEach((t) => cellMap.set(t.id, new Map()));
  if (hasUnassignedEvents) {
    cellMap.set(unassignedTrackId, new Map());
  }

  doc.lanes.forEach((lane) => {
    const trackCells = cellMap.get(lane.trackId);
    if (!trackCells) return;
    lane.events.forEach((event) => {
      const ln = Number.isFinite(event.lineSpan?.start) ? event.lineSpan.start : 0;
      const existing = trackCells.get(ln) ?? [];
      existing.push(event.text);
      trackCells.set(ln, existing);
    });
  });
  if (hasUnassignedEvents) {
    const unassignedCells = cellMap.get(unassignedTrackId);
    if (unassignedCells) {
      (doc.unassignedEvents || []).forEach((event) => {
        const ln = Number.isFinite(event.lineSpan?.start) ? event.lineSpan.start : 0;
        const existing = unassignedCells.get(ln) ?? [];
        existing.push(event.text);
        unassignedCells.set(ln, existing);
      });
    }
  }

  const tableTracks = hasUnassignedEvents
    ? [...tracks, { id: unassignedTrackId, name: unassignedTrackName } as TrackConfig]
    : tracks;
  const columns = ['行號', ...tableTracks.map((t) => t.name)];
  const rows = lines.map((ln) => {
    const row: string[] = [String(ln)];
    tableTracks.forEach((t) => {
      const texts = cellMap.get(t.id)?.get(ln) ?? [];
      row.push(texts.join(' / '));
    });
    return row;
  });

  return { columns, rows };
};
