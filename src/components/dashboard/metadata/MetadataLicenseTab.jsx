import React, { useEffect } from "react";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { cn } from "../../../lib/utils";
import { Check, Edit2, Link as LinkIcon, X } from "lucide-react";
import { Switch } from "../../ui/switch";
import { LICENSES } from "../../../constants/licenses";

export function MetadataLicenseTab({ 
    license, setLicense, 
    licenseUrl, setLicenseUrl,
    licenseTerms = [], setLicenseTerms,
    copyright, setCopyright 
}) {
    // Standard Creative Commons Licenses with metadata
    const licenses = LICENSES;

    const [isCustom, setIsCustom] = React.useState(false);
    const [newTerm, setNewTerm] = React.useState("");

    // Detect if we are in a custom state or a standard license state
    const selectedLicense = licenses.find(l => l.short === license) || (isCustom ? null : null);

    // Initial check and sync when license props change
    useEffect(() => {
        // Only auto-detect custom state if we have a license value
        if (!license) {
            setIsCustom(false);
            return;
        }

        const match = licenses.find(l => l.short === license);
        if (!match) {
            setIsCustom(true);
        } else {
            setIsCustom(false);
        }
    }, [license]);

    const handleSelect = (lic) => {
        setLicense(lic.short);
        setLicenseUrl(lic.url);
        setIsCustom(false);
    };

    const handleClearLicense = () => {
        setLicense("");
        setLicenseUrl("");
        setIsCustom(false);
    }

    const handleAddTerm = () => {
        if (!newTerm.trim()) return;
        setLicenseTerms([...licenseTerms, newTerm.trim()]);
        setNewTerm("");
    };

    const handleRemoveTerm = (index) => {
        const next = [...licenseTerms];
        next.splice(index, 1);
        setLicenseTerms(next);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTerm();
        }
    }

    return (
        <div className="space-y-8 h-full overflow-y-auto px-1 pb-10">
            
            {/* 1. License Selection */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                     <Label className="text-base font-semibold block">基礎授權 (Base License)</Label>
                     {license && (
                         <Button variant="ghost" size="sm" onClick={handleClearLicense} className="h-6 text-xs text-muted-foreground hover:text-destructive">
                             清除選擇 (Clear)
                         </Button>
                     )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {licenses.map((lic) => {
                        const isSelected = license === lic.short;
                        return (
                            <Badge
                                key={lic.id}
                                variant={isSelected ? "default" : "outline"}
                                className={cn(
                                    "cursor-pointer px-3 py-1.5 transition-all text-sm",
                                    isSelected 
                                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                                        : "hover:bg-muted opacity-80 hover:opacity-100"
                                )}
                                onClick={() => handleSelect(lic)}
                            >
                                {lic.short}
                            </Badge>
                        );
                    })}
                    <Badge
                        variant={isCustom ? "default" : "outline"}
                        className={cn(
                            "cursor-pointer px-3 py-1.5 transition-all text-sm border-dashed",
                            isCustom 
                                ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                                : "hover:bg-muted opacity-80 hover:opacity-100"
                        )}
                        onClick={() => {
                            setIsCustom(true);
                        }}
                    >
                        <Edit2 className="w-3 h-3 mr-1" />
                        自訂 (Custom)
                    </Badge>
                </div>
            </div>

            {/* 2. License Details (Conditional) */}
            <div className="rounded-xl border bg-muted/30 p-4 min-h-[100px]">
                {isCustom ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 mb-2">
                             <Edit2 className="w-4 h-4 text-primary" />
                             <h4 className="font-semibold text-sm">自訂授權內容</h4>
                        </div>
                        <div className="grid gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">授權名稱 (License Name)</Label>
                                <Input 
                                    placeholder="e.g. MIT License / My Custom Terms" 
                                    value={license}
                                    onChange={(e) => setLicense(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">授權連結 (License URL)</Label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                        className="pl-9"
                                        placeholder="https://..." 
                                        value={licenseUrl}
                                        onChange={(e) => setLicenseUrl(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    selectedLicense ? (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                             <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-full", selectedLicense.color, "text-white")}>
                                    <selectedLicense.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-base">{selectedLicense.name}</h4>
                                    <span className="text-xs font-mono text-muted-foreground">{selectedLicense.short}</span>
                                </div>
                             </div>
                             <p className="text-sm text-foreground/80 leading-relaxed px-1">
                                {selectedLicense.description}
                             </p>
                             {selectedLicense.url && (
                                 <div className="text-xs text-muted-foreground flex items-center gap-1 px-1">
                                     <LinkIcon className="w-3 h-3" />
                                     <a href={selectedLicense.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                                         閱讀授權條款 (License Deed)
                                     </a>
                                 </div>
                             )}
                        </div>
                    ) : (
                         <div className="flex items-center justify-center h-full text-muted-foreground/60 text-sm">
                             (未選擇特定授權，您可以自由填寫下方的版權宣告或新增額外條款)
                         </div>
                    )
                )}
            </div>

            {/* 3. Additional Terms */}
            <div className="space-y-3 pt-2">
                <Label className="text-base font-semibold block">補充/額外條款 (Additional Terms)</Label>
                <div className="flex gap-2">
                    <Input 
                        placeholder="輸入條款後按 Enter 新增 (e.g. 禁止用於 AI 訓練)" 
                        value={newTerm}
                        onChange={(e) => setNewTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <Button variant="secondary" onClick={handleAddTerm}>新增</Button>
                </div>
                
                {/* Terms List */}
                <div className="space-y-2 mt-2">
                    {licenseTerms.map((term, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-md border bg-background group hover:border-primary/50 transition-colors">
                            <span className="text-sm pl-1">{term}</span>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100"
                                onClick={() => handleRemoveTerm(idx)}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                    {licenseTerms.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">尚未新增額外條款</p>
                    )}
                </div>
            </div>

            {/* 4. Copyright Input */}
            <div className="pt-4 border-t">
                <Label className="text-base font-semibold mb-2 block">版權宣告 (Copyright)</Label>
                <div className="grid gap-2">
                    <p className="text-sm text-muted-foreground">
                        (選填) 顯示版權歸屬，例如年份與擁有者。
                    </p>
                    <Input 
                        placeholder="e.g. © 2026 Your Name" 
                        value={copyright}
                        onChange={(e) => setCopyright(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
