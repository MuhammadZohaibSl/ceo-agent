'use client';

/**
 * Documents Panel Component
 * Manage RAG documents
 */

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/use-api';
import { useUIStore } from '@/stores/ui-store';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export function DocumentsPanel() {
  const { data: documents, isLoading } = useDocuments();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const { isDocumentModalOpen, openDocumentModal, closeDocumentModal } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newDoc, setNewDoc] = useState<{ name: string; content: string; type: 'md' | 'txt' | 'json' }>({ name: '', content: '', type: 'md' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const handleUpload = () => {
    if (!newDoc.name.trim() || !newDoc.content.trim()) return;
    
    uploadMutation.mutate(newDoc, {
      onSuccess: () => {
        setNewDoc({ name: '', content: '', type: 'md' });
        closeDocumentModal();
      },
    });
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      const ext = file.name.split('.').pop()?.toLowerCase();
      const fileType = ext === 'json' ? 'json' : ext === 'txt' ? 'txt' : 'md';
      
      setNewDoc({
        name: fileName,
        content: content,
        type: fileType as 'md' | 'txt' | 'json',
      });
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
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
                  onClick={() => setDeleteId(doc.id)}
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

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone and the document will be removed from the RAG knowledge base."
        confirmText="Delete Document"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt,.json"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Upload Dialog */}
      <Dialog open={isDocumentModalOpen} onOpenChange={(open) => !open && closeDocumentModal()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Knowledge Document</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Upload from PC button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-dashed"
              >
                📁 Upload from PC
              </Button>
            </div>
            
            <div className="relative flex items-center justify-center">
              <span className="text-xs text-muted-foreground bg-background px-2">or enter manually</span>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50"></div>
              </div>
            </div>
            
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
