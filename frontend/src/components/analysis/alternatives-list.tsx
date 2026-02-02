'use client';

/**
 * Alternatives List Component
 * Displays alternative options from the analysis
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Alternative } from '@/types/api';

interface AlternativesListProps {
  alternatives: Alternative[];
}

export function AlternativesList({ alternatives }: AlternativesListProps) {
  if (!alternatives || alternatives.length === 0) {
    return null;
  }
  
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };
  
  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs">📋</span>
          Alternative Options
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {alternatives.map((alt, index) => (
          <div 
            key={alt.id || index}
            className="p-4 rounded-lg bg-muted/30 border border-border/30 space-y-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {alt.rank || index + 2}
                </span>
                <h4 className="font-medium text-foreground">
                  {alt.title}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getRiskColor(alt.riskLevel)}>
                  {alt.riskLevel}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {Math.round(alt.score * 100)}%
                </Badge>
              </div>
            </div>
            
            {alt.description && (
              <p className="text-sm text-muted-foreground pl-7">
                {alt.description}
              </p>
            )}
            
            {alt.tradeoffVsTop && (
              <p className="text-xs text-muted-foreground/70 pl-7 italic">
                Trade-off: {alt.tradeoffVsTop}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
