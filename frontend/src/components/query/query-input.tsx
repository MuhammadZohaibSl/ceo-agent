'use client';

/**
 * Query Input Component
 * Main input area for strategic questions with constraints
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQueryStore } from '@/stores/query-store';
import { useAnalyze } from '@/hooks/use-api';

export function QueryInput() {
  const { query, setQuery, constraints, updateConstraint, isAnalyzing } = useQueryStore();
  const analyzeMutation = useAnalyze();
  const [showConstraints, setShowConstraints] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isAnalyzing) return;
    
    analyzeMutation.mutate({
      query: query.trim(),
      constraints,
    });
  };
  
  const formatCurrency = (value: number | undefined): string => {
    if (!value) return '';
    return value.toString();
  };
  
  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs">🎯</span>
            Strategic Query
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConstraints(!showConstraints)}
            className="text-muted-foreground text-xs"
          >
            {showConstraints ? 'Hide' : 'Show'} Constraints
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Enter your strategic question... (e.g., 'Should we expand into the European market next quarter?')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[100px] resize-none bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
              disabled={isAnalyzing}
            />
            
            {/* Active constraints badges */}
            {(constraints.budgetLimit || constraints.timeHorizon || constraints.riskTolerance) && (
              <div className="flex flex-wrap gap-2">
                {constraints.budgetLimit && (
                  <Badge variant="secondary" className="text-xs">
                    Budget: ${constraints.budgetLimit.toLocaleString()}
                  </Badge>
                )}
                {constraints.timeHorizon && (
                  <Badge variant="secondary" className="text-xs">
                    Timeline: {constraints.timeHorizon}
                  </Badge>
                )}
                {constraints.riskTolerance && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    Risk: {constraints.riskTolerance}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          {/* Constraints Panel */}
          {showConstraints && (
            <div className="grid grid-cols-3 gap-3 p-4 rounded-lg bg-muted/30 border border-border/30">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Budget Limit ($)</label>
                <Input
                  type="number"
                  placeholder="e.g., 500000"
                  value={formatCurrency(constraints.budgetLimit)}
                  onChange={(e) => updateConstraint('budgetLimit', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="h-9 bg-background/50"
                  disabled={isAnalyzing}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Time Horizon</label>
                <Input
                  type="text"
                  placeholder="e.g., Q2 2026"
                  value={constraints.timeHorizon || ''}
                  onChange={(e) => updateConstraint('timeHorizon', e.target.value || undefined)}
                  className="h-9 bg-background/50"
                  disabled={isAnalyzing}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Risk Tolerance</label>
                <select
                  value={constraints.riskTolerance || ''}
                  onChange={(e) => updateConstraint('riskTolerance', e.target.value as 'low' | 'medium' | 'high' | undefined || undefined)}
                  className="h-9 w-full rounded-md border border-input bg-background/50 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  disabled={isAnalyzing}
                >
                  <option value="">Select...</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={!query.trim() || isAnalyzing}
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Analyzing...
              </span>
            ) : (
              'Analyze Strategy'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
