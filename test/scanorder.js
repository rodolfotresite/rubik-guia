const R = require('../src/engine.js');
const st = R.applyAlg(R.SOLVED(), R.scramble(25));
const base = R.colorsFromState(st);
// Lo que ve la cámara = pegatinas en las posiciones de la cara F (18..26) tras girar el cubo entero
const view = (rots) => { const s = R.applyAlg(st, rots); return R.colorsFromState(s).slice(18, 27); };
const steps = [[2, []], [1, ['y']], [5, ['y', 'y']], [4, ['y', 'y', 'y']], [0, ["x'"]], [3, ["x'", "x'", "x'"]]];
const colors = new Array(54);
for (const [f, rots] of steps) view(rots).forEach((c, k) => { colors[f * 9 + k] = c; });
console.log('Mapeo de escaneo correcto:', colors.every((c, i) => c === base[i]));
if (!colors.every((c, i) => c === base[i])) {
  for (let f = 0; f < 6; f++) console.log(R.FACES[f], base.slice(f * 9, f * 9 + 9).join(''), colors.slice(f * 9, f * 9 + 9).join(''));
}
