'use client';

/**
 * Documents Panel Component
 * Manage RAG documents
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/use-api';
import { useUIStore } from '@/stores/ui-store';

export function DocumentsPanel() {
  const { data: documents, isLoading } = useDocuments();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const { isDocumentModalOpen, openDocumentModal, closeDocumentModal } = useUIStore();
  
  const [newDoc, setNewDoc] = useState<{ name: string; content: string; type: 'md' | 'txt' | 'json' }>({ name: '', content: '', type: 'md' });
  
  const handleUpload = () => {
    if (!newDoc.name.trim() || !newDoc.content.trim()) return;
    
    uploadMutation.mutate(newDoc, {
      onSuccess: () => {
        setNewDoc({ name: '', content: '', type: 'md' });
        closeDocumentModal();
      },
    });
  };
  
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(id);
    }
  };
  
  return (
    <>
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs">📄</span>
              Knowledge Documents
            </CardTitle>
            <Button size="sm" onClick={openDocumentModal}>
              Add Document
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading documents...
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No documents uploaded yet.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Add documents to enhance the agent's knowledge base.
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30 group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📄</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{doc.name}</p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      .{doc.type}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleteMutation.isPending}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      
      {/* Upload Dialog */}
      <Dialog open={isDocumentModalOpen} onOpenChange={(open) => !open && closeDocumentModal()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Knowledge Document</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Document Name</label>
              <Input
                placeholder="e.g., company_strategy_2026"
                value={newDoc.name}
                onChange={(e) => setNewDoc(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Content</label>
              <Textarea
                placeholder="Paste your document content here (Markdown supported)..."
                value={newDoc.content}
                onChange={(e) => setNewDoc(prev => ({ ...prev, content: e.target.value }))}
                className="min-h-[200px]"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Format</label>
              <select
                value={newDoc.type}
                onChange={(e) => setNewDoc(prev => ({ ...prev, type: e.target.value as 'md' | 'txt' | 'json' }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="md">Markdown (.md)</option>
                <option value="txt">Plain Text (.txt)</option>
                <option value="json">JSON (.json)</option>
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeDocumentModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!newDoc.name.trim() || !newDoc.content.trim() || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
