'use client';

/**
 * Dashboard Page
 * System statistics and overview - Mobile-first responsive design
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useStatus, useApprovals, useDocuments } from '@/hooks/use-api';

export default function DashboardPage() {
  const { data: status, isLoading: statusLoading } = useStatus();
  const { data: approvals, isLoading: approvalsLoading } = useApprovals();
  const { data: documents, isLoading: docsLoading } = useDocuments();
  
  const isLoading = statusLoading || approvalsLoading || docsLoading;
  
  // Calculate stats
  const totalProviders = status?.llm.providers ? Object.keys(status.llm.providers).length : 0;
  const activeProviders = status?.llm.availableProviders || 0;
  const vectorCount = status?.rag.vectorStore.totalVectors || 0;
  const documentCount = documents?.length || 0;
  const pendingApprovals = approvals?.stats.pending || 0;
  const approvedCount = approvals?.stats.approved || 0;
  const rejectedCount = approvals?.stats.rejected || 0;
  const memoryShortTerm = status?.memory.shortTerm.count || 0;
  const memoryLongTerm = status?.memory.longTerm.count || 0;
  
  return (
    <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 max-w-6xl">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          System overview and statistics
        </p>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {/* Quick Stats - 2x2 on mobile, 4 cols on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="border-border/50 bg-card/80">
              <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold text-primary">{activeProviders}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Active LLMs</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border/50 bg-card/80">
              <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{documentCount}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Documents</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border/50 bg-card/80">
              <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold text-amber-500">{pendingApprovals}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Pending</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border/50 bg-card/80">
              <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{vectorCount}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Vectors</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Detailed Stats - Stack on mobile, 2 cols on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* LLM Status */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
                <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2">

                  LLM Providers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 md:space-y-3 px-4 md:px-6">
                {status?.llm.providers && Object.entries(status.llm.providers).map(([name, provider]) => {
                  const p = provider;
                  return (
                    <div key={name} className="flex items-center justify-between p-2 md:p-3 rounded bg-muted/20">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className={`w-2 h-2 rounded-full ${p.available ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="font-medium capitalize text-sm md:text-base">{name}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] md:text-xs">
                        {p.model}
                      </Badge>
                    </div>
                  );
                })}
                
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs md:text-sm mb-2">
                    <span className="text-muted-foreground">Availability</span>
                    <span className="font-medium">{activeProviders}/{totalProviders}</span>
                  </div>
                  <Progress value={(activeProviders / Math.max(totalProviders, 1)) * 100} className="h-1.5 md:h-2" />
                </div>
              </CardContent>
            </Card>
            
            {/* Approval Stats */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
                <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2">

                  Approval Workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="grid grid-cols-3 gap-2 md:gap-4 mb-3 md:mb-4">
                  <div className="text-center p-2 md:p-3 rounded bg-amber-500/10">
                    <p className="text-lg md:text-2xl font-bold text-amber-500">{pendingApprovals}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center p-2 md:p-3 rounded bg-green-500/10">
                    <p className="text-lg md:text-2xl font-bold text-green-500">{approvedCount}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div className="text-center p-2 md:p-3 rounded bg-red-500/10">
                    <p className="text-lg md:text-2xl font-bold text-red-500">{rejectedCount}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Rejected</p>
                  </div>
                </div>
                
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs md:text-sm mb-2">
                    <span className="text-muted-foreground">Approval Rate</span>
                    <span className="font-medium">
                      {approvedCount + rejectedCount > 0
                        ? Math.round((approvedCount / (approvedCount + rejectedCount)) * 100)
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={approvedCount + rejectedCount > 0
                      ? (approvedCount / (approvedCount + rejectedCount)) * 100
                      : 0} 
                    className="h-1.5 md:h-2 [&>div]:bg-green-500" 
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Memory Stats */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
                <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2">

                  Memory System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
                <div className="flex items-center justify-between p-2 md:p-3 rounded bg-muted/20">
                  <div>
                    <p className="font-medium text-sm md:text-base">Short-Term</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Session context</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{memoryShortTerm}</Badge>
                </div>
                
                <div className="flex items-center justify-between p-2 md:p-3 rounded bg-muted/20">
                  <div>
                    <p className="font-medium text-sm md:text-base">Long-Term</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Persistent</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{memoryLongTerm}</Badge>
                </div>
                
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs md:text-sm mb-2">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-medium">{memoryShortTerm + memoryLongTerm}</span>
                  </div>
                  <Progress 
                    value={Math.min(((memoryShortTerm + memoryLongTerm) / 1100) * 100, 100)} 
                    className="h-1.5 md:h-2" 
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* RAG Stats */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
                <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2">

                  Knowledge Base
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="p-2 md:p-3 rounded bg-muted/20 text-center">
                    <p className="text-lg md:text-2xl font-bold text-foreground">{documentCount}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Docs</p>
                  </div>
                  <div className="p-2 md:p-3 rounded bg-muted/20 text-center">
                    <p className="text-lg md:text-2xl font-bold text-foreground">{vectorCount}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Vectors</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-2 md:p-3 rounded bg-muted/20">
                  <div>
                    <p className="font-medium text-sm md:text-base">Unique Documents</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Source files indexed</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {status?.rag.vectorStore.uniqueDocuments || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* System Status Banner */}
          <Card className={`border-2 ${status?.agent.ready ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            <CardContent className="py-4 md:py-6 px-4 md:px-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${status?.agent.ready ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                  <div>
                    <p className="font-medium text-sm md:text-base text-foreground">
                      {status?.agent.ready ? 'Operational' : 'Degraded'}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {status?.agent.ready ? 'All systems ready' : 'Issues detected'}
                    </p>
                  </div>
                </div>
                <Badge variant={status?.agent.ready ? 'default' : 'destructive'} className="text-xs md:text-sm">
                  {status?.agent.ready ? 'Ready' : 'Issues'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
