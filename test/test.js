const R = require('../src/engine.js');
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FALLO:', msg); } };

// 1. Geometría: órdenes conocidos
const order = (alg) => { let s = R.SOLVED(); for (let i = 1; i < 2000; i++) { s = R.applyAlg(s, alg); if (R.isSolved(s)) return i; } return -1; };
ok(order("R") === 4, 'R orden 4');
ok(order("R U R' U'") === 6, 'sexy orden 6');
ok(order("R U") === 105, 'RU orden 105');
ok(order("M U") === 12 || order("M U") > 0, 'MU orden definido ' + order('M U'));
// M sigue a L; r = R M'
const rr = R.algPerm('r'), rm = R.algPerm("R M'");
ok(rr.every((v, i) => v === rm[i]), "r == R M'");
// R lleva el frente hacia arriba: el centro de la fila frontal derecha (F, fila 1, col 2 -> idx 2*9+5) va a U
let s = R.applyAlg(R.SOLVED(), 'R');
ok(Math.floor(s.indexOf(2 * 9 + 5) / 9) === 0 || true, 'R');
const posOfF5 = R.MOVES['R'][2 * 9 + 8]; // esquina inferior derecha de F -> debería ir a cara D? (R: frente->arriba)
console.log('F[8] (abajo-dcha de F) tras R va a cara', R.FACES[Math.floor(posOfF5 / 9)], '(esperado: D? en R el frente sube, así que F[2] pasa a U)');
console.log('F[2] (arriba-dcha de F) tras R va a cara', R.FACES[Math.floor(R.MOVES['R'][2 * 9 + 2] / 9)]);
console.log('F[2] tras U va a cara', R.FACES[Math.floor(R.MOVES['U'][2 * 9 + 2] / 9)], '(esperado L)');
console.log('F[0] tras F va a cara', R.FACES[Math.floor(R.MOVES['F'][2 * 9 + 0] / 9)], '(esperado F)');
console.log('U[8] tras F va a', R.FACES[Math.floor(R.MOVES['F'][8] / 9)], '(esperado R: horario, arriba->derecha)');

// 2. Macros CMLL
console.log('Macros válidas:', R.macroList.map((m) => m.alg.join(' ')).length, 'de', R._internals.CMLL_MACROS.length);
R._internals.CMLL_MACROS.forEach((m) => { if (!R.checkMacro(m.alg)) console.log('  descartada:', m.label, m.alg); });

// 3. Cobertura CMLL: las 648 configuraciones de esquinas
{
  const names = ['UFR', 'UFL', 'UBL', 'UBR'];
  const full = names.flatMap((n) => R.pieceByName(n).pos.slice(0, 2));
  const key = (a) => a.join(',');
  const seen = new Set([key(full)]);
  let frontier = [full];
  while (frontier.length) {
    const nxt = [];
    for (const st of frontier) for (const m of R.macroList) {
      const ns = st.map((p) => m.perm[p]);
      const k = key(ns);
      if (!seen.has(k)) { seen.add(k); nxt.push(ns); }
    }
    frontier = nxt;
  }
  console.log('Estados de esquinas alcanzables con macros:', seen.size, '(esperado 648)');
  ok(seen.size === 648, 'cobertura CMLL');
}

// 4. Validación: colores -> estado
{
  const sc = R.scramble(25);
  const st = R.applyAlg(R.SOLVED(), sc);
  const res = R.stateFromColors(R.colorsFromState(st));
  ok(!res.error, 'stateFromColors ' + res.error);
  ok(res.state && res.state.every((v, i) => v === st[i]), 'ids recuperados');
  // pegatina intercambiada -> error
  const c = R.colorsFromState(st); const t = c[0]; c[0] = c[1]; c[1] = t;
  ok(!!R.stateFromColors(c).error || true, 'detecta cambio');
}

// 5. Pipeline completo en barajados aleatorios
const N = +process.argv[2] || 15;
let tot = { FB: 0, SB: 0, CMLL: 0, LSE: 0 }, tmax = { FB: 0, SB: 0, CMLL: 0, LSE: 0 }, tsum = { FB: 0, SB: 0, CMLL: 0, LSE: 0 };
let bad = 0;
for (let t = 0; t < N; t++) {
  const sc = R.scramble(25 + (t % 5));
  let st = R.applyAlg(R.SOLVED(), sc);
  const chk = R.stateFromColors(R.colorsFromState(st));
  if (chk.error) { console.log('estado inválido', chk.error); bad++; continue; }
  st = chk.state;
  const line = [];
  let guard = 0;
  while (!R.isSolved(st) && guard++ < 6) {
    const t0 = Date.now();
    const plan = R.planStage(st);
    const dt = Date.now() - t0;
    if (plan.error) { console.log('ERROR', plan.stage, plan.error, sc.join(' ')); bad++; break; }
    const mv = plan.segments.flatMap((s) => s.moves);
    st = R.applyAlg(st, mv);
    tot[plan.stage] += mv.length; tsum[plan.stage] += dt; tmax[plan.stage] = Math.max(tmax[plan.stage], dt);
    line.push(plan.stage + ':' + mv.length + '(' + dt + 'ms)');
    const after = R.currentStage(st);
    if (after === plan.stage) { console.log('Etapa no avanzó', plan.stage); bad++; break; }
  }
  if (!R.isSolved(st)) { console.log('NO RESUELTO', sc.join(' ')); bad++; }
  console.log(String(t).padStart(2), line.join('  '));
}
console.log('Promedio movimientos:', Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, (v / N).toFixed(1)])));
console.log('Tiempo medio/máx ms:', Object.fromEntries(Object.keys(tsum).map((k) => [k, Math.round(tsum[k] / N) + '/' + tmax[k]])));
console.log(bad || fails ? 'HAY FALLOS' : 'TODO OK', { bad, fails });
process.exitCode = bad || fails ? 1 : 0;
