'use client';

/**
 * Confidence Meter Component
 * Visual display of confidence level
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

import { HighlightText } from '@/components/ui/highlight-text';

interface ConfidenceMeterProps {
  confidence: number;
  confidenceLevel: string;
  requiresApproval: boolean;
  approvalReason?: string;
  missingData?: string[];
}

export function ConfidenceMeter({ 
  confidence, 
  confidenceLevel, 
  requiresApproval, 
  approvalReason,
  missingData 
}: ConfidenceMeterProps) {
  const confidencePercent = Math.round(confidence * 100);
  
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'very_high': return 'text-green-500';
      case 'high': return 'text-emerald-500';
      case 'moderate': return 'text-amber-500';
      case 'low': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };
  
  const getProgressColor = (percent: number) => {
    if (percent >= 80) return '[&>div]:bg-green-500';
    if (percent >= 60) return '[&>div]:bg-emerald-500';
    if (percent >= 40) return '[&>div]:bg-amber-500';
    return '[&>div]:bg-red-500';
  };
  
  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs">📊</span>
          Analysis Confidence
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Confidence Score */}
        <div className="text-center py-4">
          <p className={`text-4xl font-bold ${getLevelColor(confidenceLevel)}`}>
            {confidencePercent}%
          </p>
          <p className="text-sm text-muted-foreground capitalize mt-1">
            {confidenceLevel.replace(/_/g, ' ')} confidence
          </p>
        </div>
        
        {/* Progress Bar */}
        <Progress 
          value={confidencePercent} 
          className={`h-3 ${getProgressColor(confidencePercent)}`}
        />
        
        {/* Approval Status */}
        {requiresApproval && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-1">

              <span className="text-sm font-medium text-amber-500">Requires Human Approval</span>
            </div>
            {approvalReason && (
              <div className="text-xs text-amber-500/70 ml-6">
                <HighlightText text={approvalReason} />
              </div>
            )}
          </div>
        )}
        
        {/* Missing Data */}
        {missingData && missingData.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Missing Data Points:
            </p>
            <div className="flex flex-wrap gap-1">
              {missingData.map((item, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
