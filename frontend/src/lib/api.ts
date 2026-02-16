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
    RatingRequest,
    CorrectionRequest,
    OutcomeRequest,
    FeedbackItem,
    FeedbackStats,
    LearningInsights,
    PipelineState,
    PipelineSummary,
    StartPipelineRequest,
    EditArtifactRequest,
    CommentRequest,
    ArtifactComment,
    ChatRequest,
    ChatResponse,
} from '@/types/api';

// API base URL - configurable via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance with defaults
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 600000, // 10 minutes for complex LLM analysis
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

// ============================================================================
// OKR API Functions
// ============================================================================

export interface OKRFilters {
    status?: string;
    owner?: string;
    timeframe?: string;
}

export async function getOKRs(filters?: OKRFilters): Promise<{ okrs: unknown[]; stats: unknown }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.owner) params.append('owner', filters.owner);
    if (filters?.timeframe) params.append('timeframe', filters.timeframe);

    const response = await apiClient.get<ApiResponse<{ okrs: unknown[]; stats: unknown }>>(`/api/okrs?${params}`);
    if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get OKRs');
    }
    return response.data.data || { okrs: [], stats: {} };
}

export async function getOKR(id: string): Promise<unknown> {
    const response = await apiClient.get<ApiResponse<unknown>>(`/api/okrs/${id}`);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'OKR not found');
    }
    return response.data.data;
}

export async function createOKR(data: unknown): Promise<unknown> {
    const response = await apiClient.post<ApiResponse<unknown>>('/api/okrs', data);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to create OKR');
    }
    return response.data.data;
}

export async function updateOKR(id: string, data: unknown): Promise<unknown> {
    const response = await apiClient.put<ApiResponse<unknown>>(`/api/okrs/${id}`, data);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to update OKR');
    }
    return response.data.data;
}

export async function updateOKRProgress(id: string, keyResultId: string, currentValue: number): Promise<unknown> {
    const response = await apiClient.put<ApiResponse<unknown>>(`/api/okrs/${id}/progress`, {
        keyResultId,
        currentValue,
    });
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to update progress');
    }
    return response.data.data;
}

export async function deleteOKR(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/api/okrs/${id}`);
    if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete OKR');
    }
}

// ============================================================================
// Vision API Functions
// ============================================================================

export interface GenerateVisionRequest {
    companyName?: string;
    industry?: string;
    timeHorizon?: string;
    context?: string;
    existingStrengths?: string[];
    challenges?: string[];
}

export async function generateVision(data: GenerateVisionRequest): Promise<unknown> {
    const response = await apiClient.post<ApiResponse<unknown>>('/api/vision/generate', data);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to generate vision');
    }
    return response.data.data;
}

export async function getVision(): Promise<{ current: unknown | null; all: unknown[] }> {
    const response = await apiClient.get<ApiResponse<{ current: unknown | null; all: unknown[] }>>('/api/vision');
    if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get vision');
    }
    return response.data.data || { current: null, all: [] };
}

export async function getVisionById(id: string): Promise<unknown> {
    const response = await apiClient.get<ApiResponse<unknown>>(`/api/vision/${id}`);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Vision not found');
    }
    return response.data.data;
}

export async function updateVision(id: string, data: unknown): Promise<unknown> {
    const response = await apiClient.put<ApiResponse<unknown>>(`/api/vision/${id}`, data);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to update vision');
    }
    return response.data.data;
}

export async function activateVision(id: string): Promise<unknown> {
    const response = await apiClient.post<ApiResponse<unknown>>(`/api/vision/${id}/activate`);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to activate vision');
    }
    return response.data.data;
}

export async function validateVision(id: string): Promise<{ valid: boolean; score: number; issues: string[] }> {
    const response = await apiClient.post<ApiResponse<{ valid: boolean; score: number; issues: string[] }>>(`/api/vision/${id}/validate`);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to validate vision');
    }
    return response.data.data;
}

// ============================================================================
// Timeline API Functions
// ============================================================================

export interface TimelineFilters {
    limit?: number;
    offset?: number;
    outcome?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
}

export async function getTimeline(filters?: TimelineFilters): Promise<unknown> {
    const params = new URLSearchParams();
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    if (filters?.outcome) params.append('outcome', filters.outcome);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.get<ApiResponse<unknown>>(`/api/timeline?${params}`);
    if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get timeline');
    }
    return response.data.data;
}

export async function getTimelineStats(period?: string): Promise<unknown> {
    const params = new URLSearchParams();
    if (period) params.append('period', period);

    const response = await apiClient.get<ApiResponse<unknown>>(`/api/timeline/stats?${params}`);
    if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get timeline stats');
    }
    return response.data.data;
}

export async function getTimelineVisualization(granularity?: string, periods?: number): Promise<unknown> {
    const params = new URLSearchParams();
    if (granularity) params.append('granularity', granularity);
    if (periods) params.append('periods', String(periods));

    const response = await apiClient.get<ApiResponse<unknown>>(`/api/timeline/visualization?${params}`);
    if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get visualization data');
    }
    return response.data.data;
}

export async function getTimelineDecision(id: string): Promise<unknown> {
    const response = await apiClient.get<ApiResponse<unknown>>(`/api/timeline/${id}`);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Decision not found');
    }
    return response.data.data;
}

export async function getDecisionImpact(id: string): Promise<unknown> {
    const response = await apiClient.get<ApiResponse<unknown>>(`/api/timeline/${id}/impact`);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Impact data not found');
    }
    return response.data.data;
}

export async function searchTimeline(query: string, limit?: number): Promise<unknown[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (limit) params.append('limit', String(limit));

    const response = await apiClient.get<ApiResponse<unknown[]>>(`/api/timeline/search?${params}`);
    if (!response.data.success) {
        throw new Error(response.data.error || 'Search failed');
    }
    return response.data.data || [];
}

// ============================================================================
// Feedback API Functions
// ============================================================================

// Record a rating
export async function recordRating(request: RatingRequest): Promise<FeedbackItem> {
    const response = await apiClient.post<ApiResponse<FeedbackItem>>('/api/feedback/rating', request);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to record rating');
    }
    return response.data.data;
}

// Record a correction
export async function recordCorrection(request: CorrectionRequest): Promise<FeedbackItem> {
    const response = await apiClient.post<ApiResponse<FeedbackItem>>('/api/feedback/correction', request);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to record correction');
    }
    return response.data.data;
}

// Record an outcome
export async function recordOutcome(request: OutcomeRequest): Promise<FeedbackItem> {
    const response = await apiClient.post<ApiResponse<FeedbackItem>>('/api/feedback/outcome', request);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to record outcome');
    }
    return response.data.data;
}

// Get feedback for a context
export async function getFeedback(contextId: string): Promise<FeedbackItem[]> {
    const response = await apiClient.get<ApiResponse<FeedbackItem[]>>(`/api/feedback/${contextId}`);
    if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get feedback');
    }
    return response.data.data || [];
}

// Get feedback statistics
export async function getFeedbackStats(): Promise<FeedbackStats> {
    const response = await apiClient.get<ApiResponse<FeedbackStats>>('/api/feedback/stats');
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get feedback stats');
    }
    return response.data.data;
}

// Get learning insights
export async function getLearnings(): Promise<LearningInsights> {
    const response = await apiClient.get<ApiResponse<LearningInsights>>('/api/feedback/learnings');
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get learnings');
    }
    return response.data.data;
}

// ============================================================================
// LLM Settings API Functions
// ============================================================================

export interface LLMSettings {
    defaultProvider: string;
    availableProviders: string[];
    providers: Record<string, { available: boolean; model?: string }>;
}

export async function getLLMSettings(): Promise<LLMSettings> {
    const response = await apiClient.get<ApiResponse<LLMSettings>>('/api/settings/llm');
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get LLM settings');
    }
    return response.data.data;
}

export async function updateLLMSettings(settings: { defaultProvider: string }): Promise<LLMSettings> {
    const response = await apiClient.put<ApiResponse<LLMSettings>>('/api/settings/llm', settings);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to update LLM settings');
    }
    return response.data.data;
}

// Export all functions
export const api = {
    // Core
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
    // OKR
    getOKRs,
    getOKR,
    createOKR,
    updateOKR,
    updateOKRProgress,
    deleteOKR,
    // Vision
    generateVision,
    getVision,
    getVisionById,
    updateVision,
    activateVision,
    validateVision,
    // Timeline
    getTimeline,
    getTimelineStats,
    getTimelineVisualization,
    getTimelineDecision,
    getDecisionImpact,
    searchTimeline,
    // Feedback
    recordRating,
    recordCorrection,
    recordOutcome,
    getFeedback,
    getFeedbackStats,
    getLearnings,
    // Settings
    getLLMSettings,
    updateLLMSettings,
    // Pipeline
    startPipeline,
    getPipeline,
    listPipelines,
    executeNextStep,
    approveStep,
    rejectStep,
    editArtifact,
    commentOnArtifact,
    chatWithArtifact,
};

export default api;

// ============================================================================
// Pipeline API Functions
// ============================================================================

async function startPipeline(data: StartPipelineRequest): Promise<ApiResponse<PipelineState>> {
    const response = await apiClient.post<ApiResponse<PipelineState>>('/api/pipeline/start', data);
    return response.data;
}

async function getPipeline(id: string): Promise<ApiResponse<PipelineState>> {
    const response = await apiClient.get<ApiResponse<PipelineState>>(`/api/pipeline/${id}`);
    return response.data;
}

async function listPipelines(): Promise<ApiResponse<PipelineSummary[]>> {
    const response = await apiClient.get<ApiResponse<PipelineSummary[]>>('/api/pipeline');
    return response.data;
}

async function executeNextStep(id: string): Promise<ApiResponse<PipelineState>> {
    const response = await apiClient.post<ApiResponse<PipelineState>>(`/api/pipeline/${id}/next`);
    return response.data;
}

async function approveStep(id: string, stepId: string, notes?: string): Promise<ApiResponse<PipelineState>> {
    const response = await apiClient.post<ApiResponse<PipelineState>>(
        `/api/pipeline/${id}/step/${stepId}/approve`,
        { notes }
    );
    return response.data;
}

async function rejectStep(id: string, stepId: string, feedback?: string): Promise<ApiResponse<PipelineState>> {
    const response = await apiClient.post<ApiResponse<PipelineState>>(
        `/api/pipeline/${id}/step/${stepId}/reject`,
        { feedback }
    );
    return response.data;
}

async function editArtifact(id: string, stepId: string, data: EditArtifactRequest): Promise<ApiResponse<PipelineState>> {
    const response = await apiClient.put<ApiResponse<PipelineState>>(
        `/api/pipeline/${id}/step/${stepId}/artifact`,
        data
    );
    return response.data;
}

async function commentOnArtifact(
    id: string, stepId: string, data: CommentRequest
): Promise<ApiResponse<{ comment: ArtifactComment; pipeline: PipelineState }>> {
    const response = await apiClient.post<ApiResponse<{ comment: ArtifactComment; pipeline: PipelineState }>>(
        `/api/pipeline/${id}/step/${stepId}/comment`,
        data
    );
    return response.data;
}

export async function chatWithArtifact(data: ChatRequest): Promise<ChatResponse> {
    const response = await apiClient.post<ApiResponse<ChatResponse>>('/api/chat', data);
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Chat request failed');
    }
    return response.data.data;
}

