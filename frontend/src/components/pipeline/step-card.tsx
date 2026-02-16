import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { PipelineStep } from '@/types/api';
import { ArtifactEditor } from '@/components/artifacts/artifact-editor';
import { HighlightText } from '@/components/ui/highlight-text';
import { FloatingChatbot } from '@/components/artifacts/floating-chatbot';

interface StepCardProps {
    step: PipelineStep;
    pipelineId: string;
    onApprove: (notes?: string) => void;
    onReject: (feedback: string) => void;
    onEditLine: (lineIndex: number, content: string) => void;
    onComment: (lineIndex: number, text: string) => void;
    isApproving: boolean;
}

function ScoreBadge({ score }: { score: number }) {
    const color = score >= 7 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none shadow-sm' :
                  score >= 4 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none shadow-sm' :
                  'bg-red-500/10 text-red-600 dark:text-red-400 border-none shadow-sm';
    
    return (
        <div className={cn('flex flex-col items-center justify-center h-16 w-16 rounded-2xl p-2 border-none shadow-inner bg-muted/20', color)}>
            <span className="text-lg font-bold tabular-nums leading-none">{score}</span>
            <span className="text-[9px] uppercase font-bold tracking-widest opacity-60 mt-1">Score</span>
        </div>
    );
}

export function StepCard({ step, pipelineId, onApprove, onReject, onEditLine, onComment, isApproving }: StepCardProps) {
    const [rejectMode, setRejectMode] = useState(false);
    const [rejectFeedback, setRejectFeedback] = useState('');
    const [approveNotes, setApproveNotes] = useState('');
    const [selection, setSelection] = useState('');
    const [chatbotPosition, setChatbotPosition] = useState<{ x: number; y: number } | null>(null);

    const handleMouseUp = (e: React.MouseEvent) => {
        const text = window.getSelection()?.toString().trim();
        if (text && text.length > 0) {
            setSelection(text);
            setChatbotPosition({ x: e.clientX, y: e.clientY });
        } else {
            if (!(e.target as HTMLElement).closest('.artifact-chatbot')) {
                setSelection('');
                setChatbotPosition(null);
            }
        }
    };

    if (!step.result) {
        return (
            <Card className="border-none bg-card/40 shadow-inner rounded-3xl animate-pulse">
                <CardContent className="py-16 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                    <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center text-3xl">
                        {step.icon}
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold uppercase tracking-widest text-foreground/50">{step.name}</p>
                        {step.status === 'running' ? (
                            <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-2 animate-bounce">
                                Analyzing context…
                            </p>
                        ) : (
                            <p className="text-[10px] uppercase tracking-widest mt-2">Queueing operation</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const { result, artifact } = step;

    return (
        <Card 
            className="border-none bg-card/40 shadow-inner rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 relative"
            onMouseUp={handleMouseUp}
        >
            {/* Minimal Header */}
            <CardHeader className="pb-4 pt-6 px-6 bg-muted/10">
                <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl shadow-sm">
                            {step.icon}
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                                {step.name}
                                {step.status === 'approved' && (
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-none text-[9px] font-bold uppercase tracking-widest">
                                        Verified
                                    </Badge>
                                )}
                            </CardTitle>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">
                                {result.provider || 'Deep Engine'} • STAGE {step.id}
                            </p>
                        </div>
                    </div>
                    <ScoreBadge score={result.score} />
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Insights Column */}
                    <div className="space-y-6">
                        {result.keyFindings.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <span className="h-1 w-4 bg-primary/40 rounded-full" />
                                    Operational Insights
                                </h4>
                                <div className="space-y-2">
                                    {result.keyFindings.map((finding, i) => (
                                        <div key={i} className="p-3 rounded-xl bg-muted/20 border-none shadow-sm text-sm text-foreground/80 leading-relaxed transition-all hover:bg-muted/30">
                                            <HighlightText text={finding} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions/Risks Column */}
                    <div className="space-y-6">
                         {result.risks.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="h-1 w-4 bg-red-400/40 rounded-full" />
                                    Critical Risks
                                </h4>
                                <div className="space-y-2">
                                    {result.risks.map((risk, i) => (
                                        <div key={i} className="p-3 rounded-xl bg-red-500/5 border-none shadow-sm text-sm text-red-900/80 dark:text-red-200/80 leading-relaxed border-l-2 border-l-red-500/40">
                                            <HighlightText text={risk} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result.recommendations.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="h-1 w-4 bg-emerald-400/40 rounded-full" />
                                    Strategic Actions
                                </h4>
                                <div className="space-y-2">
                                    {result.recommendations.map((rec, i) => (
                                        <div key={i} className="p-3 rounded-xl bg-emerald-500/5 border-none shadow-sm text-sm text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed border-l-2 border-l-emerald-500/40">
                                            <HighlightText text={rec} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="bg-muted/20 px-6 py-6 border-t border-border/10 flex flex-wrap items-center justify-between gap-4">
                    {/* Floating Chatbot Integration */}
                    {selection && chatbotPosition && (
                        <FloatingChatbot
                            selection={selection}
                            position={chatbotPosition as { x: number; y: number }}
                            onClose={() => {
                                setSelection('');
                                setChatbotPosition(null);
                                window.getSelection()?.removeAllRanges();
                            }}
                            onAcceptEdit={(newText) => {
                                // Attempt to update findings, risks, or recommendations locally
                                if (!step.result) return;
                                
                                const updateArray = (arr: string[]) => {
                                    return arr.map(item => item.includes(selection) ? item.replace(selection, newText) : item);
                                };

                                step.result.keyFindings = updateArray(step.result.keyFindings);
                                step.result.risks = updateArray(step.result.risks);
                                step.result.recommendations = updateArray(step.result.recommendations);
                                
                                setSelection('');
                                setChatbotPosition(null);
                                window.getSelection()?.removeAllRanges();
                            }}
                        />
                    )}

                    {/* Human Review Panel */}
                    {step.status === 'completed' && (
                        <div className="flex-1 md:flex-none flex items-center gap-3 min-w-[300px]">
                            {!rejectMode ? (
                                <>
                                    <Textarea
                                        placeholder="Add operational notes…"
                                        value={approveNotes}
                                        onChange={(e) => setApproveNotes(e.target.value)}
                                        className="h-10 min-h-0 py-2.5 bg-background/50 border-none shadow-inner text-xs resize-none flex-1"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => onApprove(approveNotes || undefined)}
                                            disabled={isApproving}
                                            className="bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-widest h-10 px-6 shadow-md shadow-primary/20"
                                        >
                                            {isApproving ? 'Verifying…' : 'Approve'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setRejectMode(true)}
                                            className="text-red-400 hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest h-10 px-4"
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Textarea
                                        placeholder="Specify required changes…"
                                        value={rejectFeedback}
                                        onChange={(e) => setRejectFeedback(e.target.value)}
                                        className="h-10 min-h-0 py-2.5 bg-background/50 border-none shadow-inner text-xs resize-none flex-1"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                onReject(rejectFeedback);
                                                setRejectMode(false);
                                                setRejectFeedback('');
                                            }}
                                            disabled={!rejectFeedback.trim() || isApproving}
                                            className="font-bold text-[10px] uppercase tracking-widest h-10 px-6"
                                        >
                                            Submit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setRejectMode(false)}
                                            className="text-muted-foreground hover:bg-muted/10 text-[10px] font-bold uppercase tracking-widest h-10 px-4"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {step.status === 'approved' && (
                         <div className="flex items-center gap-2 py-2 px-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Step Validated & Finalized
                         </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
