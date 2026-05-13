import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Copy, FileText, Sheet } from "lucide-react";
import { downloadBlob, buildFilename } from "@/lib/download";
import { exportReportAsXlsx, exportReportAsDocx } from "@/lib/api/export";
import { useI18n } from "@/contexts/I18nContext";

interface ReportItem {
  text?: string;
  line?: number | null;
  type?: string;
}

interface MarkerEntry {
  id: string;
  label: string;
  count: number;
  items: Array<string | ReportItem>;
}

interface ReportRow {
  category: string;
  content: string;
  line: number | string;
  type: string;
}

interface ReportGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markerEntries: MarkerEntry[];
}

export function ReportGeneratorDialog({ open, onOpenChange, markerEntries }: ReportGeneratorDialogProps) {
  const { t } = useI18n();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize selection when opening (optional: select all by default, or none)
  // For now, let's select all if empty, or persist? 
  // Better: select all by default on first load.
  React.useEffect(() => {
      if (open && selectedIds.size === 0 && markerEntries.length > 0) {
          setSelectedIds(new Set(markerEntries.map((entry) => entry.id)));
      }
  }, [open, markerEntries]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
      if (selectedIds.size === markerEntries.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(markerEntries.map((entry) => entry.id)));
      }
  };

  const reportData = useMemo<ReportRow[]>(() => {
      const data: ReportRow[] = [];
      markerEntries.forEach((entry) => {
          if (selectedIds.has(entry.id)) {
              entry.items.forEach((item) => {
                  const isObjectItem = typeof item === "object" && item !== null;
                  const content = typeof item === "string" ? item : String(item.text || "");
                  data.push({
                      category: entry.label,
                      content,
                      line: isObjectItem && typeof item.line === "number" ? item.line : "-",
                      type: isObjectItem && typeof item.type === "string" ? item.type : "block",
                  });
              });
          }
      });
      return data.sort((a, b) => {
          if (typeof a.line === "number" && typeof b.line === "number") return a.line - b.line;
          return 0;
      });
  }, [selectedIds, markerEntries]);

  // Copy to Clipboard
  const handleCopy = () => {
      const headers = [t("reportGenerator.columnCategory"), t("reportGenerator.columnContent"), t("reportGenerator.columnLine")];
      const rows = reportData.map((row) => `${row.category}\t${row.content}\t${row.line}`);
      const text = [headers.join('\t'), ...rows].join('\n');
      void navigator.clipboard.writeText(text);
  };

  // Download CSV
  const handleDownloadCSV = () => {
      const headers = [[t("reportGenerator.columnCategory"), t("reportGenerator.columnContent"), t("reportGenerator.columnLine")].join(",")];
      const rows = reportData.map((row) => {
          const safeContent = `"${row.content.replace(/"/g, '""')}"`;
          return `${row.category},${safeContent},${row.line}`;
      });
      const csvContent = "\uFEFF" + [headers, ...rows].join('\n'); // UTF-8 BOM
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, buildFilename("script_report", "csv"));
  };

  const handleDownloadXLSX = async () => {
      const columns = [
          t("reportGenerator.columnCategory"),
          t("reportGenerator.columnContent"),
          t("reportGenerator.columnLine"),
      ];
      await exportReportAsXlsx("script_report", { columns, rows: reportData });
  };

  const handleDownloadDOCX = async () => {
      const columns = [
          t("reportGenerator.columnCategory"),
          t("reportGenerator.columnContent"),
          t("reportGenerator.columnLine"),
      ];
      await exportReportAsDocx("script_report", {
          docTitle: t("reportGenerator.docTitle"),
          columns,
          rows: reportData,
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>{t("reportGenerator.title")}</DialogTitle>
          <DialogDescription>
            {t("reportGenerator.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 flex-1 min-h-0 mt-4">
            {/* Sidebar: Selection */}
            <div className="w-1/3 border-r pr-4 flex flex-col gap-2">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">{t("reportGenerator.selectCategories")}</h4>
                    <Button variant="ghost" size="sm" onClick={toggleAll} className="h-6 text-xs">
                        {selectedIds.size === markerEntries.length ? t("reportGenerator.deselectAll") : t("reportGenerator.selectAll")}
                    </Button>
                </div>
                <ScrollArea className="flex-1">
                    <div className="space-y-2">
                        {markerEntries.map((entry) => (
                            <div key={entry.id} className="flex items-center space-x-2 p-1 hover:bg-muted/50 rounded">
                                <Checkbox 
                                    id={`chk-${entry.id}`} 
                                    checked={selectedIds.has(entry.id)}
                                    onCheckedChange={() => toggleSelection(entry.id)}
                                />
                                <label 
                                    htmlFor={`chk-${entry.id}`} 
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer flex justify-between"
                                >
                                    <span>{entry.label}</span>
                                    <span className="text-xs text-muted-foreground">({entry.count})</span>
                                </label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Main: Preview */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">{t("reportGenerator.previewCount").replace("{count}", String(reportData.length))}</h4>
                </div>
                <div className="border rounded-md flex-1 overflow-hidden relative">
                    <ScrollArea className="h-full w-full">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="w-[120px] px-3 py-2 text-left font-medium">{t("reportGenerator.columnCategory")}</th>
                                    <th className="px-3 py-2 text-left font-medium">{t("reportGenerator.columnContent")}</th>
                                    <th className="w-[80px] px-3 py-2 text-right font-medium">{t("reportGenerator.columnLine")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="h-24 px-3 py-2 text-center text-muted-foreground">
                                            {t("reportGenerator.emptyPreview")}
                                        </td>
                                    </tr>
                                ) : (
                                    reportData.map((row, index) => (
                                        <tr key={`${row.category}-${index}`} className="border-b last:border-b-0">
                                            <td className="px-3 py-2 text-xs font-medium">{row.category}</td>
                                            <td className="whitespace-pre-wrap px-3 py-2">{row.content}</td>
                                            <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">{row.line}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </ScrollArea>
                </div>
            </div>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button variant="outline" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" />
                {t("reportGenerator.copyTable")}
            </Button>
            <Button onClick={handleDownloadCSV} disabled={reportData.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                {t("reportGenerator.downloadCsv")}
            </Button>
            <Button variant="outline" onClick={handleDownloadXLSX} disabled={reportData.length === 0}>
                <Sheet className="w-4 h-4 mr-2" />
                {t("reportGenerator.downloadXlsx")}
            </Button>
            <Button variant="outline" onClick={handleDownloadDOCX} disabled={reportData.length === 0}>
                <FileText className="w-4 h-4 mr-2" />
                {t("reportGenerator.downloadWord")}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
