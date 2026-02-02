'use client';

/**
 * Settings Page
 * Configure LLM providers and agent settings - Mobile-first design
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStatus } from '@/hooks/use-api';

export default function SettingsPage() {
  const { data: status, isLoading, refetch } = useStatus();
  const [saved, setSaved] = useState(false);
  
  const getProviderStatusColor = (healthy: boolean) => {
    return healthy 
      ? 'bg-green-500/10 text-green-500 border-green-500/20'
      : 'bg-red-500/10 text-red-500 border-red-500/20';
  };
  
  return (
    <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 max-w-4xl">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          LLM providers and agent config
        </p>
      </div>
      
      {saved && (
        <Alert className="mb-4 md:mb-6 border-green-500/50 bg-green-500/10">
          <AlertDescription className="text-green-500 text-sm">
            Settings saved!
          </AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-4 md:space-y-6">
        {/* LLM Provider Status */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2">

              LLM Providers
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Available language model providers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
            {isLoading ? (
              <p className="text-xs md:text-sm text-muted-foreground">Loading...</p>
            ) : status?.llm.providers ? (
              Object.entries(status.llm.providers).map(([name, provider]) => {
                const p = provider;
                return (
                  <div
                    key={name}
                    className="p-3 md:p-4 rounded-lg bg-muted/30 border border-border/30"
                  >
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="text-sm md:text-lg capitalize font-medium">{name}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] md:text-xs ${getProviderStatusColor(p.available)}`}
                        >
                          {p.available ? 'On' : 'Off'}
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="text-[10px] md:text-xs">
                        {p.model}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm">
                      <div>
                        <p className="text-muted-foreground text-[10px] md:text-xs">Health</p>
                        <p className="font-medium capitalize">{p.health}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] md:text-xs">Score</p>
                        <p className="font-medium">{Math.round(p.score * 100)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] md:text-xs">Status</p>
                        <p className="font-medium">{p.available ? 'Ready' : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs md:text-sm text-muted-foreground">No providers</p>
            )}
            
            <div className="pt-2 md:pt-4">
              <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto touch-target">
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Routing Strategy */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2">
              <span className="w-5 h-5 md:w-6 md:h-6 rounded bg-muted flex items-center justify-center text-xs">🔀</span>
              Routing Strategy
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              LLM provider selection method
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <div className="p-3 md:p-4 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm md:text-base capitalize">
                    {status?.llm.strategy?.replace(/_/g, ' ') || 'Best Available'}
                  </p>
                  <p className="text-[10px] md:text-sm text-muted-foreground mt-1">
                    Routes to best provider based on health
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit text-xs">
                  {status?.llm.availableProviders || 0} active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Agent Configuration */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2">
              <span className="w-5 h-5 md:w-6 md:h-6 rounded bg-amber-500/10 flex items-center justify-center text-xs">⚙️</span>
              Agent Config
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Core behavior settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-xs md:text-sm font-medium text-foreground">Max Iterations</label>
                <Input 
                  type="number" 
                  value={status?.agent.config.maxIterations || 5}
                  disabled
                  className="bg-muted/30 text-sm"
                />
              </div>
              
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-xs md:text-sm font-medium text-foreground">Confidence</label>
                <Input 
                  type="number" 
                  value={status?.agent.config.confidenceThreshold || 0.7}
                  step="0.1"
                  disabled
                  className="bg-muted/30 text-sm"
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2">
              <p className="text-[10px] md:text-sm text-muted-foreground">
                Managed via environment variables
              </p>
              <Badge variant="outline" className="text-[10px] md:text-xs">Read-only</Badge>
            </div>
          </CardContent>
        </Card>
        
        {/* Environment Info */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2">
              <span className="w-5 h-5 md:w-6 md:h-6 rounded bg-muted flex items-center justify-center text-xs">📁</span>
              Environment
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-sm">
              <div className="p-2 md:p-3 rounded bg-muted/20">
                <p className="text-muted-foreground text-xs">Backend API</p>
                <p className="font-mono text-xs md:text-sm break-all">localhost:3001</p>
              </div>
              <div className="p-2 md:p-3 rounded bg-muted/20">
                <p className="text-muted-foreground text-xs">Agent Status</p>
                <p className={`text-xs md:text-sm ${status?.agent.ready ? 'text-green-500' : 'text-red-500'}`}>
                  {status?.agent.ready ? 'Ready' : 'Not Ready'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
