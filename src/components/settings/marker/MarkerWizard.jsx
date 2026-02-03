import React, { useState, useCallback } from 'react';
import { cn } from '../../../lib/utils';
import { WizardProgress, WIZARD_STEPS } from './wizard/WizardProgress';
import { StepTypeSelector } from './wizard/StepTypeSelector';
import { StepSymbolConfig } from './wizard/StepSymbolConfig';
import { StepStylePicker } from './wizard/StepStylePicker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';

/**
 * 標記設定 Wizard
 * 引導用戶透過三步驟建立新的標記規則
 */
export function MarkerWizard({ open, onClose, onComplete, initialConfig = null }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [markerType, setMarkerType] = useState(null); // 'single' | 'range' | 'inline'
    const [config, setConfig] = useState(initialConfig || {
        id: '',
        label: '',
        matchMode: 'prefix',
        isBlock: true,
        type: 'block',
        start: '',
        end: '',
        style: {}
    });

    // 重置 Wizard
    const resetWizard = useCallback(() => {
        setCurrentStep(1);
        setMarkerType(null);
        setConfig({
            id: '',
            label: '',
            matchMode: 'prefix',
            isBlock: true,
            type: 'block',
            start: '',
            end: '',
            style: {}
        });
    }, []);

    // 關閉時重置
    const handleClose = () => {
        resetWizard();
        onClose();
    };

    // 處理預設模板選擇
    const handlePresetSelect = (preset) => {
        // 根據預設模板填充設定
        const newConfig = {
            ...preset.config,
            id: generateId(preset.config.label || preset.name)
        };
        setConfig(newConfig);
        
        // 判斷類型
        if (preset.config.matchMode === 'range') {
            setMarkerType('range');
        } else if (!preset.config.isBlock) {
            setMarkerType('inline');
        } else {
            setMarkerType('single');
        }
        
        // 跳到步驟 2 或 3
        setCurrentStep(2);
    };

    // 處理類型選擇
    const handleTypeChange = (type) => {
        setMarkerType(type);
        
        // 根據類型設定預設 matchMode
        const updatedConfig = { ...config };
        if (type === 'range') {
            updatedConfig.matchMode = 'range';
            updatedConfig.isBlock = true;
            updatedConfig.type = 'block';
        } else if (type === 'inline') {
            updatedConfig.matchMode = 'enclosure';
            updatedConfig.isBlock = false;
            updatedConfig.type = 'inline';
        } else {
            updatedConfig.matchMode = 'prefix';
            updatedConfig.isBlock = true;
            updatedConfig.type = 'block';
        }
        setConfig(updatedConfig);
    };

    // 生成 ID
    const generateId = (label) => {
        const base = label
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '');
        return `custom-${base}-${Date.now().toString(36)}`;
    };

    // 驗證當前步驟
    const validateCurrentStep = () => {
        switch (currentStep) {
            case 1:
                return markerType !== null;
            case 2:
                const hasLabel = config.label && config.label.trim() !== '';
                const hasStart = config.start && config.start.trim() !== '';
                const needsEnd = markerType === 'range' || markerType === 'inline';
                const hasEnd = !needsEnd || (config.end && config.end.trim() !== '');
                return hasLabel && hasStart && hasEnd;
            case 3:
                return true; // 樣式是可選的
            default:
                return true;
        }
    };

    // 下一步
    const handleNext = () => {
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    // 上一步
    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    // 完成
    const handleComplete = () => {
        const finalConfig = {
            ...config,
            id: config.id || generateId(config.label)
        };
        onComplete(finalConfig);
        handleClose();
    };

    const canProceed = validateCurrentStep();

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader className="pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        新增標記規則
                    </DialogTitle>
                </DialogHeader>

                {/* 進度指示器 */}
                <WizardProgress currentStep={currentStep} steps={WIZARD_STEPS} />

                {/* 步驟內容 */}
                <div className="flex-1 overflow-y-auto py-2 px-1">
                    {currentStep === 1 && (
                        <StepTypeSelector
                            value={markerType}
                            onChange={handleTypeChange}
                            onPresetSelect={handlePresetSelect}
                        />
                    )}
                    
                    {currentStep === 2 && (
                        <StepSymbolConfig
                            markerType={markerType}
                            config={config}
                            onChange={setConfig}
                        />
                    )}
                    
                    {currentStep === 3 && (
                        <StepStylePicker
                            config={config}
                            onChange={setConfig}
                        />
                    )}
                </div>

                {/* 底部按鈕 */}
                <DialogFooter className="flex items-center justify-between border-t pt-4">
                    <div>
                        {currentStep > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleBack}
                                className="gap-1"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                上一步
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                        >
                            取消
                        </Button>
                        {currentStep < 3 ? (
                            <Button
                                type="button"
                                onClick={handleNext}
                                disabled={!canProceed}
                                className="gap-1"
                            >
                                下一步
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleComplete}
                                disabled={!canProceed}
                                className="gap-1"
                            >
                                <Check className="w-4 h-4" />
                                完成
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
