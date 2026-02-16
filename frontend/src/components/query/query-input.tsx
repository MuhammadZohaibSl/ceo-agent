'use client';

/**
 * Query Input Component
 * Main input area for strategic questions with constraints - Mobile-first design
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQueryStore } from '@/stores/query-store';
import { usePipelineStore } from '@/stores/pipeline-store';
import { useAnalyze } from '@/hooks/use-api';
import api from '@/lib/api';

export function QueryInput() {
  const { query, setQuery, constraints, updateConstraint, isAnalyzing } = useQueryStore();
  const { isStarting, setStarting, setPipeline, setError } = usePipelineStore();
  const analyzeMutation = useAnalyze();
  const [showConstraints, setShowConstraints] = useState(false);
  
  const handleStartPipeline = async () => {
    if (!query.trim() || isStarting) return;
    setStarting(true);
    setError(null);
    try {
      const response = await api.startPipeline({
        query: query.trim(),
        constraints,
      });
      if (response.success && response.data) {
        setPipeline(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start pipeline');
    } finally {
      setStarting(false);
    }
  };
  
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
    <Card className="border-border bg-card/50 backdrop-blur-sm shadow-sm">
      <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2">

            Strategic Query
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConstraints(!showConstraints)}
            className="text-muted-foreground text-[10px] md:text-xs h-8 px-2 md:px-3"
          >
            {showConstraints ? 'Hide' : 'Constraints'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Enter your strategic question…"
              value={query}
              name="strategic-query"
              autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[80px] md:min-h-[100px] resize-none bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary shadow-inner transition-colors text-sm md:text-base"
              disabled={isAnalyzing}
            />
            
            {/* Active constraints badges */}
            {(constraints.budgetLimit || constraints.timeHorizon || constraints.riskTolerance) && (
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {constraints.budgetLimit && (
                  <Badge variant="secondary" className="text-[10px] md:text-xs">
                    ${constraints.budgetLimit.toLocaleString()}
                  </Badge>
                )}
                {constraints.timeHorizon && (
                  <Badge variant="secondary" className="text-[10px] md:text-xs">
                    {constraints.timeHorizon}
                  </Badge>
                )}
                {constraints.riskTolerance && (
                  <Badge variant="secondary" className="text-[10px] md:text-xs capitalize">
                    {constraints.riskTolerance}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          {/* Constraints Panel - Stack on mobile */}
          {showConstraints && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 md:p-4 rounded-lg bg-muted/30 border-none shadow-sm">
              <div className="space-y-1.5">
                <label className="text-[10px] md:text-xs text-muted-foreground font-medium">Budget ($)</label>
                <Input
                  type="number"
                  name="budget-limit"
                  placeholder="500,000…"
                  value={formatCurrency(constraints.budgetLimit)}
                  inputMode="numeric"
                  onChange={(e) => updateConstraint('budgetLimit', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="h-9 md:h-10 bg-background/50 border-none shadow-sm text-sm"
                  disabled={isAnalyzing}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] md:text-xs text-muted-foreground font-medium">Timeline</label>
                <Input
                  type="text"
                  name="time-horizon"
                  placeholder="Q2 2026…"
                  value={constraints.timeHorizon || ''}
                  onChange={(e) => updateConstraint('timeHorizon', e.target.value || undefined)}
                  className="h-9 md:h-10 bg-background/50 border-none shadow-sm text-sm"
                  disabled={isAnalyzing}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] md:text-xs text-muted-foreground font-medium">Risk</label>
                <select
                  value={constraints.riskTolerance || ''}
                  onChange={(e) => updateConstraint('riskTolerance', e.target.value as 'low' | 'medium' | 'high' | undefined || undefined)}
                  className="h-9 md:h-10 w-full rounded-md border border-border shadow-sm bg-background/50 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                  disabled={isAnalyzing}
                >
                  <option value="">Select Option…</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              type="submit" 
              className="flex-1 h-10 md:h-11 touch-target text-sm md:text-base"
              disabled={!query.trim() || isAnalyzing || isStarting}
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Analyzing Strategy…
                </span>
              ) : (
                'Quick Analysis'
              )}
            </Button>
            <Button 
              type="button"
              onClick={handleStartPipeline}
              variant="secondary"
              className="flex-1 h-10 md:h-11 touch-target text-sm md:text-base bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 hover:text-white transition-all font-semibold"
              disabled={!query.trim() || isAnalyzing || isStarting}
            >
              {isStarting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting Analysis…
                </span>
              ) : (
                ' Start Deep Analysis'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
