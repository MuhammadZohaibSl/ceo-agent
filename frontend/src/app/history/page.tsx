'use client';

/**
 * History Page
 * View past decisions and analysis history - Mobile-first design
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQueryStore } from '@/stores/query-store';
import { useHistory } from '@/hooks/use-api';

export default function HistoryPage() {
  const { history: localHistory } = useQueryStore();
  const { data: serverHistory, isLoading } = useHistory();
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };
  
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };
  
  return (
    <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 max-w-5xl">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Decision History</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Review past strategic analyses
        </p>
      </div>
      
      <div className="grid gap-4 md:gap-6">
        {/* Recent Session History */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
            <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2">

              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            {localHistory.length === 0 ? (
              <p className="text-xs md:text-sm text-muted-foreground text-center py-6 md:py-8">
                No analyses in this session yet.
              </p>
            ) : (
              <ScrollArea className="h-[300px] md:h-[400px]">
                <div className="space-y-2 md:space-y-3 pr-4">
                  {localHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 md:p-4 rounded-lg bg-muted/30 border border-border/30"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                        <p className="text-xs md:text-sm font-medium text-foreground line-clamp-2">
                          {item.query}
                        </p>
                        <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(item.timestamp)}
                        </span>
                      </div>
                      
                      {item.result.proposal?.recommendation && (
                        <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-border/30">
                          <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Recommendation:</p>
                          <p className="text-xs md:text-sm text-foreground">
                            {item.result.proposal.recommendation.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-2">
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] md:text-xs ${getRiskColor(item.result.proposal.recommendation.riskLevel)}`}
                            >
                              {item.result.proposal.recommendation.riskLevel} risk
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] md:text-xs">
                              {Math.round(item.result.proposal.confidence * 100)}%
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
        
        {/* Server History (from Memory) */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
            <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2">
              <span className="w-5 h-5 md:w-6 md:h-6 rounded bg-muted flex items-center justify-center text-xs">🗄️</span>
              Memory Store
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            {isLoading ? (
              <div className="py-6 md:py-8 text-center text-muted-foreground text-sm">
                Loading...
              </div>
            ) : !serverHistory || serverHistory.length === 0 ? (
              <p className="text-xs md:text-sm text-muted-foreground text-center py-6 md:py-8">
                No decisions stored yet.
              </p>
            ) : (
              <ScrollArea className="h-[200px] md:h-[300px]">
                <div className="space-y-2 pr-4">
                  {serverHistory.map((item: unknown, index: number) => {
                    const memory = item as { id: string; type: string; content: string; timestamp: string };
                    return (
                      <div
                        key={memory.id || index}
                        className="p-2 md:p-3 rounded-lg bg-muted/20 border border-border/20"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <Badge variant="secondary" className="text-[10px] md:text-xs">
                            {memory.type || 'decision'}
                          </Badge>
                          <span className="text-[10px] md:text-xs text-muted-foreground">
                            {memory.timestamp ? formatDate(memory.timestamp) : 'N/A'}
                          </span>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                          {typeof memory.content === 'string' 
                            ? memory.content 
                            : JSON.stringify(memory.content).substring(0, 100) + '...'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
