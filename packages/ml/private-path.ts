import { isAbsolute, relative, resolve, sep } from 'node:path';

/** Prevent accidental review/dataset exports into application source or public assets.
 * This is a developer workflow guard, not an OS sandbox or identity attestation. */
export function assertPrivateMlPath(path: string, workspace = process.cwd()): string {
  const target = resolve(path), rel = relative(resolve(workspace), target);
  const parts = rel.split(sep);
  if (isAbsolute(rel) || parts[0] === '..') return target; // Explicit external private location.
  if (parts[0] === '.local' || (parts[0] === 'ml' && ['data', 'artifacts'].includes(parts[1]))) return target;
  throw new Error('Private ML outputs must use .local/, ml/data/, ml/artifacts/, or an explicit location outside the project.');
}
