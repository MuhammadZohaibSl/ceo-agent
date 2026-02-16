'use client';

/**
 * Pipeline Store
 * Zustand store for managing multi-step analysis pipeline state
 */

import { create } from 'zustand';
import type { PipelineState, PipelineStep } from '@/types/api';

interface PipelineStoreState {
    // Pipeline data
    pipeline: PipelineState | null;
    activeStepIndex: number;

    // Loading/error states
    isStarting: boolean;
    isExecutingStep: boolean;
    isApproving: boolean;
    error: string | null;

    // Actions
    setPipeline: (pipeline: PipelineState | null) => void;
    setActiveStepIndex: (index: number) => void;
    setStarting: (value: boolean) => void;
    setExecutingStep: (value: boolean) => void;
    setApproving: (value: boolean) => void;
    setError: (error: string | null) => void;
    reset: () => void;

    // Derived helpers
    getActiveStep: () => PipelineStep | null;
    getCompletedSteps: () => number;
    getApprovedSteps: () => number;
    isAllApproved: () => boolean;
}

export const usePipelineStore = create<PipelineStoreState>((set, get) => ({
    // Initial state
    pipeline: null,
    activeStepIndex: 0,
    isStarting: false,
    isExecutingStep: false,
    isApproving: false,
    error: null,

    // Setters
    setPipeline: (pipeline) => set({
        pipeline,
        activeStepIndex: pipeline?.currentStepIndex ?? 0,
        error: null,
    }),

    setActiveStepIndex: (index) => set({ activeStepIndex: index }),
    setStarting: (value) => set({ isStarting: value }),
    setExecutingStep: (value) => set({ isExecutingStep: value }),
    setApproving: (value) => set({ isApproving: value }),
    setError: (error) => set({ error }),

    reset: () => set({
        pipeline: null,
        activeStepIndex: 0,
        isStarting: false,
        isExecutingStep: false,
        isApproving: false,
        error: null,
    }),

    // Helpers
    getActiveStep: () => {
        const { pipeline, activeStepIndex } = get();
        if (!pipeline) return null;
        return pipeline.steps[activeStepIndex] ?? null;
    },

    getCompletedSteps: () => {
        const { pipeline } = get();
        if (!pipeline) return 0;
        return pipeline.steps.filter(s =>
            s.status === 'completed' || s.status === 'approved'
        ).length;
    },

    getApprovedSteps: () => {
        const { pipeline } = get();
        if (!pipeline) return 0;
        return pipeline.steps.filter(s => s.status === 'approved').length;
    },

    isAllApproved: () => {
        const { pipeline } = get();
        if (!pipeline) return false;
        return pipeline.steps.every(s => s.status === 'approved');
    },
}));
