import type { Report } from './index';

export const reportByteLimit = 512 * 1024;
export const reportSizeMessage = 'The generated scan report exceeds the 512 KiB storage limit. Export JSON to keep this scan. Retrying this snapshot will not save it; rescan after the page changes.';
export const submissionSizeMessage = 'The scan upload exceeds the 512 KiB request limit. Export JSON to keep this scan. Retrying this snapshot will not save it; rescan after the page changes.';

/** PostgreSQL jsonb::text adds a space after every structural comma/colon.
 * Reports contain strings, booleans and integer scores, so key ordering does not affect byte length.
 * Count separators structurally: punctuation inside evidence strings is not whitespace overhead.
 */
export function reportStorageBytes(report: Report): number {
  function spaces(value: unknown): number {
    if (Array.isArray(value)) return Math.max(0, value.length - 1) + value.reduce((sum, item) => sum + spaces(item), 0);
    if (value && typeof value === 'object') {
      const values = Object.values(value).filter(item => item !== undefined);
      return values.length + Math.max(0, values.length - 1) + values.reduce<number>((sum, item) => sum + spaces(item), 0);
    }
    return 0;
  }
  return new TextEncoder().encode(JSON.stringify(report)).byteLength + spaces(report);
}

export class ReportSizeError extends Error {
  constructor(readonly bytes?: number) { super(reportSizeMessage); }
}
export function assertReportSize(report: Report): void {
  const bytes = reportStorageBytes(report);
  if (bytes > reportByteLimit) throw new ReportSizeError(bytes);
}
