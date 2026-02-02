/**
 * CEO Agent API Client
 * Handles all communication with the backend API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
    ApiResponse,
    AnalysisResult,
    StatusResponse,
    ApprovalRequest,
    ApprovalStats,
    Document,
    AnalyzeRequest,
    ApproveRequest,
    RejectRequest,
    UploadDocumentRequest,
} from '@/types/api';

// API base URL - configurable via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance with defaults
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 120000, // 2 minutes for LLM responses
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse<unknown>>) => {
        const message = error.response?.data?.error || error.message || 'An error occurred';
        return Promise.reject(new Error(message));
    }
);

/**
 * API functions
 */

// Get agent status
export async function getStatus(): Promise<StatusResponse> {
    const response = await apiClient.get<ApiResponse<StatusResponse>>('/api/status');
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get status');
    }
    return response.data.data;
}

// Analyze a strategic query
export async function analyze(request: AnalyzeRequest): Promise<AnalysisResult> {
    const response = await apiClient.post<ApiResponse<AnalysisResult>>('/api/analyze', request);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Analysis failed');
    }
    return response.data.data;
}

// Get pending approvals
export async function getApprovals(): Promise<{ pending: ApprovalRequest[]; stats: ApprovalStats }> {
    const response = await apiClient.get<ApiResponse<{ pending: ApprovalRequest[]; stats: ApprovalStats }>>('/api/approvals');
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get approvals');
    }
    return response.data.data;
}

// Get specific approval
export async function getApproval(id: string): Promise<ApprovalRequest> {
    const response = await apiClient.get<ApiResponse<ApprovalRequest>>(`/api/approvals/${id}`);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Approval not found');
    }
    return response.data.data;
}

// Approve a decision
export async function approveDecision(id: string, request: ApproveRequest): Promise<ApprovalRequest> {
    const response = await apiClient.post<ApiResponse<ApprovalRequest>>(`/api/approvals/${id}/approve`, request);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Approval failed');
    }
    return response.data.data;
}

// Reject a decision
export async function rejectDecision(id: string, request: RejectRequest): Promise<ApprovalRequest> {
    const response = await apiClient.post<ApiResponse<ApprovalRequest>>(`/api/approvals/${id}/reject`, request);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Rejection failed');
    }
    return response.data.data;
}

// Get decision history
export async function getHistory(): Promise<unknown[]> {
    const response = await apiClient.get<ApiResponse<unknown[]>>('/api/history');
    if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get history');
    }
    return response.data.data || [];
}

// Get documents
export async function getDocuments(): Promise<Document[]> {
    const response = await apiClient.get<ApiResponse<Document[]>>('/api/documents');
    if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get documents');
    }
    return response.data.data || [];
}

// Upload a document
export async function uploadDocument(request: UploadDocumentRequest): Promise<Document> {
    const response = await apiClient.post<ApiResponse<Document>>('/api/documents', request);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Upload failed');
    }
    return response.data.data;
}

// Delete a document
export async function deleteDocument(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/api/documents/${id}`);
    if (!response.data.success) {
        throw new Error(response.data.error || 'Delete failed');
    }
}

// Export all functions
export const api = {
    getStatus,
    analyze,
    getApprovals,
    getApproval,
    approveDecision,
    rejectDecision,
    getHistory,
    getDocuments,
    uploadDocument,
    deleteDocument,
};

export default api;
