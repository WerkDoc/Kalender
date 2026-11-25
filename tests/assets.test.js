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

test('Shift stamper bar HTML has required elements, buttons and close button', () => {
  const html = fs.readFileSync('index.html', 'utf8');

  // Verify bar and close button
  assert.ok(html.includes('id="shiftStamperBar"'), 'shiftStamperBar must exist');
  assert.ok(html.includes('id="stamperCloseBtn"'), 'stamperCloseBtn must exist');
  assert.ok(html.includes('class="stamper-close-btn"'), 'stamper-close-btn class must exist');

  // Verify all 6 required buttons (F, S, N, U, Frei, delete)
  const expectedShifts = ['frueh', 'spaet', 'nacht', 'urlaub', 'frei', 'delete'];
  expectedShifts.forEach((shift) => {
    assert.ok(
      html.includes(`data-shift="${shift}"`),
      `stamper button for shift "${shift}" must exist`
    );
  });
});

test('CSS enforces uniform round stamper buttons and safe-area-inset-bottom', () => {
  const css = fs.readFileSync('css/style.css', 'utf8');

  // Verify safe-area-inset-bottom usage for shift stamper and bottom nav
  assert.ok(css.includes('.shift-stamper-bar'), '.shift-stamper-bar rule must exist');
  assert.ok(
    /\.shift-stamper-bar[\s\S]*?env\(safe-area-inset-bottom/.test(css),
    '.shift-stamper-bar must respect safe-area-inset-bottom'
  );
  assert.ok(
    /\.bottom-nav[\s\S]*?env\(safe-area-inset-bottom/.test(css),
    '.bottom-nav must respect safe-area-inset-bottom'
  );

  // Verify stamper buttons uniform size and flexbox centering
  assert.ok(
    /\.stamper-btn\s*\{[\s\S]*?width:\s*40px/.test(css),
    '.stamper-btn must have width: 40px'
  );
  assert.ok(
    /\.stamper-btn\s*\{[\s\S]*?height:\s*40px/.test(css),
    '.stamper-btn must have height: 40px'
  );
  assert.ok(
    /\.stamper-btn\s*\{[\s\S]*?border-radius:\s*50%/.test(css),
    '.stamper-btn must have border-radius: 50%'
  );
  assert.ok(
    /\.stamper-btn\s*\{[\s\S]*?display:\s*flex/.test(css),
    '.stamper-btn must use display: flex'
  );
  assert.ok(
    /\.stamper-btn\s*\{[\s\S]*?align-items:\s*center/.test(css),
    '.stamper-btn must center vertically with align-items: center'
  );
  assert.ok(
    /\.stamper-btn\s*\{[\s\S]*?justify-content:\s*center/.test(css),
    '.stamper-btn must center horizontally with justify-content: center'
  );

  // Verify close button centering and round shape
  assert.ok(
    /\.stamper-close-btn\s*\{[\s\S]*?display:\s*flex/.test(css),
    '.stamper-close-btn must use display: flex'
  );
  assert.ok(
    /\.stamper-close-btn\s*\{[\s\S]*?align-items:\s*center/.test(css),
    '.stamper-close-btn must center vertically'
  );
  assert.ok(
    /\.stamper-close-btn\s*\{[\s\S]*?justify-content:\s*center/.test(css),
    '.stamper-close-btn must center horizontally'
  );
});

