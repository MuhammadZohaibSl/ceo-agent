'use client';

/**
 * Header Component
 * Responsive navigation - desktop only, mobile uses bottom nav
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useStatus } from '@/hooks/use-api';
import { useStatusStore } from '@/stores/status-store';
import { SettingsPanel } from '@/components/settings/settings-panel';
import { ModeToggle } from '@/components/mode-toggle';

const navItems = [
  { href: '/', label: 'Analysis' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/history', label: 'History' },
  { href: '/settings', label: 'Settings' },
];

export function Header() {
  const pathname = usePathname();
  useStatus(); // Fetch status
  const { status, isLoading } = useStatusStore();
  
  const getProviderStatus = () => {
    if (isLoading || !status) return 'loading';
    const available = status.llm.availableProviders;
    if (available === 0) return 'offline';
    return 'online';
  };
  
  const providerStatus = getProviderStatus();
  
  return (
    <header className="h-14 md:h-16 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        {/* Logo and Title */}
        <Link href="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
          
          <div>
            <h1 className="text-base md:text-lg font-semibold text-foreground">CEO Agent</h1>
            <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Strategic Decision Support</p>
          </div>
        </Link>
        
        {/* Navigation - Desktop Only */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(isActive ? '' : 'text-muted-foreground hover:text-foreground')}
                >
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        
        {/* Status Indicators and Settings */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* LLM Provider Selector */}
          <SettingsPanel />
          <ModeToggle />
          
          <Separator orientation="vertical" className="h-4 md:h-6 hidden sm:block" />
          
          <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
            <span className="text-muted-foreground hidden sm:inline">Status:</span>
            <Badge 
              variant={providerStatus === 'online' ? 'default' : providerStatus === 'loading' ? 'secondary' : 'destructive'}
              className="text-[10px] md:text-xs capitalize tabular-nums"
            >
              {isLoading ? '…' : providerStatus === 'online' 
                ? `${status?.llm.availableProviders} active`
                : 'Offline'}
            </Badge>
          </div>
          
          <div className="hidden sm:flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
            <span className="text-muted-foreground">Docs:</span>
            <Badge variant="secondary" className="text-[10px] md:text-xs tabular-nums">
              {isLoading ? '…' : status?.rag.vectorStore.uniqueDocuments || 0}
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
