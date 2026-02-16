'use client';

/**
 * Risk Assessment Component
 * Displays risk analysis from the agent
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { RiskAssessment } from '@/types/api';
import { HighlightText } from '@/components/ui/highlight-text';
import { cn } from '@/lib/utils';
import { EditableSection } from './editable-section';
import { useQueryStore } from '@/stores/query-store';

interface RiskAssessmentDisplayProps {
  risks: RiskAssessment;
}

export function RiskAssessmentDisplay({ risks }: RiskAssessmentDisplayProps) {
  const { currentResult, editResultArtifact, addResultComment } = useQueryStore();
  const artifacts = currentResult?.proposal?.artifacts;

  const getOverallColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };
  
  const getAlertVariant = (level: string): 'default' | 'destructive' => {
    return level === 'critical' ? 'destructive' : 'default';
  };
  
  return (
    <Card className="border-none bg-card/40 shadow-inner overflow-hidden rounded-3xl">
      <CardHeader className="pb-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            Risk Analysis
          </CardTitle>
          <Badge variant="outline" className={cn('border-none shadow-sm text-[10px] font-bold uppercase', getOverallColor(risks.overallLevel))}>
            {risks.overallLevel}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        {/* Risk Alerts */}
        {risks.alerts && risks.alerts.length > 0 && (
          <div className="space-y-2 px-1">
            {risks.alerts.map((alert, index) => (
              <Alert key={index} variant={getAlertVariant(alert.level)} className="border-none shadow-sm bg-destructive/10">
                <AlertDescription className="text-xs leading-relaxed">
                  <span className="font-bold uppercase text-[9px] mr-2">{alert.optionTitle}</span> 
                  {alert.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
        
        {/* Risk Factors */}
        {risks.factors && risks.factors.length > 0 && (
          <div className="space-y-4">
            {risks.factors.map((factor, index) => {
              const sectionId = `risk-factor-${index}`;
              return (
                <div 
                  key={index}
                  className="rounded-2xl bg-muted/20 border-none overflow-hidden"
                >
                  <div className="px-4 py-2 flex items-center justify-between bg-muted/30">
                    <span className="text-[10px] font-bold text-foreground uppercase tracking-tight">
                      {factor.type.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-3 text-[10px]">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground font-medium uppercase tracking-tighter">Prob</span>
                        <span className="font-bold tabular-nums">{Math.round(factor.probability * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground font-medium uppercase tracking-tighter">Imp</span>
                        <span className="font-bold tabular-nums">{Math.round(factor.impact * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-1">
                    <EditableSection
                        sectionId={sectionId}
                        artifact={artifacts?.[sectionId]}
                        content={factor.description}
                        onEdit={(idx, content) => editResultArtifact(sectionId, idx, content, factor.description)}
                        onComment={(idx, text) => addResultComment(sectionId, idx, text, factor.description)}
                        className="bg-transparent"
                    />
                  </div>

                  {factor.mitigations && factor.mitigations.length > 0 && (
                    <div className="px-4 pb-4 pt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-1 flex-1 bg-green-500/20 rounded-full" />
                        <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Mitigations</span>
                        <div className="h-1 flex-1 bg-green-500/20 rounded-full" />
                      </div>
                      <ul className="space-y-1.5">
                        {factor.mitigations.map((m, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-2">
                            <span className="text-green-500/50">•</span>
                            <HighlightText text={m} className="leading-normal" />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* No risks message */}
        {(!risks.factors || risks.factors.length === 0) && (!risks.alerts || risks.alerts.length === 0) && (
          <div className="text-center py-6">
            <div className="text-2xl mb-2 opacity-20">🛡️</div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Secure Profile • No Critical Risks
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
