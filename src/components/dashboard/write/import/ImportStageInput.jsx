import React, { useRef } from "react";
import { Upload, FileText } from "lucide-react";
import { Button } from "../../../ui/button";
import { Textarea } from "../../../ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/tabs";
import { Label } from "../../../ui/label";

export function ImportStageInput({ 
    text, 
    setText, 
    metadataText = "", 
    setMetadataText, 
    onFileUpload, 
    isUploading 
}) {
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            onFileUpload({ target: { files: files } });
        }
    };

    return (
        <Tabs defaultValue="content" className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
                <TabsList>
                    <TabsTrigger value="content">劇本內容</TabsTrigger>
                    <TabsTrigger value="metadata">開頭資訊 (Metadata)</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={onFileUpload}
                        className="hidden"
                        accept=".txt,.md,.fountain"
                    />
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                    >
                        <Upload className="w-4 h-4 mr-1" />
                        {isUploading ? "讀取中..." : "上傳檔案"}
                    </Button>
                </div>
            </div>

            <TabsContent value="content" className="flex-1 min-h-0 relative mt-0 group">
                <Textarea 
                    className="w-full h-full font-mono text-sm resize-none p-4"
                    placeholder="在此貼上劇本內容，或直接拖曳檔案至此..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />
                
                {/* Drag Overlay Hint */}
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity">
                    <FileText className="w-12 h-12 text-muted-foreground mb-2" />
                    <span className="text-muted-foreground font-medium">拖曳檔案至此</span>
                </div>
            </TabsContent>

            <TabsContent value="metadata" className="flex-1 min-h-0 mt-0">
                <div className="h-full flex flex-col gap-2">
                    <div className="text-xs text-muted-foreground px-1 bg-muted/20 p-2 rounded">
                        在此貼上劇本的標頭資訊 (例如 Title, Author, Tags 等)，或特殊的說明區塊 (人物設定等)。
                        這些內容將會被置於劇本的最前方。
                    </div>
                    <Textarea 
                        className="w-full h-full font-mono text-sm resize-none p-4"
                        placeholder={`Title: 劇本標題\nAuthor: 作者名稱\nTags: tag1, tag2\n\n(也可以貼上人物設定等說明文字)`}
                        value={metadataText}
                        onChange={(e) => setMetadataText(e.target.value)}
                    />
                </div>
            </TabsContent>
        </Tabs>
    );
}
