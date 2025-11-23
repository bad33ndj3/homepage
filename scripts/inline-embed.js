import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const htmlPath = path.join(distDir, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const cssHref = html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/i)?.[1];
const jsSrc = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/i)?.[1];

if (!cssHref || !jsSrc) {
  console.error('Could not find build CSS/JS tags to inline.');
  process.exit(1);
}

const css = fs.readFileSync(path.join(distDir, cssHref), 'utf8');
const js = fs.readFileSync(path.join(distDir, jsSrc), 'utf8');

const jsBase64 = Buffer.from(js, 'utf8').toString('base64');
const jsLoader =
  `<script type="module">(function(b){` +
  `const bin=atob(b);` +
  `const len=bin.length;` +
  `const bytes=new Uint8Array(len);` +
  `for(let i=0;i<len;i++){bytes[i]=bin.charCodeAt(i);}` +
  `const u=URL.createObjectURL(new Blob([bytes],{type:'text/javascript;charset=utf-8'}));` +
  `import(u);` +
  `})('${jsBase64}');</script>`;

const inlined = html
  .replace(/<link rel="stylesheet"[^>]*href="[^"]+"[^>]*>\s*/i, `<style>${css}</style>`)
  .replace(/<script[^>]*type="module"[^>]*src="[^"]+"[^>]*><\/script>/i, jsLoader);

fs.writeFileSync(htmlPath, inlined, 'utf8');
console.log('Inlined CSS and JS into dist/index.html for file:// usage.');
