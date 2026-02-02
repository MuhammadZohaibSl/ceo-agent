'use client';

/**
 * Header Component
 * Top navigation bar with status indicators and actions
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useStatus } from '@/hooks/use-api';
import { useUIStore } from '@/stores/ui-store';

export function Header() {
  const { data: status, isLoading } = useStatus();
  const { sidebarTab, setSidebarTab } = useUIStore();
  
  const getProviderStatus = () => {
    if (isLoading || !status) return 'loading';
    const available = status.llm.availableProviders;
    if (available === 0) return 'offline';
    return 'online';
  };
  
  const providerStatus = getProviderStatus();
  
  return (
    <header className="h-16 border-b border-border/40 bg-card/50 backdrop-blur-sm">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">CEO</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">CEO Agent</h1>
            <p className="text-xs text-muted-foreground">Strategic Decision Support</p>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1">
          <Button
            variant={sidebarTab === 'analysis' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSidebarTab('analysis')}
          >
            Analysis
          </Button>
          <Button
            variant={sidebarTab === 'documents' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSidebarTab('documents')}
          >
            Documents
          </Button>
          <Button
            variant={sidebarTab === 'approvals' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSidebarTab('approvals')}
          >
            Approvals
          </Button>
        </nav>
        
        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">LLM:</span>
            <Badge 
              variant={providerStatus === 'online' ? 'default' : providerStatus === 'loading' ? 'secondary' : 'destructive'}
              className="capitalize"
            >
              {isLoading ? 'Connecting...' : providerStatus === 'online' 
                ? `${status?.llm.availableProviders} Provider${status?.llm.availableProviders === 1 ? '' : 's'}`
                : 'Offline'}
            </Badge>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Docs:</span>
            <Badge variant="secondary">
              {isLoading ? '...' : status?.rag.vectorStore.uniqueDocuments || 0}
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
