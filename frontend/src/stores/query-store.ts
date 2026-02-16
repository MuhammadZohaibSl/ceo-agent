/**
 * Query Store - Zustand store for query state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnalysisResult, Constraints } from '@/types/api';

interface QueryState {
    // Current query
    query: string;
    constraints: Constraints;

    // Analysis result
    currentResult: AnalysisResult | null;
    isAnalyzing: boolean;
    error: string | null;

    // History (last 10 queries)
    history: Array<{
        id: string;
        query: string;
        timestamp: string;
        result: AnalysisResult;
    }>;

    // Actions
    setQuery: (query: string) => void;
    setConstraints: (constraints: Constraints) => void;
    updateConstraint: <K extends keyof Constraints>(key: K, value: Constraints[K]) => void;
    setResult: (result: AnalysisResult) => void;
    setIsAnalyzing: (isAnalyzing: boolean) => void;
    setError: (error: string | null) => void;
    clearAll: () => void;
    editResultArtifact: (sectionId: string, lineIndex: number, content: string, initialContent?: string) => void;
    addResultComment: (sectionId: string, lineIndex: number, text: string, initialContent?: string) => void;
}

export const useQueryStore = create<QueryState>()(
    persist(
        (set, get) => ({
            // Initial state
            query: '',
            constraints: {
                budgetLimit: undefined,
                timeHorizon: undefined,
                riskTolerance: undefined,
            },
            currentResult: null,
            isAnalyzing: false,
            error: null,
            history: [],

            // Actions
            setQuery: (query) => set({ query }),

            setConstraints: (constraints) => set({ constraints }),

            updateConstraint: (key, value) =>
                set((state) => ({
                    constraints: { ...state.constraints, [key]: value },
                })),

            setResult: (result) => {
                const state = get();
                const historyEntry = {
                    id: result.id,
                    query: state.query,
                    timestamp: new Date().toISOString(),
                    result,
                };

                set({
                    currentResult: result,
                    isAnalyzing: false,
                    error: null,
                    history: [historyEntry, ...state.history].slice(0, 10),
                });
            },

            setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing, error: null }),

            setError: (error) => set({ error, isAnalyzing: false }),

            clearAll: () => set({
                query: '',
                constraints: {},
                currentResult: null,
                isAnalyzing: false,
                error: null,
            }),

            editResultArtifact: (sectionId, lineIndex, content, initialContent?: string) => {
                const state = get();
                if (!state.currentResult) return;

                const { currentResult } = state;
                const { proposal } = currentResult;
                const artifacts = { ...(proposal.artifacts || {}) };

                let artifact = artifacts[sectionId];

                // Initialize if missing
                if (!artifact) {
                    const rawContent = initialContent || '';

                    artifact = {
                        lines: rawContent.split('\n'),
                        edits: [],
                        comments: [],
                    };
                }

                const lines = [...artifact.lines];
                if (lineIndex >= lines.length) {
                    // Safety check/expand if needed
                    while (lines.length <= lineIndex) lines.push('');
                }
                const originalContent = lines[lineIndex];
                lines[lineIndex] = content;

                const newEdit = {
                    id: Math.random().toString(36).substring(2, 9),
                    lineIndex,
                    originalContent,
                    newContent: content,
                    editedAt: new Date().toISOString(),
                };

                set({
                    currentResult: {
                        ...currentResult,
                        proposal: {
                            ...proposal,
                            artifacts: {
                                ...artifacts,
                                [sectionId]: {
                                    ...artifact,
                                    lines,
                                    edits: [...artifact.edits, newEdit],
                                },
                            },
                        },
                    },
                });
            },

            addResultComment: (sectionId, lineIndex, text, initialContent?: string) => {
                const state = get();
                if (!state.currentResult) return;

                const { currentResult } = state;
                const { proposal } = currentResult;
                const artifacts = { ...(proposal.artifacts || {}) };

                let artifact = artifacts[sectionId];
                if (!artifact) {
                    const rawContent = initialContent || '';

                    artifact = {
                        lines: rawContent.split('\n'),
                        edits: [],
                        comments: [],
                    };
                }

                const newComment = {
                    id: Math.random().toString(36).substring(2, 9),
                    lineIndex,
                    text,
                    author: 'CEO',
                    createdAt: new Date().toISOString(),
                    resolved: false,
                };

                set({
                    currentResult: {
                        ...currentResult,
                        proposal: {
                            ...proposal,
                            artifacts: {
                                ...artifacts,
                                [sectionId]: {
                                    ...artifact,
                                    comments: [...artifact.comments, newComment],
                                },
                            },
                        },
                    },
                });
            },
        }),
        {
            name: 'ceo-agent-query-store',
            partialize: (state) => ({
                history: state.history,
                constraints: state.constraints,
            }),
        }
    )
);
