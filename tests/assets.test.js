import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('PWA manifest.json has valid structure and existing icon files', () => {
  const manifestRaw = fs.readFileSync('manifest.json', 'utf8');
  const manifest = JSON.parse(manifestRaw);

  assert.equal(typeof manifest.name, 'string');
  assert.equal(typeof manifest.short_name, 'string');
  assert.equal(manifest.display, 'standalone');
  assert.ok(Array.isArray(manifest.icons));
  assert.ok(manifest.icons.length >= 2);

  manifest.icons.forEach((icon) => {
    assert.ok(fs.existsSync(icon.src), `Icon file ${icon.src} must exist`);
  });
});

test('Service Worker caches files that exist on disk', () => {
  const swContent = fs.readFileSync('sw.js', 'utf8');
  const match = swContent.match(/const ASSETS_TO_CACHE = (\[[\s\S]*?\]);/);
  assert.ok(match, 'ASSETS_TO_CACHE must be defined in sw.js');

  const assets = eval(match[1]);
  assets.forEach((asset) => {
    if (asset === './') return; // root
    const cleanPath = asset.replace(/^\.\//, '');
    assert.ok(fs.existsSync(cleanPath), `Asset ${asset} (${cleanPath}) in sw.js must exist on disk`);
  });
});

test('index.html contains all IDs used by app.js', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const appJs = fs.readFileSync('js/app.js', 'utf8');

  // Find all document.getElementById('...') in app.js
  const idMatches = [...appJs.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)];
  assert.ok(idMatches.length > 10, 'app.js should query elements by ID');

  const missingIds = [];
  idMatches.forEach((m) => {
    const id = m[1];
    if (!html.includes(`id="${id}"`)) {
      missingIds.push(id);
    }
  });

  assert.deepEqual(missingIds, [], `All IDs queried in app.js must exist in index.html`);
});
