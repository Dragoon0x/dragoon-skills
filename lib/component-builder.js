'use strict';

// component scaffold templates per framework.
// each takes a context object and returns rendered files.
// templates intentionally use minimal styling and reference manifest tokens
// (radius, spacing, palette) so generated components match codebase style.

const { render } = require('./codegen');

// react + tailwind
const REACT_TAILWIND = `import React from 'react';

type {{ name }}Props = {
  children?: React.ReactNode;
  className?: string;
};

export function {{ name }}({ children, className = '' }: {{ name }}Props) {
  return (
    <div className={\`{{ tailwindClasses }} \${className}\`}>
      {children}
    </div>
  );
}
`;

// react + css modules
const REACT_CSS_MODULES = `import React from 'react';
import styles from './{{ name }}.module.css';

type {{ name }}Props = {
  children?: React.ReactNode;
  className?: string;
};

export function {{ name }}({ children, className = '' }: {{ name }}Props) {
  return (
    <div className={\`\${styles.root} \${className}\`}>
      {children}
    </div>
  );
}
`;

const REACT_CSS_MODULES_CSS = `.root {
  padding: {{ spacingPx }}px;
  border-radius: {{ radiusPx }}px;
  background: {{ bg }};
  color: {{ fg }};
}
`;

// react + plain css (no modules)
const REACT_PLAIN = `import React from 'react';

type {{ name }}Props = {
  children?: React.ReactNode;
  className?: string;
};

export function {{ name }}({ children, className = '' }: {{ name }}Props) {
  return (
    <div className={\`{{ kebab }} \${className}\`}>
      {children}
    </div>
  );
}
`;

const REACT_PLAIN_CSS = `.{{ kebab }} {
  padding: {{ spacingPx }}px;
  border-radius: {{ radiusPx }}px;
  background: {{ bg }};
  color: {{ fg }};
}
`;

// vue 3 SFC
const VUE_SFC = `<template>
  <div :class="\`{{ kebab }} \${className}\`">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ className?: string }>();
</script>

<style scoped>
.{{ kebab }} {
  padding: {{ spacingPx }}px;
  border-radius: {{ radiusPx }}px;
  background: {{ bg }};
  color: {{ fg }};
}
</style>
`;

// svelte
const SVELTE = `<script lang="ts">
  export let className: string = '';
</script>

<div class="{{ kebab }} {className}">
  <slot />
</div>

<style>
  .{{ kebab }} {
    padding: {{ spacingPx }}px;
    border-radius: {{ radiusPx }}px;
    background: {{ bg }};
    color: {{ fg }};
  }
</style>
`;

// generate component files based on stack and manifest hints.
// returns: [{ relPath, content }, ...]
function generate({ name, kebab, framework, styling, language, dir, manifest }) {
  // pull token defaults from manifest, with safe fallbacks
  const grid = (manifest && manifest.rules && manifest.rules.spacingGrid) || 8;
  const radii = (manifest && manifest.tokens && manifest.tokens.radius && manifest.tokens.radius.values) || [];
  const palette = (manifest && manifest.tokens && manifest.tokens.color && manifest.tokens.color.palette) || [];
  const spacingPx = grid * 2; // 16 by default
  const radiusPx = radii.length > 0 ? Math.round(radii[0].px) : grid;
  const bg = palette.find(p => p.role === 'background')?.value || '#ffffff';
  const fg = palette.find(p => p.role === 'foreground')?.value || '#0a0a0a';

  // pick a small set of tailwind classes that map to detected tokens
  // p-{n} where n*4 ≈ grid*2; rounded variant from radius
  const padN = Math.max(1, Math.round((grid * 2) / 4));
  let roundedClass = 'rounded-md';
  if (radiusPx <= 2) roundedClass = 'rounded-sm';
  else if (radiusPx <= 6) roundedClass = 'rounded-md';
  else if (radiusPx <= 8) roundedClass = 'rounded-lg';
  else if (radiusPx <= 12) roundedClass = 'rounded-xl';
  else if (radiusPx <= 16) roundedClass = 'rounded-2xl';
  else roundedClass = 'rounded-3xl';
  const tailwindClasses = `p-${padN} ${roundedClass}`;

  const ctx = { name, kebab, spacingPx, radiusPx, bg, fg, tailwindClasses };
  const ext = (language === 'typescript') ? 'tsx' : 'jsx';
  const out = [];

  if (framework === 'vue' || framework === 'nuxt') {
    out.push({ relPath: `${dir}/${name}.vue`, content: render(VUE_SFC, ctx) });
  } else if (framework === 'svelte' || framework === 'sveltekit') {
    out.push({ relPath: `${dir}/${name}.svelte`, content: render(SVELTE, ctx) });
  } else if ((styling || []).includes('tailwind')) {
    out.push({ relPath: `${dir}/${name}.${ext}`, content: render(REACT_TAILWIND, ctx) });
  } else if ((styling || []).includes('css-modules')) {
    out.push({ relPath: `${dir}/${name}.${ext}`, content: render(REACT_CSS_MODULES, ctx) });
    out.push({ relPath: `${dir}/${name}.module.css`, content: render(REACT_CSS_MODULES_CSS, ctx) });
  } else {
    out.push({ relPath: `${dir}/${name}.${ext}`, content: render(REACT_PLAIN, ctx) });
    out.push({ relPath: `${dir}/${name}.css`, content: render(REACT_PLAIN_CSS, ctx) });
  }

  return out;
}

module.exports = { generate };
