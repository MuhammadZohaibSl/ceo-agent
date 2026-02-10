/**
 * Status Store - Zustand store for global application status and counts
 * Provides optimistic updates for document counts
 */

import { create } from 'zustand';
import type { StatusResponse } from '@/types/api';

interface StatusState {
    // Application status from /api/status
    status: StatusResponse | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    setStatus: (status: StatusResponse) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;

    // Optimistic UI updates
    incrementDocCount: () => void;
    decrementDocCount: () => void;
    updateAvailableProviders: (count: number) => void;
}

export const useStatusStore = create<StatusState>((set) => ({
    status: null,
    isLoading: true,
    error: null,

    setStatus: (status) => set({ status, isLoading: false, error: null }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error, isLoading: false }),

    incrementDocCount: () => set((state) => {
        if (!state.status) return state;
        return {
            status: {
                ...state.status,
                rag: {
                    ...state.status.rag,
                    vectorStore: {
                        ...state.status.rag.vectorStore,
                        uniqueDocuments: (state.status.rag.vectorStore.uniqueDocuments || 0) + 1,
                    }
                }
            }
        };
    }),

    decrementDocCount: () => set((state) => {
        if (!state.status) return state;
        const current = state.status.rag.vectorStore.uniqueDocuments || 0;
        return {
            status: {
                ...state.status,
                rag: {
                    ...state.status.rag,
                    vectorStore: {
                        ...state.status.rag.vectorStore,
                        uniqueDocuments: Math.max(0, current - 1),
                    }
                }
            }
        };
    }),

    updateAvailableProviders: (count) => set((state) => {
        if (!state.status) return state;
        return {
            status: {
                ...state.status,
                llm: {
                    ...state.status.llm,
                    availableProviders: count,
                }
            }
        };
    }),
}));
