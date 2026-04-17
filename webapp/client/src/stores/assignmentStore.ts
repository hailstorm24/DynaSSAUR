import { create } from "zustand";
import type { NotebookData } from "../utils/notebookSerializer.ts";

export interface AssignmentEntry {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  notebookData: NotebookData;
}

const STORAGE_KEY = "dynassaur_assignments";

function generateId(): string {
  return `assignment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadFromStorage(): AssignmentEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(assignments: AssignmentEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}

interface AssignmentState {
  assignments: AssignmentEntry[];
  addAssignment: (title: string, notebookData: NotebookData) => string;
  updateAssignment: (id: string, notebookData: NotebookData) => void;
  removeAssignment: (id: string) => void;
  getAssignment: (id: string) => AssignmentEntry | undefined;
}

export const useAssignmentStore = create<AssignmentState>((set, get) => ({
  assignments: loadFromStorage(),

  addAssignment: (title, notebookData) => {
    const id = generateId();
    const now = Date.now();
    const entry: AssignmentEntry = { id, title, createdAt: now, updatedAt: now, notebookData };
    const assignments = [entry, ...get().assignments];
    set({ assignments });
    saveToStorage(assignments);
    return id;
  },

  updateAssignment: (id, notebookData) => {
    const assignments = get().assignments.map((a) =>
      a.id === id ? { ...a, notebookData, updatedAt: Date.now() } : a,
    );
    set({ assignments });
    saveToStorage(assignments);
  },

  removeAssignment: (id) => {
    const assignments = get().assignments.filter((a) => a.id !== id);
    set({ assignments });
    saveToStorage(assignments);
  },

  getAssignment: (id) => get().assignments.find((a) => a.id === id),
}));
