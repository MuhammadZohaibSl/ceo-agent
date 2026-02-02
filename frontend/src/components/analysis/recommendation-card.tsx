'use client';

/**
 * Recommendation Card Component
 * Displays the top recommendation from the analysis
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Recommendation } from '@/types/api';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
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
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-xs">📌</span>
            Top Recommendation
          </CardTitle>
          <Badge variant="outline" className={getRiskColor(recommendation.riskLevel)}>
            {recommendation.riskLevel} risk
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {recommendation.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {recommendation.description}
          </p>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30 border border-border/30">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Estimated Cost</p>
            <p className="text-sm font-semibold text-foreground">
              ${recommendation.estimatedCost?.toLocaleString() || 'N/A'}
            </p>
          </div>
          <div className="text-center border-x border-border/30">
            <p className="text-xs text-muted-foreground mb-1">Timeline</p>
            <p className="text-sm font-semibold text-foreground">
              {recommendation.timeToImplement || 'N/A'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Score</p>
            <p className="text-sm font-semibold text-primary">
              {scorePercent}%
            </p>
          </div>
        </div>
        
        {/* Score Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Confidence Score</span>
            <span className="font-medium text-primary">{scorePercent}%</span>
          </div>
          <Progress value={scorePercent} className="h-2" />
        </div>
        
        {/* Rationale */}
        {recommendation.rationale && (
          <div className="pt-2 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Rationale</p>
            <p className="text-sm text-foreground/80">
              {recommendation.rationale}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
