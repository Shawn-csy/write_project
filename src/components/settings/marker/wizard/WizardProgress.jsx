import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { useI18n } from '../../../../contexts/I18nContext';

/**
 * Wizard 進度指示器
 * 顯示當前步驟與整體進度
 */
export function WizardProgress({ currentStep, steps }) {
    const { t } = useI18n();
    const labelMap = {
        type: t("markerWizardProgress.type"),
        symbol: t("markerWizardProgress.symbol"),
        style: t("markerWizardProgress.style"),
    };

    return (
        <div className="flex items-center justify-center gap-2 py-4">
            {steps.map((step, index) => {
                const stepNum = index + 1;
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;
                
                return (
                    <React.Fragment key={step.id}>
                        {/* Step Circle */}
                        <div className="flex flex-col items-center gap-1">
                            <div 
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                                    isCompleted && "bg-primary text-primary-foreground",
                                    isActive && "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2",
                                    !isActive && !isCompleted && "bg-muted text-muted-foreground"
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    stepNum
                                )}
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}>
                                {labelMap[step.id] || step.label}
                            </span>
                        </div>
                        
                        {/* Connector Line */}
                        {index < steps.length - 1 && (
                            <div 
                                className={cn(
                                    "w-12 h-0.5 transition-colors",
                                    isCompleted ? "bg-primary" : "bg-muted"
                                )}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export const WIZARD_STEPS = [
    { id: 'type', label: 'type' },
    { id: 'symbol', label: 'symbol' },
    { id: 'style', label: 'style' }
];
