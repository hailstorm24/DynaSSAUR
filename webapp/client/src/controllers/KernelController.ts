import { useKernelStore } from '../stores/kernelStore.ts';

/**
 * Initialize kernel — no-op stub for Phase 1a.
 */
export function initKernel(): void {
  // Phase 1a: no-op stub
  useKernelStore.getState().setStatus('idle');
}

/**
 * Queue a cell for execution — no-op stub for Phase 1a.
 */
export function queueCell(_cellId: string): void {
  // Phase 1a: no-op stub
}
