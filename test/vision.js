const R = require('../src/engine.js');
function gauss() { return (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.7; }
for (const noise of [8, 16, 24]) {
  let bad = 0, perfect = 0, N = 300;
  for (let t = 0; t < N; t++) {
    const base = R.colorsFromState(R.applyAlg(R.SOLVED(), R.scramble(25)));
    const warm = (Math.random() - 0.5) * 30; // cambio de temperatura de color global
    const faceLight = [0, 1, 2, 3, 4, 5].map(() => 0.65 + Math.random() * 0.5);
    const rgb = base.map((c, i) => {
      const L = faceLight[Math.floor(i / 9)] * (0.93 + Math.random() * 0.14);
      const p = R.STD_PALETTE[c];
      return [p[0] * L + warm + gauss() * noise, p[1] * L + gauss() * noise, p[2] * L - warm + gauss() * noise].map((v) => Math.max(0, Math.min(255, Math.round(v))));
    });
    const res = R.classifyColors(rgb);
    const wrong = res.colors.filter((c, i) => c !== base[i]).length;
    bad += wrong; if (!wrong) perfect++;
  }
  console.log('ruido σ=' + noise, '→ pegatinas mal:', (bad / N).toFixed(2), 'por cubo; cubos perfectos:', perfect + '/' + N);
}
