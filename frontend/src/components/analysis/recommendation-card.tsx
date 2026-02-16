'use client';

/**
 * Recommendation Card Component
 * Displays the top recommendation from the analysis
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Recommendation } from '@/types/api';
import { HighlightText } from '@/components/ui/highlight-text';
import { EditableSection } from './editable-section';
import { useQueryStore } from '@/stores/query-store';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const { currentResult, editResultArtifact, addResultComment } = useQueryStore();
  const artifacts = currentResult?.proposal?.artifacts;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };
  
  const scorePercent = Math.round(recommendation.score * 100);
  
  return (
    <Card className="border-none bg-gradient-to-br from-primary/5 to-transparent shadow-md overflow-hidden">
      <CardHeader className="pb-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 uppercase tracking-tighter opacity-70">
            Top Recommendation
          </CardTitle>
          <Badge variant="outline" className={cn('border-none shadow-sm capitalize', getRiskColor(recommendation.riskLevel))}>
            {recommendation.riskLevel} risk
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Main Content Areas */}
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">
              {recommendation.title}
            </h3>
            <EditableSection
              sectionId="description"
              artifact={artifacts?.description}
              content={recommendation.description}
              onEdit={(idx, content) => editResultArtifact('description', idx, content)}
              onComment={(idx, text) => addResultComment('description', idx, text)}
            />
          </div>
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted/20 overflow-hidden border-none shadow-inner p-1">
            <div className="bg-background/40 p-4 text-center rounded-xl">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-widest">Budget</p>
              <p className="text-base font-semibold text-foreground">
                ${recommendation.estimatedCost?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div className="bg-background/40 p-4 text-center rounded-xl">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-widest">Horizon</p>
              <p className="text-base font-semibold text-foreground">
                {recommendation.timeToImplement || 'N/A'}
              </p>
            </div>
            <div className="bg-primary/5 p-4 text-center rounded-xl">
              <p className="text-[10px] uppercase font-bold text-primary/70 mb-1 tracking-widest">Score</p>
              <p className="text-base font-bold text-primary">
                {scorePercent}%
              </p>
            </div>
          </div>
          
          {/* Rationale Section */}
          {recommendation.rationale && (
            <div className="pt-6 border-t border-border/10">
              <EditableSection
                title="Strategic Rationale"
                sectionId="rationale"
                artifact={artifacts?.rationale}
                content={recommendation.rationale}
                onEdit={(idx, content) => editResultArtifact('rationale', idx, content)}
                onComment={(idx, text) => addResultComment('rationale', idx, text)}
              />
            </div>
          )}
        </div>
        
        {/* Progress Footer */}
        <div className="bg-muted/10 px-6 py-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Proposal Confidence</span>
              <span className="font-bold text-primary">{scorePercent}%</span>
            </div>
            <div className="w-full bg-primary/10 h-1.5 rounded-full overflow-hidden">
                <div 
                    className="bg-primary h-full transition-all duration-500 ease-out" 
                    style={{ width: `${scorePercent}%` }}
                />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
