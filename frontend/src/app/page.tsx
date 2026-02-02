'use client';

/**
 * CEO Agent - Main Application Page
 * Strategic decision support interface
 */

import { Header } from '@/components/layout/header';
import { QueryInput } from '@/components/query/query-input';
import { AnalysisResults } from '@/components/analysis/analysis-results';
import { DocumentsPanel } from '@/components/documents/documents-panel';
import { ApprovalsPanel } from '@/components/approvals/approvals-panel';
import { useUIStore } from '@/stores/ui-store';

export default function Home() {
  const { sidebarTab } = useUIStore();
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-6 max-w-7xl">
        {/* Analysis Tab */}
        {sidebarTab === 'analysis' && (
          <div className="space-y-6">
            <QueryInput />
            <AnalysisResults />
          </div>
        )}
        
        {/* Documents Tab */}
        {sidebarTab === 'documents' && (
          <div className="max-w-3xl mx-auto">
            <DocumentsPanel />
          </div>
        )}
        
        {/* Approvals Tab */}
        {sidebarTab === 'approvals' && (
          <div className="max-w-3xl mx-auto">
            <ApprovalsPanel />
          </div>
        )}
      </main>
    </div>
  );
}
