import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
try {
  await writeFile('.env', `VYLNT_STORAGE=local\nVYLNT_API_TOKEN=${randomBytes(32).toString('hex')}\nHOST=127.0.0.1\nPORT=4318\nVYLNT_DATA_FILE=.local/scans.json\n`, { flag: 'wx', mode: 0o600 });
  console.log('Created ignored .env with a random API token. Open that file locally to copy the token into the dashboard or extension; it is not printed to logs.');
} catch (error) { if (error.code === 'EEXIST') console.log('.env already exists; left unchanged.'); else throw error; }
