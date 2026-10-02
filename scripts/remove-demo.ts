// Deletes every listing file marked "demo": true (and the demo place intro). Run: npm run demo:remove
import { readFileSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { listingFiles } from '../src/lib/fs-listings';

let n = 0;
for (const f of listingFiles()) {
  if (JSON.parse(readFileSync(f, 'utf8')).demo === true) {
    rmSync(f);
    n++;
    const dir = dirname(f);
    if (readdirSync(dir).length === 0) {
      rmSync(dir, { recursive: true });
      const place = join('src/content/places', dir.split(/[\\/]/).slice(-2).join('/') + '.md');
      rmSync(place, { force: true });
    }
  }
}
console.log(`Removed ${n} demo listing(s).`);
