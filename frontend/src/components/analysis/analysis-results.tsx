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

export function AnalysisResults() {
  const { currentResult, isAnalyzing, error } = useQueryStore();
  
  // Loading state
  if (isAnalyzing) {
    return (
      <div className="space-y-4">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">Analyzing Strategy...</p>
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
      <Card className="border-destructive/50 bg-destructive/10">
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
      <Card className="border-border/50 bg-card/80 border-dashed">
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
    <div className="space-y-4">
      {/* LLM Model Badge */}
      {proposal.llmModel && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
            🤖 {proposal.llmModel}
          </span>
          <span>•</span>
          <span>Generated at {new Date(proposal.generatedAt ?? Date.now()).toLocaleTimeString()}</span>
        </div>
      )}
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Top Recommendation */}
          {proposal.recommendation && (
            <RecommendationCard recommendation={proposal.recommendation} />
          )}
          
          {/* Alternatives */}
          <AlternativesList alternatives={proposal.alternatives} />
        </div>
        
        {/* Right Column - Sidebar content */}
        <div className="space-y-4">
          {/* Confidence Meter */}
          <ConfidenceMeter
            confidence={proposal.confidence}
            confidenceLevel={proposal.confidenceLevel}
            requiresApproval={proposal.requiresHumanApproval}
            approvalReason={proposal.approvalReason}
            missingData={proposal.missingData}
          />
          
          {/* Risk Assessment */}
          <RiskAssessmentDisplay risks={proposal.risks} />
          
          {/* Feedback Panel */}
          <FeedbackPanel contextId={id} compact />
        </div>
      </div>
    </div>
  );
}
