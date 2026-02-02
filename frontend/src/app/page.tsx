'use client';

/**
 * CEO Agent - Main Application Page
 * Strategic decision support interface with mobile-first design
 */

import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { QueryInput } from '@/components/query/query-input';
import { AnalysisResults } from '@/components/analysis/analysis-results';
import { DocumentsPanel } from '@/components/documents/documents-panel';
import { ApprovalsPanel } from '@/components/approvals/approvals-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <Header />
      
      <main className="container mx-auto px-4 md:px-6 py-4 md:py-6 max-w-7xl">
        <Tabs defaultValue="analysis" className="space-y-4 md:space-y-6">
          <TabsList className="bg-muted/50 w-full justify-start overflow-x-auto">
            <TabsTrigger value="analysis" className="text-sm">Analysis</TabsTrigger>
            <TabsTrigger value="documents" className="text-sm">Documents</TabsTrigger>
            <TabsTrigger value="approvals" className="text-sm">Approvals</TabsTrigger>
          </TabsList>
          
          <TabsContent value="analysis" className="space-y-4 md:space-y-6">
            <QueryInput />
            <AnalysisResults />
          </TabsContent>
          
          <TabsContent value="documents">
            <div className="max-w-3xl mx-auto">
              <DocumentsPanel />
            </div>
          </TabsContent>
          
          <TabsContent value="approvals">
            <div className="max-w-3xl mx-auto">
              <ApprovalsPanel />
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      <MobileNav />
    </div>
  );
}
