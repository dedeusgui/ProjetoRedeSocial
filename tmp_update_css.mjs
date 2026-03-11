import { readFileSync, writeFileSync } from 'fs';

const cssPath = 'src/public/css/style.css';
const css = readFileSync(cssPath, 'utf8');

// The old profile-hero override in media queries (LF-based based on what we saw)
const oldHeroOverride = [
  '  .profile-hero {',
  '    grid-template-columns: 1fr;',
  '  }',
  '',
  '  .profile-layout {',
  '    grid-template-columns: 1fr;',
  '  }',
  '',
  '  .profile-avatar-shell {',
  '    justify-content: flex-start;',
  '  }',
  '',
  '  .profile-avatar-image {',
  '    width: 120px;',
  '    height: 120px;',
  '  }',
  '',
  '  .profile-meta-grid {',
  '    grid-template-columns: 1fr;',
  '  }',
].join('\n');

const newHeroOverride = [
  '  .profile-hero {',
  '    grid-template-columns: 1fr;',
  '  }',
  '',
  '  .profile-avatar-shell {',
  '    align-items: flex-start;',
  '  }',
  '',
  '  .profile-avatar-image {',
  '    width: 96px;',
  '    height: 96px;',
  '  }',
  '',
  '  .profile-meta-grid {',
  '    grid-template-columns: 1fr;',
  '  }',
  '',
  '  .profile-panels {',
  '    grid-template-columns: 1fr;',
  '  }',
].join('\n');

if (!css.includes(oldHeroOverride)) {
  console.error('Media-query block not found. Trying alternatives...');
  // Show what the profile-hero area looks like in media:
  const idx = css.indexOf('.profile-hero {');
  console.log('profile-hero occurrences:');
  let pos = 0;
  while (true) {
    const f = css.indexOf('.profile-hero {', pos);
    if (f === -1) break;
    console.log(' at', f, ':', JSON.stringify(css.slice(f, f+80)));
    pos = f + 1;
  }
  process.exit(1);
}

const newCss = css.replace(oldHeroOverride, newHeroOverride);
writeFileSync(cssPath, newCss, 'utf8');
console.log('Media queries updated OK');
