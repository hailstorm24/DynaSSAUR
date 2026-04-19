import { create } from "zustand";

export type AppView = "upload" | "sandbox" | "assignment";

interface AppState {
  view: AppView;
  currentAssignmentId: string | null;
  openSandbox: () => void;
  openUpload: () => void;
  openAssignment: (id: string) => void;
  openSession: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "upload",
  currentAssignmentId: null,
  openSandbox: () => set({ view: "sandbox", currentAssignmentId: null }),
  openUpload: () => set({ view: "upload", currentAssignmentId: null }),
  openAssignment: (id) => set({ view: "assignment", currentAssignmentId: id }),
  openSession: () => set({ view: "assignment", currentAssignmentId: null }),
}));
