import React, { useRef } from "react";
import { Upload, FileText } from "lucide-react";
import { Button } from "../../../ui/button";
import { Textarea } from "../../../ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/tabs";
import { Label } from "../../../ui/label";
import { useI18n } from "../../../../contexts/I18nContext";

export function ImportStageInput({ 
    text, 
    setText, 
    metadataText = "", 
    setMetadataText, 
    onFileUpload, 
    isUploading,
    fileSizeLimitText = "",
    uploadError = "",
}) {
    const { t } = useI18n();
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
                    <TabsTrigger value="content">{t("importStageInput.tabContent")}</TabsTrigger>
                    <TabsTrigger value="metadata">{t("importStageInput.tabMetadata")}</TabsTrigger>
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
                        {isUploading ? t("importStageInput.reading") : t("importStageInput.uploadFile")}
                    </Button>
                </div>
            </div>
            {fileSizeLimitText && (
                <p className="mb-2 text-xs text-muted-foreground">{fileSizeLimitText}</p>
            )}
            {uploadError && (
                <p className="mb-2 text-xs text-destructive">{uploadError}</p>
            )}

            <TabsContent value="content" className="flex-1 min-h-0 relative mt-0 group">
                <Textarea 
                    className="w-full h-full font-mono text-sm resize-none p-4"
                    placeholder={t("importStageInput.contentPlaceholder")}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />
                
                {/* Drag Overlay Hint */}
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity">
                    <FileText className="w-12 h-12 text-muted-foreground mb-2" />
                    <span className="text-muted-foreground font-medium">{t("importStageInput.dragHere")}</span>
                </div>
            </TabsContent>

            <TabsContent value="metadata" className="flex-1 min-h-0 mt-0">
                <div className="h-full flex flex-col gap-2">
                    <div className="text-xs text-muted-foreground px-1 bg-muted/20 p-2 rounded">
                        {t("importStageInput.metadataHint")}
                    </div>
                    <Textarea 
                        className="w-full h-full font-mono text-sm resize-none p-4"
                        placeholder={t("importStageInput.metadataPlaceholder")}
                        value={metadataText}
                        onChange={(e) => setMetadataText(e.target.value)}
                    />
                </div>
            </TabsContent>
        </Tabs>
    );
}
