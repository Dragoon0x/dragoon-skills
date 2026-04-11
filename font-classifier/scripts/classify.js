#!/usr/bin/env node
const PAIRINGS = {
  'geometric-sans': ['transitional-serif', 'old-style-serif', 'geometric-mono'],
  'humanist-sans': ['transitional-serif', 'slab-serif', 'humanist-mono'],
  'neo-grotesque': ['didone-serif', 'old-style-serif', 'monospace'],
  'transitional-serif': ['geometric-sans', 'humanist-sans', 'neo-grotesque'],
  'old-style-serif': ['geometric-sans', 'neo-grotesque'],
  'slab-serif': ['humanist-sans', 'geometric-sans'],
};
const FONTS = {
  'Inter': 'geometric-sans', 'Geist Sans': 'geometric-sans', 'Plus Jakarta Sans': 'geometric-sans',
  'DM Sans': 'humanist-sans', 'Source Sans 3': 'humanist-sans', 'Nunito': 'humanist-sans',
  'Roboto': 'neo-grotesque', 'Helvetica': 'neo-grotesque', 'Arial': 'neo-grotesque',
  'Georgia': 'transitional-serif', 'Newsreader': 'transitional-serif', 'Source Serif 4': 'transitional-serif',
  'Garamond': 'old-style-serif', 'Cormorant': 'old-style-serif', 'Playfair Display': 'didone-serif',
  'Instrument Serif': 'old-style-serif', 'Libre Baskerville': 'transitional-serif',
  'Roboto Slab': 'slab-serif', 'Zilla Slab': 'slab-serif',
  'JetBrains Mono': 'geometric-mono', 'Geist Mono': 'geometric-mono', 'Fira Code': 'geometric-mono',
  'Space Mono': 'geometric-mono', 'IBM Plex Mono': 'humanist-mono',
};

const font = process.argv[2];
if (!font) { console.log('Usage: node classify.js "Font Name"'); process.exit(0); }
const classification = FONTS[font] || 'unknown';
const pairs = PAIRINGS[classification] || [];
const suggestions = Object.entries(FONTS).filter(([,c]) => pairs.includes(c)).map(([f]) => f);
console.log(`\nFont: ${font}\nClassification: ${classification}\nPairing suggestions:\n${suggestions.map(s => '  → ' + s).join('\n')}\n`);
