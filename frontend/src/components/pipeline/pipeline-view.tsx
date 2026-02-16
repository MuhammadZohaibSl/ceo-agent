'use client';

/**
 * Pipeline View
 * Main container that orchestrates the analysis pipeline flow:
 * Query Input → Pipeline Stepper → Active Step Card → Final Summary
 */

import { useCallback, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ChevronRight, Activity, Zap, CheckCircle2 } from 'lucide-react';
import { PipelineStepper } from './pipeline-stepper';
import { StepCard } from './step-card';
import { ExportButton } from './export-button';
import { usePipelineStore } from '@/stores/pipeline-store';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export function PipelineView() {
    const {
        pipeline,
        activeStepIndex,
        isExecutingStep,
        isApproving,
        error,
        setPipeline,
        setActiveStepIndex,
        setExecutingStep,
        setApproving,
        setError,
    } = usePipelineStore();

    const autoExecuteRef = useRef(false);

    // Auto-execute the first step when pipeline starts
    useEffect(() => {
        if (pipeline && pipeline.status === 'active' && !autoExecuteRef.current) {
            const firstStep = pipeline.steps[0];
            if (firstStep.status === 'pending') {
                autoExecuteRef.current = true;
                handleExecuteNext();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pipeline?.id]);

    const handleExecuteNext = useCallback(async () => {
        if (!pipeline) return;
        setExecutingStep(true);
        setError(null);
        try {
            const response = await api.executeNextStep(pipeline.id);
            if (response.success && response.data) {
                setPipeline(response.data);
                // Move to the step that just completed
                const completedIndex = response.data.steps.findIndex(
                    (s) => s.status === 'completed' || s.status === 'running'
                );
                if (completedIndex >= 0) {
                    setActiveStepIndex(completedIndex);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to execute step');
        } finally {
            setExecutingStep(false);
        }
    }, [pipeline, setExecutingStep, setError, setPipeline, setActiveStepIndex]);

    const handleApprove = useCallback(async (notes?: string) => {
        if (!pipeline) return;
        const step = pipeline.steps[activeStepIndex];
        if (!step) return;
        
        setApproving(true);
        setError(null);
        try {
            const response = await api.approveStep(pipeline.id, step.id, notes);
            if (response.success && response.data) {
                setPipeline(response.data);
                
                // Auto-execute next step if not all done
                if (response.data.status === 'active') {
                    const nextPendingIndex = response.data.steps.findIndex(s => s.status === 'pending');
                    if (nextPendingIndex >= 0) {
                        setActiveStepIndex(nextPendingIndex);
                        // Auto-execute next step after a short delay
                        setTimeout(async () => {
                            try {
                                setExecutingStep(true);
                                const nextResponse = await api.executeNextStep(pipeline.id);
                                if (nextResponse.success && nextResponse.data) {
                                    setPipeline(nextResponse.data);
                                    const newActiveIndex = nextResponse.data.steps.findIndex(
                                        s => s.status === 'completed' || s.status === 'running'
                                    );
                                    if (newActiveIndex >= 0) setActiveStepIndex(newActiveIndex);
                                }
                            } catch (err) {
                                setError(err instanceof Error ? err.message : 'Failed to execute next step');
                            } finally {
                                setExecutingStep(false);
                            }
                        }, 500);
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to approve step');
        } finally {
            setApproving(false);
        }
    }, [pipeline, activeStepIndex, setApproving, setError, setPipeline, setActiveStepIndex, setExecutingStep]);

    const handleReject = useCallback(async (feedback: string) => {
        if (!pipeline) return;
        const step = pipeline.steps[activeStepIndex];
        if (!step) return;
        
        setApproving(true);
        setError(null);
        try {
            const response = await api.rejectStep(pipeline.id, step.id, feedback);
            if (response.success && response.data) {
                setPipeline(response.data);
                // Auto re-run the rejected step
                setTimeout(async () => {
                    try {
                        setExecutingStep(true);
                        const retryResponse = await api.executeNextStep(pipeline.id);
                        if (retryResponse.success && retryResponse.data) {
                            setPipeline(retryResponse.data);
                        }
                    } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to re-execute step');
                    } finally {
                        setExecutingStep(false);
                    }
                }, 300);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reject step');
        } finally {
            setApproving(false);
        }
    }, [pipeline, activeStepIndex, setApproving, setError, setPipeline, setExecutingStep]);

    const handleEditLine = useCallback(async (lineIndex: number, content: string) => {
        if (!pipeline) return;
        const step = pipeline.steps[activeStepIndex];
        if (!step) return;
        
        try {
            const response = await api.editArtifact(pipeline.id, step.id, { lineIndex, content });
            if (response.success && response.data) {
                setPipeline(response.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to edit artifact');
        }
    }, [pipeline, activeStepIndex, setPipeline, setError]);

    const handleComment = useCallback(async (lineIndex: number, text: string) => {
        if (!pipeline) return;
        const step = pipeline.steps[activeStepIndex];
        if (!step) return;
        
        try {
            const response = await api.commentOnArtifact(pipeline.id, step.id, { lineIndex, text });
            if (response.success && response.data) {
                setPipeline(response.data.pipeline);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add comment');
        }
    }, [pipeline, activeStepIndex, setPipeline, setError]);

    if (!pipeline) return null;

    const activeStep = pipeline.steps[activeStepIndex];
    const allApproved = pipeline.steps.every(s => s.status === 'approved');
    const totalScore = pipeline.steps.reduce((sum, s) => sum + (s.result?.score ?? 0), 0);
    const avgScore = pipeline.steps.filter(s => s.result).length > 0
        ? Math.round(totalScore / pipeline.steps.filter(s => s.result).length * 10) / 10
        : 0;

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            {/* Pipeline header */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-1">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border-none">
                         🎯
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-foreground tracking-tight">
                            Strategic Deep Analysis
                        </h2>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5 max-w-[300px] md:max-w-none truncate">
                            &ldquo;{pipeline.query}&rdquo;
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/20 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-none">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                        Intelligence Context Active
                    </div>
                    <Badge
                        variant={allApproved ? 'default' : 'secondary'}
                        className={cn(
                            'text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border-none shadow-sm',
                            allApproved ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-primary/5 text-primary'
                        )}
                    >
                        {pipeline.steps.filter(s => s.status === 'approved').length}/{pipeline.steps.length} Verified
                    </Badge>
                </div>
            </div>

            {/* Stepper Area */}
            <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-200 fill-mode-both">
                <Card className="border-none bg-card/30 shadow-inner rounded-[2rem] overflow-hidden">
                    <CardContent className="py-6 px-4 md:px-8">
                        <PipelineStepper
                            steps={pipeline.steps}
                            activeStepIndex={activeStepIndex}
                            onStepClick={setActiveStepIndex}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Error display */}
            {error && (
                <div className="px-6 py-4 rounded-2xl bg-red-500/10 border-none shadow-sm flex items-center justify-between animate-in zoom-in-95 duration-300">
                    <p className="text-xs text-red-400 font-medium">
                        <span className="font-bold uppercase tracking-widest mr-2">Error:</span> {error}
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/10"
                        onClick={() => setError(null)}
                    >
                        Dismiss
                    </Button>
                </div>
            )}

            {/* Content & Summary Area */}
            <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400 fill-mode-both">
                {/* Active step card */}
                {activeStep && (
                    <StepCard
                        step={activeStep}
                        pipelineId={pipeline.id}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onEditLine={handleEditLine}
                        onComment={handleComment}
                        isApproving={isApproving || isExecutingStep}
                    />
                )}

                {/* Completion summary refined */}
                {allApproved && (
                    <Card className="border-none bg-green-500/5 shadow-sm rounded-[1.5rem] overflow-hidden group border border-emerald-500/10">
                        <CardContent className="py-12 px-10 flex flex-col md:flex-row items-center gap-10">
                            <div className="relative">
                                <div className="h-24 w-24 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner relative z-10 border border-emerald-500/20">
                                    <ShieldCheck className="w-12 h-12" />
                                </div>
                                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150 animate-pulse opacity-50" />
                            </div>
                            
                            <div className="flex-1 text-center md:text-left space-y-4">
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight flex items-center justify-center md:justify-start gap-3">
                                        Strategic Intelligence Certified
                                        
                                    </h3>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/60 flex items-center justify-center md:justify-start gap-2">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Protocol Fully Validated • {new Date().toLocaleDateString()}
                                    </p>
                                </div>
                                
                                <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                                    Our executive AI has successfully analyzed and validated all <span className="text-emerald-700 dark:text-emerald-300 font-black">6 critical strategic domains</span>. 
                                    The proposed roadmap maintains an average confidence rating of <span className="text-emerald-700 dark:text-emerald-400 font-black text-lg tabular-nums underline decoration-emerald-500/30 underline-offset-4">{avgScore}/10</span>, meeting the enterprise-grade threshold for execution.
                                </p>
                                
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-2">
                                    {pipeline.steps.map((step) => (
                                        <button
                                            key={step.id}
                                            onClick={() => setActiveStepIndex(pipeline.steps.indexOf(step))}
                                            className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/10 transition-all active:scale-95 group/step shadow-sm"
                                        >
                                            <span className="text-base grayscale group-hover/step:grayscale-0 transition-all filter drop-shadow-sm">{step.icon}</span>
                                            <div className="flex flex-col items-start leading-none">
                                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-300 uppercase tracking-tighter tabular-nums">{step.result?.score}/10</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="shrink-0">
                                <ExportButton pipeline={pipeline} />
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
