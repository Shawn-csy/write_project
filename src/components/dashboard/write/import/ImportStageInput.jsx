import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/tabs";
import { Textarea } from "../../../ui/textarea";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Upload } from "lucide-react";

export function ImportStageInput({ text, setText, onFileUpload, isUploading }) {
    return (
        <Tabs defaultValue="text" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">直接貼上文字</TabsTrigger>
                <TabsTrigger value="file">上傳檔案 (PDF/Text)</TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="flex-1 mt-4 min-h-0">
                <Textarea 
                    placeholder="請在此貼上劇本內容..." 
                    className="h-full resize-none font-mono text-sm leading-relaxed"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
            </TabsContent>
            <TabsContent value="file" className="flex-1 mt-4">
                <div className="border-2 border-dashed rounded-lg h-full flex flex-col items-center justify-center p-8 text-center space-y-4 text-muted-foreground hover:bg-muted/10 transition-colors">
                    <div className="p-4 rounded-full bg-muted/20">
                        <Upload className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground mb-1">拖放或點擊上傳</h3>
                        <p className="text-xs">支援 .txt, .md, .pdf 格式</p>
                    </div>
                    <Input 
                        type="file" 
                        accept=".txt,.md,.pdf"
                        className="hidden" 
                        id="file-upload"
                        onChange={onFileUpload}
                        disabled={isUploading}
                    />
                    <Label 
                        htmlFor="file-upload" 
                        className="cursor-pointer px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors"
                    >
                        {isUploading ? "處理中..." : "選擇檔案"}
                    </Label>
                </div>
            </TabsContent>
        </Tabs>
    );
}
