/**
 * CEO Agent API Types
 */

// API Response wrapper
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// Recommendation from the agent
export interface Recommendation {
    title: string;
    description: string;
    estimatedCost: number;
    timeToImplement: string;
    riskLevel: 'low' | 'medium' | 'high';
    score: number;
    rationale: string;
}

// Alternative option
export interface Alternative {
    id: string;
    rank: number;
    title: string;
    description: string;
    score: number;
    riskLevel: 'low' | 'medium' | 'high';
    tradeoffVsTop: string;
}

// Risk factor
export interface RiskFactor {
    type: string;
    description: string;
    probability: number;
    impact: number;
    mitigations: string[];
}

// Risk alert
export interface RiskAlert {
    optionId: string;
    optionTitle: string;
    level: 'warning' | 'critical';
    message: string;
}

// Risk assessment
export interface RiskAssessment {
    overallLevel: 'low' | 'medium' | 'high' | 'critical';
    factors: RiskFactor[];
    alerts: RiskAlert[];
}

// Decision proposal
export interface Proposal {
    recommendation: Recommendation;
    alternatives: Alternative[];
    risks: RiskAssessment;
    confidence: number;
    confidenceLevel: 'low' | 'moderate' | 'high' | 'very_high';
    requiresHumanApproval: boolean;
    approvalReason?: string;
    missingData?: string[];
    llmModel?: string;
    generatedAt?: string;
    artifacts?: Record<string, StepArtifact>; // Map of section ID to artifact data
}

// Analysis result
export interface AnalysisResult {
    id: string;
    proposal: Proposal;
    approvalRequest?: { id: string };
}

// Approval request
export interface ApprovalRequest {
    id: string;
    contextId: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    priority: 'low' | 'medium' | 'high' | 'critical';
    summary: string;
    createdAt: string;
    expiresAt: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    rejectionReason?: string;
}

// Approval stats
export interface ApprovalStats {
    pending: number;
    approved: number;
    rejected: number;
    expired: number;
}

// Agent status
export interface AgentStatus {
    ready: boolean;
    dependencies: Record<string, 'connected' | 'not_configured'>;
    config: {
        maxIterations: number;
        confidenceThreshold: number;
    };
}

// LLM provider status
export interface LLMProviderStatus {
    configured: boolean;
    model: string;
    health: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    score: number;
    available: boolean;
}

// LLM status
export interface LLMStatus {
    strategy: string;
    availableProviders: number;
    providers: Record<string, LLMProviderStatus>;
}

// Memory stats
export interface MemoryStats {
    shortTerm: { count: number; maxSize: number };
    longTerm: { count: number; maxSize: number };
}

// RAG stats
export interface RAGStats {
    vectorStore: {
        totalVectors: number;
        uniqueDocuments: number;
    };
}

// Full status response
export interface StatusResponse {
    agent: AgentStatus;
    llm: LLMStatus;
    memory: MemoryStats;
    rag: RAGStats;
}

// Document
export interface Document {
    id: string;
    name: string;
    type: string;
    path: string;
}

// Constraints for analysis
export interface Constraints {
    budgetLimit?: number;
    timeHorizon?: string;
    riskTolerance?: 'low' | 'medium' | 'high';
    [key: string]: string | number | boolean | undefined;
}

// Analysis request
export interface AnalyzeRequest {
    query: string;
    constraints?: Constraints;
}

// Approve request
export interface ApproveRequest {
    approver?: string;
    notes?: string;
}

// Reject request
export interface RejectRequest {
    approver?: string;
    reason: string;
}

// Upload document request
export interface UploadDocumentRequest {
    name: string;
    content: string;
    type?: 'md' | 'txt' | 'json';
}

// ============================================================================
// Feedback Types
// ============================================================================

// Feedback type enum
export type FeedbackType = 'rating' | 'correction' | 'preference' | 'outcome';

// Outcome status enum
export type OutcomeStatus = 'success' | 'partial_success' | 'failure' | 'abandoned' | 'unknown';

// Rating request
export interface RatingRequest {
    contextId: string;
    rating: 1 | 2 | 3 | 4 | 5;
    comment?: string;
    ratedBy?: string;
}

// Correction request
export interface CorrectionRequest {
    contextId: string;
    field: string;
    originalValue: unknown;
    correctedValue: unknown;
    reason?: string;
    correctedBy?: string;
}

// Outcome request
export interface OutcomeRequest {
    contextId: string;
    status: OutcomeStatus;
    metrics?: Record<string, number | string>;
    notes?: string;
    recordedBy?: string;
}

// Feedback item (returned from API)
export interface FeedbackItem {
    id: string;
    type: FeedbackType;
    contextId: string;
    timestamp: string;
    // Rating-specific
    rating?: number;
    comment?: string;
    ratedBy?: string;
    // Correction-specific
    field?: string;
    originalValue?: unknown;
    correctedValue?: unknown;
    reason?: string;
    correctedBy?: string;
    // Outcome-specific
    status?: OutcomeStatus;
    metrics?: Record<string, number | string>;
    notes?: string;
    recordedBy?: string;
}

// Feedback statistics
export interface FeedbackStats {
    totalFeedback: number;
    averageRating: number;
    outcomeDistribution: Record<OutcomeStatus, number>;
}

// Learning insights
export interface LearningInsights {
    commonCorrections: { field: string; count: number }[];
    preferencePatterns: Record<string, unknown>;
    successFactors: string[];
    improvementAreas: string[];
}

// ============================================================================
// Pipeline Types
// ============================================================================

export type PipelineStepStatus = 'pending' | 'running' | 'completed' | 'approved' | 'rejected';
export type PipelineStatus = 'active' | 'completed' | 'cancelled';

export interface StepResult {
    stepId: string;
    content: string;
    keyFindings: string[];
    risks: string[];
    recommendations: string[];
    score: number;
    provider?: string;
    generatedAt: string;
}

export interface ArtifactEdit {
    id: string;
    lineIndex: number;
    originalContent: string;
    newContent: string;
    editedAt: string;
}

export interface ArtifactComment {
    id: string;
    lineIndex: number;
    text: string;
    author: string;
    createdAt: string;
    resolved: boolean;
}

export interface StepArtifact {
    lines: string[];
    edits: ArtifactEdit[];
    comments: ArtifactComment[];
}

export interface ReviewFeedback {
    action: 'approved' | 'rejected';
    notes: string;
}

export interface PipelineStep {
    id: string;
    name: string;
    icon: string;
    description: string;
    status: PipelineStepStatus;
    result: StepResult | null;
    artifact: StepArtifact | null;
    reviewFeedback: ReviewFeedback | null;
    startedAt: string | null;
    completedAt: string | null;
    approvedAt: string | null;
}

export interface PipelineState {
    id: string;
    query: string;
    constraints: Constraints;
    status: PipelineStatus;
    currentStepIndex: number;
    steps: PipelineStep[];
    createdAt: string;
    updatedAt: string;
}

export interface PipelineSummary {
    id: string;
    query: string;
    status: PipelineStatus;
    currentStepIndex: number;
    completedSteps: number;
    totalSteps: number;
    createdAt: string;
    updatedAt: string;
}

export interface StartPipelineRequest {
    query: string;
    constraints?: Constraints;
    provider?: string;
}

export interface EditArtifactRequest {
    lineIndex: number;
    content: string;
}

export interface CommentRequest {
    lineIndex: number;
    text: string;
    author?: string;
}

// ============================================================================
// Chat API Types
// ============================================================================

export type ChatAction = 'explain' | 'refine' | 'edit' | 'general';

export interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
}

export interface ChatRequest {
    selectedText: string;
    action?: ChatAction;
    userMessage?: string;
    conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
    reply: string;
    provider: string;
    suggestedEdit: string | null;
    action: ChatAction;
    latencyMs: number;
    hasDocumentContext: boolean;
}
