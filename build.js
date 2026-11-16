#!/usr/bin/env node
/* Junta src/style.css + src/js/*.js dentro de src/index.template.html
   e gera o jogo em um único arquivo: index.html
   Uso: node build.js */
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, 'src');
const css = fs.readFileSync(path.join(src, 'style.css'), 'utf8');
const js = fs.readdirSync(path.join(src, 'js')).filter((f) => f.endsWith('.js')).sort()
  .map((f) => fs.readFileSync(path.join(src, 'js', f), 'utf8')).join('\n');
const out = fs.readFileSync(path.join(src, 'index.template.html'), 'utf8')
  .replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
fs.writeFileSync(path.join(__dirname, 'index.html'), out);
console.log(`index.html gerado (${(out.length / 1024).toFixed(0)} KB)`);
