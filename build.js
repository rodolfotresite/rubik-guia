// Une engine.js + app.template.html en dist/artifact.html (fragmento para Artifact) y dist/index.html (página completa).
const fs = require('fs'), path = require('path');
const src = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const engine = src('engine.js');
if (engine.includes('</script>')) throw new Error('engine.js contiene </script>');
const frag = src('app.template.html').replace('/*ENGINE*/', () => engine);
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'artifact.html'), frag);
const full = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#2352d8">
<style>:root{color-scheme:light}html,body{margin:0}[hidden]{display:none!important}</style></head><body>
${frag}
</body></html>`;
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), full);
console.log('dist/artifact.html', fs.statSync(path.join(__dirname, 'dist', 'artifact.html')).size, 'bytes');
console.log('dist/index.html', fs.statSync(path.join(__dirname, 'dist', 'index.html')).size, 'bytes');
