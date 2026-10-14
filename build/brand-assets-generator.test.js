import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
function fixture(run) {
  const temporary = mkdtempSync(join(tmpdir(), 'colorfetti-icons-'));
  try {
    for (const directory of ['build', 'src/assets', 'public']) mkdirSync(join(temporary, directory), { recursive: true });
    for (const file of ['build/brand-assets.mjs', 'src/assets/logo.svg']) copyFileSync(join(repository, file), join(temporary, file));
    const generate = (...args) => spawnSync(process.execPath, [join(temporary, 'build/brand-assets.mjs'), ...args], { encoding: 'utf8' });
    expect(generate().status).toBe(0);
    run(temporary, generate);
  } finally {
    // Delete only the unique directory returned by mkdtemp under the OS temp root.
    expect(resolve(temporary).startsWith(resolve(tmpdir()) + '/') || resolve(temporary).startsWith(resolve(tmpdir()) + '\\')).toBe(true);
    rmSync(temporary, { recursive: true, force: true });
  }
}

describe('icon generator reproducibility', () => {
  it('verifies a Windows CRLF checkout without rewriting assets', () => fixture((root, generate) => {
    const files = ['src/assets/logo.svg', 'src/assets/logo-dark.svg', 'public/favicon.svg', 'public/favicon-light.svg', 'public/favicon-dark.svg', 'public/safari-pinned-tab.svg'];
    for (const file of files) {
      const path = join(root, file);
      writeFileSync(path, readFileSync(path, 'utf8').replace(/\r?\n/g, '\r\n'));
    }
    const before = files.map(file => readFileSync(join(root, file)));
    const result = generate('--check');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Verified 23 exports');
    for (const [index, file] of files.entries()) expect(readFileSync(join(root, file))).toEqual(before[index]);
  }));

  it('still rejects stale SVG artwork and changed binary bytes', () => fixture((root, generate) => {
    const svg = join(root, 'public/favicon-light.svg'), original = readFileSync(svg);
    writeFileSync(svg, original.toString().replace('#F47A34', '#F47A35'));
    const stale = generate('--check');
    expect(stale.status).not.toBe(0);
    expect(stale.stderr).toContain('public/favicon-light.svg is out of date');
    writeFileSync(svg, original);
    const png = join(root, 'public/favicon-16x16.png'), bytes = readFileSync(png);
    bytes[bytes.length - 1] ^= 1;
    writeFileSync(png, bytes);
    const changed = generate('--check');
    expect(changed.status).not.toBe(0);
    expect(changed.stderr).toContain('public/favicon-16x16.png is out of date');
  }));

  it('rejects an unknown browser QA engine before loading dependencies or writing results', () => {
    const result = spawnSync(process.execPath, [join(repository, 'bench/brand-icons-qa.mjs')], {
      encoding: 'utf8', env: { ...process.env, ENGINE: 'typo', PLAYWRIGHT_MODULE: 'missing-qa-dependency', SHARP_MODULE: 'missing-qa-dependency' },
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Unsupported ENGINE "typo"');
  });
});
