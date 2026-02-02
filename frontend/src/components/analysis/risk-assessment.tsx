'use client';

/**
 * Risk Assessment Component
 * Displays risk analysis from the agent
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { RiskAssessment } from '@/types/api';

interface RiskAssessmentDisplayProps {
  risks: RiskAssessment;
}

export function RiskAssessmentDisplay({ risks }: RiskAssessmentDisplayProps) {
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
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">

            Risk Assessment
          </CardTitle>
          <Badge variant="outline" className={getOverallColor(risks.overallLevel)}>
            {risks.overallLevel} overall risk
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Risk Alerts */}
        {risks.alerts && risks.alerts.length > 0 && (
          <div className="space-y-2">
            {risks.alerts.map((alert, index) => (
              <Alert key={index} variant={getAlertVariant(alert.level)}>
                <AlertDescription className="text-sm">
                  <span className="font-medium">{alert.optionTitle}:</span> {alert.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
        
        {/* Risk Factors */}
        {risks.factors && risks.factors.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Risk Factors
            </h4>
            {risks.factors.map((factor, index) => (
              <div 
                key={index}
                className="p-3 rounded-lg bg-muted/30 border border-border/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground capitalize">
                    {factor.type.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      P: {Math.round(factor.probability * 100)}%
                    </span>
                    <span className="text-muted-foreground">
                      I: {Math.round(factor.impact * 100)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {factor.description}
                </p>
                {factor.mitigations && factor.mitigations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">Mitigations:</p>
                    <ul className="text-xs text-muted-foreground/70 list-disc list-inside">
                      {factor.mitigations.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* No risks message */}
        {(!risks.factors || risks.factors.length === 0) && (!risks.alerts || risks.alerts.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No significant risk factors identified.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
