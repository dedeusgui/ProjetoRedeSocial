import { readFileSync, writeFileSync } from 'fs';

const p = 'src/public/js/features/profile/renderers.js';
let c = readFileSync(p, 'utf8');

// Fix the encoding artifact: 'Â\u00a0' -> ' ' (non-breaking space)
// The issue is that \u00a0 was read/written incorrectly
// Replace '5Â\u00a0MB' with '5 MB' (simple space is fine here)
c = c.replace(/5\u00c2\u00a0MB/g, '5\u00a0MB');
c = c.replace(/max 5[^\s"<]*MB/g, 'max 5 MB');

writeFileSync(p, c, 'utf8');
console.log('Fixed. Contains hint:', c.includes('max 5 MB'));
