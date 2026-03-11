import { readFileSync, writeFileSync } from 'fs';
const c = readFileSync('src/public/css/style.css', 'utf8');

// Find profile-layout occurrences
let idx = 0;
while (true) {
  const found = c.indexOf('profile-layout', idx);
  if (found === -1) break;
  console.log('profile-layout at', found, ':', JSON.stringify(c.slice(found - 5, found + 60)));
  idx = found + 1;
}

// Find the responsive section for profile 
const mediaIdx = c.indexOf('@media (max-width: 640px)');
console.log('\n@media 640 at:', mediaIdx);
if (mediaIdx > -1) {
  console.log(JSON.stringify(c.slice(mediaIdx, mediaIdx + 800)));
}
