import assert from 'node:assert/strict';
import { cp, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

test('web builds exclude the root environment file from public assets', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'web-env-'));
  const root = join(directory, 'packages/web');
  const secret = 'private-build-fixture-7845f03e';
  const environment = `API_URL=http://localhost:8080\nPRIVATE_SECRET=${secret}\n`;

  try {
    await cp(new URL('./src/env.ts', import.meta.url), join(root, 'src/env.ts'));
    await writeFile(join(directory, '.env'), environment);
    await writeFile(
      join(root, 'index.html'),
      '<html><body><script type="module" src="/src/env.ts"></script></body></html>',
    );
    await symlink(fileURLToPath(new URL('./node_modules', import.meta.url)), join(root, 'node_modules'), 'dir');
    await build({ root, configFile: false, logLevel: 'silent', build: { target: 'esnext' } });
    const output = join(root, 'dist');
    const names = await readdir(output, { recursive: true, withFileTypes: true });

    for (const entry of names) {
      if (!entry.isFile()) continue;
      const content = await readFile(join(entry.parentPath, entry.name), 'utf8');
      assert.equal(content.includes(secret), false, entry.name);
      assert.equal(content.includes(Buffer.from(environment).toString('base64')), false, entry.name);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
