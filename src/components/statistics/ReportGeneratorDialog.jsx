
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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Copy, Printer } from "lucide-react";

export function ReportGeneratorDialog({ open, onOpenChange, markerEntries }) {
  // markerEntries: Array of { id, label, count, items: [{ text, line, type }] }
  
  // State for selected marker IDs
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Initialize selection when opening (optional: select all by default, or none)
  // For now, let's select all if empty, or persist? 
  // Better: select all by default on first load.
  React.useEffect(() => {
      if (open && selectedIds.size === 0 && markerEntries.length > 0) {
          setSelectedIds(new Set(markerEntries.map(e => e.id)));
      }
  }, [open, markerEntries]);

  const toggleSelection = (id) => {
    setSelectedIds(prev => {
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
          setSelectedIds(new Set(markerEntries.map(e => e.id)));
      }
  };

  // Generate Report Data
  const reportData = useMemo(() => {
      const data = [];
      markerEntries.forEach(entry => {
          if (selectedIds.has(entry.id)) {
              entry.items.forEach(item => {
                  data.push({
                      category: entry.label,
                      content: typeof item === 'string' ? item : item.text,
                      line: typeof item === 'object' ? item.line : '-',
                      type: typeof item === 'object' ? item.type : 'block'
                  });
              });
          }
      });
      // Sort by line number if possible
      return data.sort((a, b) => {
          if (a.line && b.line) return a.line - b.line;
          return 0;
      });
  }, [selectedIds, markerEntries]);

  // Copy to Clipboard
  const handleCopy = () => {
      const headers = ["類別", "內容", "行號"];
      const rows = reportData.map(row => `${row.category}\t${row.content}\t${row.line}`);
      const text = [headers.join('\t'), ...rows].join('\n');
      navigator.clipboard.writeText(text);
      // Could show toast here
  };

  // Download CSV
  const handleDownloadCSV = () => {
      const headers = ["類別,內容,行號"];
      const rows = reportData.map(row => {
          // Escape quotes in content
          const safeContent = `"${row.content.replace(/"/g, '""')}"`;
          return `${row.category},${safeContent},${row.line}`;
      });
      const csvContent = "\uFEFF" + [headers, ...rows].join('\n'); // UTF-8 BOM
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "script_report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>報表產生器</DialogTitle>
          <DialogDescription>
            勾選您想要輸出的標記類別，產生專屬報表（如音效表、道具表）。
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 flex-1 min-h-0 mt-4">
            {/* Sidebar: Selection */}
            <div className="w-1/3 border-r pr-4 flex flex-col gap-2">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">選擇類別</h4>
                    <Button variant="ghost" size="xs" onClick={toggleAll} className="h-6 text-xs">
                        {selectedIds.size === markerEntries.length ? "全不選" : "全選"}
                    </Button>
                </div>
                <ScrollArea className="flex-1">
                    <div className="space-y-2">
                        {markerEntries.map(entry => (
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
                    <h4 className="text-sm font-semibold">預覽 ({reportData.length} 筆)</h4>
                </div>
                <div className="border rounded-md flex-1 overflow-hidden relative">
                    <ScrollArea className="h-full w-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[120px]">類別</TableHead>
                                    <TableHead>內容</TableHead>
                                    <TableHead className="w-[80px] text-right">行號</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                            請選擇左側類別以檢視資料
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reportData.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium text-xs">{row.category}</TableCell>
                                            <TableCell className="whitespace-pre-wrap text-sm">{row.content}</TableCell>
                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">{row.line}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </div>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button variant="outline" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" />
                複製表格
            </Button>
            <Button onClick={handleDownloadCSV}>
                <Download className="w-4 h-4 mr-2" />
                下載 CSV
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
