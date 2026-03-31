/**
 * Remove Pyodide-internal frames from a traceback so only user-code lines appear.
 * Accepts and returns an array of individual lines (no trailing newlines required).
 */
export function filterTraceback(lines: string[]): string[] {
  return lines.filter(
    (line) => !line.includes('<pyodide>') && !line.includes('pyodide/'),
  );
}
