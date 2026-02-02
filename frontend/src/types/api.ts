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
    healthy: boolean;
    model: string;
    latency: number;
    errorCount: number;
    lastUsed: string | null;
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
