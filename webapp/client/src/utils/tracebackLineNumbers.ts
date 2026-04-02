/**
 * Extract the relevant user-code line number from a Python traceback string.
 * The traceback is assumed to have already been filtered by filterTraceback
 * (Pyodide-internal frames removed), so all remaining "File" lines are user code.
 * Returns the line number of the innermost (last) frame, or null if none found.
 */
export function extractErrorLine(traceback: string): number | null {
  const matches = [...traceback.matchAll(/File ".*?", line (\d+)/g)];
  if (matches.length === 0) return null;
  return parseInt(matches[matches.length - 1][1], 10);
}
