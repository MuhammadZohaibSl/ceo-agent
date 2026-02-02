/**
 * TanStack Query hooks for CEO Agent API
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useQueryStore } from '@/stores/query-store';
import type { AnalyzeRequest, ApproveRequest, RejectRequest, UploadDocumentRequest } from '@/types/api';

// Query keys
export const queryKeys = {
    status: ['status'] as const,
    approvals: ['approvals'] as const,
    approval: (id: string) => ['approvals', id] as const,
    history: ['history'] as const,
    documents: ['documents'] as const,
};

/**
 * Hook for fetching agent status
 */
export function useStatus() {
    return useQuery({
        queryKey: queryKeys.status,
        queryFn: api.getStatus,
        refetchInterval: 30000, // Refetch every 30 seconds
        staleTime: 10000,
    });
}

/**
 * Hook for analyzing a strategic query
 */
export function useAnalyze() {
    const queryClient = useQueryClient();
    const { setIsAnalyzing, setResult, setError } = useQueryStore();

    return useMutation({
        mutationFn: (request: AnalyzeRequest) => api.analyze(request),
        onMutate: () => {
            setIsAnalyzing(true);
        },
        onSuccess: (data) => {
            setResult(data);
            // Invalidate approvals in case new approval was created
            queryClient.invalidateQueries({ queryKey: queryKeys.approvals });
        },
        onError: (error: Error) => {
            setError(error.message);
        },
    });
}

/**
 * Hook for fetching pending approvals
 */
export function useApprovals() {
    return useQuery({
        queryKey: queryKeys.approvals,
        queryFn: api.getApprovals,
        refetchInterval: 15000, // Refetch every 15 seconds
    });
}

/**
 * Hook for fetching a specific approval
 */
export function useApproval(id: string | null) {
    return useQuery({
        queryKey: queryKeys.approval(id || ''),
        queryFn: () => api.getApproval(id!),
        enabled: !!id,
    });
}

/**
 * Hook for approving a decision
 */
export function useApproveDecision() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, request }: { id: string; request: ApproveRequest }) =>
            api.approveDecision(id, request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.approvals });
        },
    });
}

/**
 * Hook for rejecting a decision
 */
export function useRejectDecision() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, request }: { id: string; request: RejectRequest }) =>
            api.rejectDecision(id, request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.approvals });
        },
    });
}

/**
 * Hook for fetching decision history
 */
export function useHistory() {
    return useQuery({
        queryKey: queryKeys.history,
        queryFn: api.getHistory,
    });
}

/**
 * Hook for fetching documents
 */
export function useDocuments() {
    return useQuery({
        queryKey: queryKeys.documents,
        queryFn: api.getDocuments,
    });
}

/**
 * Hook for uploading a document
 */
export function useUploadDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: UploadDocumentRequest) => api.uploadDocument(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.documents });
            queryClient.invalidateQueries({ queryKey: queryKeys.status });
        },
    });
}

/**
 * Hook for deleting a document
 */
export function useDeleteDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.deleteDocument(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.documents });
            queryClient.invalidateQueries({ queryKey: queryKeys.status });
        },
    });
}
