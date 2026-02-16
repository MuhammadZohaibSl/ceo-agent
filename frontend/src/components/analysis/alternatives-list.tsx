import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Alternative } from '@/types/api';
import { cn } from '@/lib/utils';
import { EditableSection } from './editable-section';
import { useQueryStore } from '@/stores/query-store';

interface AlternativesListProps {
  alternatives: Alternative[];
}

export function AlternativesList({ alternatives }: AlternativesListProps) {
  const { currentResult, editResultArtifact, addResultComment } = useQueryStore();
  const artifacts = currentResult?.proposal?.artifacts;

  if (!alternatives || alternatives.length === 0) {
    return null;
  }
  
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/10 text-green-500 border-none shadow-sm';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-none shadow-sm';
      case 'high': return 'bg-red-500/10 text-red-500 border-none shadow-sm';
      default: return 'bg-muted text-muted-foreground';
    }
  };
  
  return (
    <Card className="border-none bg-card/40 shadow-inner overflow-hidden rounded-3xl">
      <CardHeader className="pb-3 bg-muted/20">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
           Strategic Counter-Options
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-6">
        {alternatives.map((alt, index) => {
          const sectionId = `alternative-${index}`;
          const tradeoffId = `alternative-tradeoff-${index}`;
          
          return (
            <div 
              key={alt.id || index}
              className="rounded-2xl bg-muted/20 border-none overflow-hidden group transition-all hover:bg-muted/30"
            >
              {/* Alt Header */}
              <div className="px-5 py-3 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center h-6 w-6 rounded-lg bg-primary/10 text-[10px] font-black text-primary border-none shadow-sm shadow-primary/5">
                    {alt.rank || index + 2}
                  </span>
                  <h4 className="text-sm font-bold text-foreground tracking-tight">
                    {alt.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn('border-none shadow-sm text-[9px] font-bold uppercase', getRiskColor(alt.riskLevel))}>
                    {alt.riskLevel}
                  </Badge>
                  <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[9px] font-black tabular-nums">
                    {Math.round(alt.score * 100)}%
                  </Badge>
                </div>
              </div>
              
              {/* Alt Body */}
              <div className="p-1">
                <EditableSection
                    sectionId={sectionId}
                    artifact={artifacts?.[sectionId]}
                    content={alt.description}
                    onEdit={(idx, content) => editResultArtifact(sectionId, idx, content, alt.description)}
                    onComment={(idx, text) => addResultComment(sectionId, idx, text, alt.description)}
                    className="bg-transparent"
                />
              </div>

              {/* Trade-off Sub-section */}
              {alt.tradeoffVsTop && (
                <div className="px-5 pb-4 pt-2">
                   <div className="p-3 rounded-xl bg-primary/5 border-none shadow-inner">
                      <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                         <span className="h-0.5 w-2 bg-primary/30 rounded-full" />
                         Trade-off vs Top Rec
                      </p>
                      <EditableSection
                        sectionId={tradeoffId}
                        artifact={artifacts?.[tradeoffId]}
                        content={alt.tradeoffVsTop}
                        onEdit={(idx, content) => editResultArtifact(tradeoffId, idx, content, alt.tradeoffVsTop)}
                        onComment={(idx, text) => addResultComment(tradeoffId, idx, text, alt.tradeoffVsTop)}
                        className="bg-transparent"
                      />
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
