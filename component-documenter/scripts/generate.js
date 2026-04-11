#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function extractProps(content, fileName) {
  const componentName = path.basename(fileName, path.extname(fileName));
  const props = [];

  // Match interface/type Props
  const propsMatch = content.match(/(?:interface|type)\s+\w*Props\w*\s*(?:=\s*)?{([^}]+)}/s);
  if (propsMatch) {
    const propsBlock = propsMatch[1];
    const lines = propsBlock.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
    lines.forEach(line => {
      const match = line.match(/^\s*(\w+)(\??):?\s*([^;/]+)?/);
      if (match) {
        const [, name, optional, type] = match;
        const commentMatch = line.match(/\/\/\s*(.+)/);
        props.push({
          name,
          required: !optional,
          type: (type || 'unknown').trim(),
          description: commentMatch ? commentMatch[1].trim() : '',
        });
      }
    });
  }

  // Match default props
  const defaults = {};
  const defaultMatch = content.match(/(?:defaultProps|=\s*{)([^}]+)}/);
  if (defaultMatch) {
    defaultMatch[1].split(',').forEach(line => {
      const m = line.match(/(\w+)\s*[=:]\s*(.+)/);
      if (m) defaults[m[1].trim()] = m[2].trim();
    });
  }

  return { componentName, props, defaults };
}

function formatMarkdown({ componentName, props, defaults }) {
  let md = `## ${componentName}\n\n`;
  if (props.length === 0) {
    md += 'No typed props detected.\n';
    return md;
  }
  md += '| Prop | Type | Required | Default | Description |\n';
  md += '|------|------|----------|---------|-------------|\n';
  props.forEach(p => {
    const def = defaults[p.name] || '—';
    md += `| ${p.name} | \`${p.type}\` | ${p.required ? 'Yes' : 'No'} | ${def} | ${p.description} |\n`;
  });
  return md;
}

const target = process.argv[2];
if (!target) { console.log('Usage: node document.js <Component.tsx|dir/>'); process.exit(0); }

const stat = fs.statSync(target);
const files = stat.isDirectory()
  ? fs.readdirSync(target).filter(f => /\.(tsx|jsx)$/.test(f)).map(f => path.join(target, f))
  : [target];

let output = '# Component Documentation\n\n';
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf-8');
  const data = extractProps(content, f);
  output += formatMarkdown(data) + '\n---\n\n';
});

const outputFile = process.argv.includes('--output') ? process.argv[process.argv.indexOf('--output') + 1] : null;
if (outputFile) { fs.writeFileSync(outputFile, output); console.log(`Documentation written to ${outputFile}`); }
else console.log(output);
