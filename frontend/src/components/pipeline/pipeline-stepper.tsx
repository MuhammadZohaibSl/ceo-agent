'use client';

/**
 * Pipeline Stepper
 * Horizontal step progress indicator showing all 6 analysis phases
 */

import { cn } from '@/lib/utils';
import type { PipelineStep, PipelineStepStatus } from '@/types/api';

interface PipelineStepperProps {
    steps: PipelineStep[];
    activeStepIndex: number;
    onStepClick: (index: number) => void;
}

const statusColors: Record<PipelineStepStatus, string> = {
    pending: 'bg-muted border-border/50 text-muted-foreground',
    running: 'bg-blue-500/20 border-blue-500 text-blue-400 animate-pulse',
    completed: 'bg-amber-500/20 border-amber-500 text-amber-400',
    approved: 'bg-emerald-500/20 border-emerald-500 text-emerald-400',
    rejected: 'bg-red-500/20 border-red-500 text-red-400',
};

const connectorColors: Record<PipelineStepStatus, string> = {
    pending: 'bg-border/30',
    running: 'bg-blue-500/30',
    completed: 'bg-amber-500/50',
    approved: 'bg-emerald-500/50',
    rejected: 'bg-red-500/50',
};

const statusLabels: Record<PipelineStepStatus, string> = {
    pending: 'Pending',
    running: 'Analyzing...',
    completed: 'Review needed',
    approved: 'Approved',
    rejected: 'Rejected',
};

export function PipelineStepper({ steps, activeStepIndex, onStepClick }: PipelineStepperProps) {
    return (
        <div className="w-full">
            {/* Desktop: horizontal stepper */}
            <div className="hidden md:flex items-start justify-between gap-0">
                {steps.map((step, index) => {
                    const isActive = index === activeStepIndex;
                    const isClickable = step.status !== 'pending' || index === 0 ||
                        (index > 0 && steps[index - 1].status === 'approved');

                    return (
                        <div key={step.id} className="flex items-center flex-1 last:flex-none">
                            {/* Step circle + label */}
                            <button
                                onClick={() => isClickable && onStepClick(index)}
                                disabled={!isClickable}
                                aria-label={`Go to ${step.name} step (${statusLabels[step.status]})`}
                                className={cn(
                                    'flex flex-col items-center gap-1.5 group transition-[opacity,transform] duration-200',
                                    isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                                )}
                            >
                                <div
                                    className={cn(
                                        'w-10 h-10 rounded-full flex items-center justify-center text-lg transition-[background-color,border-color,box-shadow,transform] duration-300',
                                        statusColors[step.status],
                                        isActive && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background scale-110 shadow-lg'
                                    )}
                                >
                                    {step.icon}
                                </div>
                                <span className={cn(
                                    'text-[10px] font-medium whitespace-nowrap transition-colors duration-200',
                                    isActive ? 'text-foreground' : 'text-muted-foreground',
                                )}>
                                    {step.name}
                                </span>
                                <span className={cn(
                                    'text-[9px] whitespace-nowrap',
                                    step.status === 'running' ? 'text-blue-400' :
                                    step.status === 'completed' ? 'text-amber-400' :
                                    step.status === 'approved' ? 'text-emerald-400' :
                                    step.status === 'rejected' ? 'text-red-400' :
                                    'text-muted-foreground/60'
                                )}>
                                    {statusLabels[step.status]}
                                </span>
                            </button>

                            {/* Connector line */}
                            {index < steps.length - 1 && (
                                <div className="flex-1 h-0.5 mx-2 mt-5 rounded-full">
                                    <div
                                        className={cn(
                                            'h-full rounded-full transition-colors duration-500',
                                            step.status === 'approved'
                                                ? connectorColors.approved
                                                : connectorColors.pending
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Mobile: compact list */}
            <div className="md:hidden space-y-1.5">
                {steps.map((step, index) => {
                    const isActive = index === activeStepIndex;
                    const isClickable = step.status !== 'pending' || index === 0 ||
                        (index > 0 && steps[index - 1].status === 'approved');

                    return (
                        <button
                            key={step.id}
                            onClick={() => isClickable && onStepClick(index)}
                            disabled={!isClickable}
                            aria-label={`Go to ${step.name} step (${statusLabels[step.status]})`}
                            className={cn(
                                'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-[background-color,border-color,opacity]',
                                isActive
                                    ? 'bg-primary/10'
                                    : 'bg-muted/30',
                                !isClickable && 'opacity-40 cursor-not-allowed'
                            )}
                        >
                            <span className="text-lg">{step.icon}</span>
                            <span className={cn(
                                'text-xs font-medium flex-1 text-left',
                                isActive ? 'text-foreground' : 'text-muted-foreground'
                            )}>
                                {step.name}
                            </span>
                            <span className={cn(
                                'text-[10px] px-2 py-0.5 rounded-full',
                                step.status === 'running' && 'bg-blue-500/20 text-blue-400',
                                step.status === 'completed' && 'bg-amber-500/20 text-amber-400',
                                step.status === 'approved' && 'bg-emerald-500/20 text-emerald-400',
                                step.status === 'rejected' && 'bg-red-500/20 text-red-400',
                                step.status === 'pending' && 'bg-muted text-muted-foreground',
                            )}>
                                {statusLabels[step.status]}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
