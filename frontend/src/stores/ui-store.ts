/**
 * UI Store - Zustand store for UI state management
 */

import { create } from 'zustand';

interface UIState {
    // Sidebar
    sidebarOpen: boolean;
    sidebarTab: 'analysis' | 'documents' | 'approvals';

    // Modals
    isDocumentModalOpen: boolean;
    isApprovalModalOpen: boolean;
    selectedApprovalId: string | null;

    // Theme (for future dark/light mode)
    theme: 'dark' | 'light';

    // Actions
    toggleSidebar: () => void;
    setSidebarTab: (tab: UIState['sidebarTab']) => void;
    openDocumentModal: () => void;
    closeDocumentModal: () => void;
    openApprovalModal: (approvalId: string) => void;
    closeApprovalModal: () => void;
    setTheme: (theme: UIState['theme']) => void;
}

export const useUIStore = create<UIState>()((set) => ({
    // Initial state
    sidebarOpen: true,
    sidebarTab: 'analysis',
    isDocumentModalOpen: false,
    isApprovalModalOpen: false,
    selectedApprovalId: null,
    theme: 'dark',

    // Actions
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    setSidebarTab: (tab) => set({ sidebarTab: tab }),

    openDocumentModal: () => set({ isDocumentModalOpen: true }),

    closeDocumentModal: () => set({ isDocumentModalOpen: false }),

    openApprovalModal: (approvalId) => set({
        isApprovalModalOpen: true,
        selectedApprovalId: approvalId
    }),

    closeApprovalModal: () => set({
        isApprovalModalOpen: false,
        selectedApprovalId: null
    }),

    setTheme: (theme) => set({ theme }),
}));
