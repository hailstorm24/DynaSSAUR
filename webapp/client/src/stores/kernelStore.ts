import { create } from 'zustand';
import type { KernelStatus } from '../models/KernelModel.ts';

interface KernelState {
  status: KernelStatus;
  queue: string[];
  setStatus: (status: KernelStatus) => void;
  enqueue: (cellId: string) => void;
  dequeue: () => void;
  clearQueue: () => void;
}

export const useKernelStore = create<KernelState>((set) => ({
  status: 'idle',
  queue: [],

  setStatus: (status) => set({ status }),

  enqueue: (cellId) => {
    set((state) => ({ queue: [...state.queue, cellId] }));
  },

  dequeue: () => {
    set((state) => ({ queue: state.queue.slice(1) }));
  },

  clearQueue: () => set({ queue: [] }),
}));
