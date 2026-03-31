export type KernelStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface KernelModel {
  status: KernelStatus;
  queue: string[];
}
