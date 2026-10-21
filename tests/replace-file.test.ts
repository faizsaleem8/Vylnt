import { expect, it } from 'vitest';
import { replaceFile } from '../apps/server/replace-file';
it('retries transient destination locks without deleting the original or hiding permanent failures', async () => {
  let attempts = 0;
  await replaceFile('temporary', 'saved', async () => { if (++attempts < 3) throw Object.assign(new Error('Locked'), { code: 'EPERM' }); });
  expect(attempts).toBe(3);
  attempts = 0;
  await expect(replaceFile('temporary', 'saved', async () => { attempts++; throw Object.assign(new Error('Missing source'), { code: 'ENOENT' }); })).rejects.toThrow('Missing source');
  expect(attempts).toBe(1);
});
