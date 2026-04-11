#!/usr/bin/env node
function hexToRGB(hex) {
  hex = hex.replace('#','');
  return { r: parseInt(hex.substr(0,2),16)/255, g: parseInt(hex.substr(2,2),16)/255, b: parseInt(hex.substr(4,2),16)/255 };
}
function rgbToHex(r,g,b) { return '#'+[r,g,b].map(c=>Math.round(Math.max(0,Math.min(255,c*255))).toString(16).padStart(2,'0')).join(''); }
function rgbToHSL(r,g,b) {
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;
  if(max===min){h=s=0}else{const d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);
  switch(max){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break}}
  return{h:h*360,s,l};
}
function hslToRGB(h,s,l) {
  h/=360;const a=s*Math.min(l,1-l);
  const f=n=>{const k=(n+h*12)%12;return l-a*Math.max(Math.min(k-3,9-k,1),-1)};
  return{r:f(0),g:f(8),b:f(4)};
}

const STEPS = [50,100,200,300,400,500,600,700,800,900,950];
const LIGHTNESS = [0.97,0.93,0.86,0.74,0.62,0.50,0.42,0.35,0.25,0.18,0.12];

const hex = process.argv[2];
const name = process.argv[3] || 'brand';
if (!hex) { console.log('Usage: node generate.js "#2563EB" [name]'); process.exit(0); }

const rgb = hexToRGB(hex);
const hsl = rgbToHSL(rgb.r, rgb.g, rgb.b);

console.log(`:root {`);
STEPS.forEach((step, i) => {
  const adjustedL = LIGHTNESS[i];
  const adjustedS = hsl.s * (adjustedL > 0.5 ? 0.9 : 1.1); // Slightly desaturate lights, saturate darks
  const c = hslToRGB(hsl.h, Math.min(1, adjustedS), adjustedL);
  console.log(`  --color-${name}-${step}: ${rgbToHex(c.r, c.g, c.b)};`);
});
console.log(`}`);
