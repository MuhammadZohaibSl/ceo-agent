'use client';

/**
 * Approvals Panel Component
 * Manage pending decisions requiring human approval
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApprovals, useApproveDecision, useRejectDecision } from '@/hooks/use-api';
import { useUIStore } from '@/stores/ui-store';
import type { ApprovalRequest } from '@/types/api';

export function ApprovalsPanel() {
  const { data, isLoading } = useApprovals();
  const approveMutation = useApproveDecision();
  const rejectMutation = useRejectDecision();
  const { isApprovalModalOpen, selectedApprovalId, openApprovalModal, closeApprovalModal } = useUIStore();
  
  const [approver, setApprover] = useState('');
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionTab, setActionTab] = useState<'approve' | 'reject'>('approve');
  
  const selectedApproval = data?.pending.find(a => a.id === selectedApprovalId);
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };
  
  const handleApprove = () => {
    if (!selectedApprovalId) return;
    
    approveMutation.mutate(
      { id: selectedApprovalId, request: { approver: approver || 'User', notes } },
      {
        onSuccess: () => {
          closeApprovalModal();
          setApprover('');
          setNotes('');
        },
      }
    );
  };
  
  const handleReject = () => {
    if (!selectedApprovalId || !rejectReason.trim()) return;
    
    rejectMutation.mutate(
      { id: selectedApprovalId, request: { approver: approver || 'User', reason: rejectReason } },
      {
        onSuccess: () => {
          closeApprovalModal();
          setApprover('');
          setRejectReason('');
        },
      }
    );
  };
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };
  
  return (
    <>
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-amber-500/10 flex items-center justify-center text-xs">🔐</span>
              Pending Approvals
            </CardTitle>
            {data && (
              <Badge variant="secondary">
                {data.stats.pending} pending
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading approvals...
            </div>
          ) : !data?.pending || data.pending.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No pending approvals.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                All decisions have been processed.
              </p>
            </div>
          ) : (
            data.pending.map((approval: ApprovalRequest) => (
              <div
                key={approval.id}
                className="p-4 rounded-lg bg-muted/30 border border-border/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => openApprovalModal(approval.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {approval.summary}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {formatDate(approval.createdAt)}
                    </p>
                  </div>
                  <Badge variant="outline" className={getPriorityColor(approval.priority)}>
                    {approval.priority}
                  </Badge>
                </div>
              </div>
            ))
          )}
          
          {/* Stats */}
          {data && (
            <div className="pt-4 border-t border-border/30 mt-4">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold text-amber-500">{data.stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-green-500">{data.stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-red-500">{data.stats.rejected}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-muted-foreground">{data.stats.expired}</p>
                  <p className="text-xs text-muted-foreground">Expired</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Approval Dialog */}
      <Dialog open={isApprovalModalOpen} onOpenChange={(open) => !open && closeApprovalModal()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Decision</DialogTitle>
          </DialogHeader>
          
          {selectedApproval && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-sm text-foreground">{selectedApproval.summary}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={getPriorityColor(selectedApproval.priority)}>
                    {selectedApproval.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Expires: {formatDate(selectedApproval.expiresAt)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Your Name</label>
                <Input
                  placeholder="e.g., John Doe"
                  value={approver}
                  onChange={(e) => setApprover(e.target.value)}
                />
              </div>
              
              <Tabs value={actionTab} onValueChange={(v) => setActionTab(v as 'approve' | 'reject')}>
                <TabsList className="w-full">
                  <TabsTrigger value="approve" className="flex-1">Approve</TabsTrigger>
                  <TabsTrigger value="reject" className="flex-1">Reject</TabsTrigger>
                </TabsList>
                
                <TabsContent value="approve" className="space-y-2 mt-4">
                  <label className="text-sm font-medium text-foreground">Notes (optional)</label>
                  <Textarea
                    placeholder="Add any approval notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[80px]"
                  />
                </TabsContent>
                
                <TabsContent value="reject" className="space-y-2 mt-4">
                  <label className="text-sm font-medium text-foreground">Reason (required)</label>
                  <Textarea
                    placeholder="Explain why this decision is being rejected..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="min-h-[80px]"
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={closeApprovalModal}>
              Cancel
            </Button>
            {actionTab === 'approve' ? (
              <Button 
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending ? 'Approving...' : 'Approve Decision'}
              </Button>
            ) : (
              <Button 
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Decision'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
