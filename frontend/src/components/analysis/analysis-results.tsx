'use client';

/**
 * Analysis Results Component
 * Container for displaying all analysis results
 */

import { Card, CardContent } from '@/components/ui/card';
import { useQueryStore } from '@/stores/query-store';
import { RecommendationCard } from './recommendation-card';
import { AlternativesList } from './alternatives-list';
import { RiskAssessmentDisplay } from './risk-assessment';
import { ConfidenceMeter } from './confidence-meter';
import { FeedbackPanel } from '@/components/feedback';
import { Badge } from '@/components/ui/badge';

export function AnalysisResults() {
  const { currentResult, isAnalyzing, error } = useQueryStore();
  
  // Loading state
  if (isAnalyzing) {
    return (
      <div className="space-y-4">
        <Card className="border-none bg-card/80 shadow-sm">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">Analyzing Strategy…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Processing your query through the CEO Agent lifecycle
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                {['PERCEIVE', 'THINK', 'PLAN', 'PROPOSE', 'REFLECT'].map((stage, i) => (
                  <span 
                    key={stage}
                    className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  >
                    {stage}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Card className="border-none bg-destructive/10">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <span className="text-4xl">❌</span>
            <p className="text-lg font-medium text-destructive">Analysis Failed</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {error}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // No results yet
  if (!currentResult) {
    return (
      <Card className="border-none bg-card/80 shadow-sm">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
              <span className="text-3xl">🎯</span>
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">Ready for Analysis</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Enter a strategic question above to receive AI-powered decision support 
                with recommendations, risk assessment, and confidence scoring.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const { id, proposal } = currentResult;
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* LLM Model & Context Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-sm">
             🤖
          </div>
          <div>
            <p className="text-sm font-bold text-foreground tracking-tight">
              {proposal.llmModel || 'CEO Engine'} 
              <span className="text-muted-foreground font-normal ml-2">Analysis Complete</span>
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest tabular-nums">
              Ref: {id.substring(0, 8)} • {new Date(proposal.generatedAt ?? Date.now()).toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <Badge variant="secondary" className="bg-primary/5 text-primary border-none shadow-sm px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
             Proposal Active
           </Badge>
        </div>
      </div>
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Area - Strategic Proposal (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Recommendation */}
          {proposal.recommendation && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500 delay-150 fill-mode-both">
              <RecommendationCard recommendation={proposal.recommendation} />
            </div>
          )}
          
          {/* Alternatives - Visualized as a secondary deck */}
          <div className="animate-in fade-in slide-in-from-left-4 duration-500 delay-300 fill-mode-both">
            <AlternativesList alternatives={proposal.alternatives} />
          </div>
        </div>
        
        {/* Right Area - Intelligence Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Confidence & Risk - Grouped for high-level insight */}
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500 delay-450 fill-mode-both">
            <div className="p-1 rounded-3xl bg-card/30 shadow-inner overflow-hidden flex flex-col gap-4">
              <ConfidenceMeter
                confidence={proposal.confidence}
                confidenceLevel={proposal.confidenceLevel}
                requiresApproval={proposal.requiresHumanApproval}
                approvalReason={proposal.approvalReason}
                missingData={proposal.missingData}
              />
              <RiskAssessmentDisplay risks={proposal.risks} />
            </div>

            {/* Feedback & Interaction */}
            <div className="p-1 rounded-2xl bg-muted/20 shadow-inner">
               <FeedbackPanel contextId={id} compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
