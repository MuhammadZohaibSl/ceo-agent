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
    clearResult: () => void;
    clearAll: () => void;
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

            clearResult: () => set({ currentResult: null, error: null }),

            clearAll: () => set({
                query: '',
                constraints: {},
                currentResult: null,
                isAnalyzing: false,
                error: null,
            }),
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
