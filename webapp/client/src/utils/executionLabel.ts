import type { CellStatus } from '../models/CellModel.ts';

export function executionLabel(status: CellStatus, count: number | null): string {
  if (status === 'running') return '[*]';
  if (count !== null) return `[${count}]`;
  return '[ ]';
}
