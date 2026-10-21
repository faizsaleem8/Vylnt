import { rename } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';

/** Windows indexers/virus scanners can briefly hold the destination open.
 * Preserve atomic replacement; never delete the original as a fallback. */
export async function replaceFile(source: string, destination: string, move = rename): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try { await move(source, destination); return; }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (attempt >= 4 || !['EPERM', 'EACCES', 'EBUSY'].includes(code ?? '')) throw error;
      await setTimeout(50 * 2 ** attempt);
    }
  }
}
