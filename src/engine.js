/* Motor del cubo de Rubik: modelo de pegatinas, solver por etapas Roux y visión de color.
   Sin dependencias. Funciona en navegador (window.Rubik) y en Node (module.exports). */
(function (root) {
  'use strict';

  // ───────────────────────── Geometría ─────────────────────────
  // Caras en orden URFDLB; 9 pegatinas por cara, en orden de lectura de la "cruz" estándar.
  const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
  const NORMALS = { U: [0, 1, 0], R: [1, 0, 0], F: [0, 0, 1], D: [0, -1, 0], L: [-1, 0, 0], B: [0, 0, -1] };

  const POS = []; // {p:[x,y,z], n:[nx,ny,nz]}
  for (let f = 0; f < 6; f++) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        let p;
        switch (f) {
          case 0: p = [-1 + c, 1, -1 + r]; break; // U
          case 1: p = [1, 1 - r, 1 - c]; break;   // R
          case 2: p = [-1 + c, 1 - r, 1]; break;  // F
          case 3: p = [-1 + c, -1, 1 - r]; break; // D
          case 4: p = [-1, 1 - r, -1 + c]; break; // L
          case 5: p = [1 - c, 1 - r, -1]; break;  // B
        }
        POS.push({ p, n: NORMALS[FACES[f]].slice() });
      }
    }
  }
  const keyOf = (p, n) => p.join(',') + '|' + n.join(',');
  const POS_INDEX = new Map(POS.map((s, i) => [keyOf(s.p, s.n), i]));

  function rot(v, axis, th) {
    const [x, y, z] = v;
    if (axis === 0) return th > 0 ? [x, -z, y] : [x, z, -y];
    if (axis === 1) return th > 0 ? [z, y, -x] : [-z, y, x];
    return th > 0 ? [-y, x, z] : [y, -x, z];
  }

  // axis: 0=x 1=y 2=z; th: giro de +90 (regla mano derecha) o -90. Horario visto desde la cara = -90 sobre su normal.
  const MOVE_SPEC = {
    U: [1, -1, (p) => p[1] === 1], D: [1, 1, (p) => p[1] === -1],
    R: [0, -1, (p) => p[0] === 1], L: [0, 1, (p) => p[0] === -1],
    F: [2, -1, (p) => p[2] === 1], B: [2, 1, (p) => p[2] === -1],
    M: [0, 1, (p) => p[0] === 0], E: [1, 1, (p) => p[1] === 0], S: [2, -1, (p) => p[2] === 0],
    r: [0, -1, (p) => p[0] >= 0], l: [0, 1, (p) => p[0] <= 0],
    u: [1, -1, (p) => p[1] >= 0], d: [1, 1, (p) => p[1] <= 0],
    f: [2, -1, (p) => p[2] >= 0], b: [2, 1, (p) => p[2] <= 0],
    x: [0, -1, () => true], y: [1, -1, () => true], z: [2, -1, () => true],
  };
  const AXIS_OF = { U: 1, D: 1, E: 1, u: 1, d: 1, y: 1, R: 0, L: 0, M: 0, r: 0, l: 0, x: 0, F: 2, B: 2, S: 2, f: 2, b: 2, z: 2 };

  const compose = (a, b) => a.map((_, i) => b[a[i]]); // primero a, luego b
  const invert = (a) => { const o = new Array(a.length); a.forEach((v, i) => { o[v] = i; }); return o; };

  const MOVES = {};
  for (const name of Object.keys(MOVE_SPEC)) {
    const [axis, th, pred] = MOVE_SPEC[name];
    const m = POS.map((s, i) => {
      if (!pred(s.p)) return i;
      return POS_INDEX.get(keyOf(rot(s.p, axis, th), rot(s.n, axis, th)));
    });
    MOVES[name] = m;
    MOVES[name + '2'] = compose(m, m);
    MOVES[name + "'"] = invert(m);
  }

  function parseAlg(s) {
    return String(s).trim().split(/\s+/).filter(Boolean).map((t) => (t.endsWith("2'") ? t.slice(0, -1) : t));
  }
  function algPerm(alg) {
    const list = Array.isArray(alg) ? alg : parseAlg(alg);
    let p = POS.map((_, i) => i);
    for (const t of list) {
      if (!MOVES[t]) throw new Error('Movimiento desconocido: ' + t);
      p = compose(p, MOVES[t]);
    }
    return p;
  }
  function invertAlg(alg) {
    const list = Array.isArray(alg) ? alg : parseAlg(alg);
    return list.slice().reverse().map((t) => (t.endsWith("'") ? t.slice(0, -1) : t.endsWith('2') ? t : t + "'"));
  }
  const SOLVED = () => POS.map((_, i) => i);
  function applyPerm(state, perm) {
    const out = new Array(54);
    for (let i = 0; i < 54; i++) out[perm[i]] = state[i];
    return out;
  }
  function applyAlg(state, alg) {
    const list = Array.isArray(alg) ? alg : parseAlg(alg);
    let s = state;
    for (const t of list) s = applyPerm(s, MOVES[t]);
    return s;
  }
  const isSolved = (state) => state.every((v, i) => v === i);

  // ───────────────────────── Piezas ─────────────────────────
  const CUBIES = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (!x && !y && !z) continue;
    const pos = [];
    POS.forEach((s, i) => { if (s.p[0] === x && s.p[1] === y && s.p[2] === z) pos.push(i); });
    const faces = pos.map((i) => Math.floor(i / 9)).sort((a, b) => a - b);
    CUBIES.push({ coord: [x, y, z], pos, faces, key: faces.join(''), type: pos.length === 3 ? 'corner' : pos.length === 2 ? 'edge' : 'center' });
  }
  const HOME_BY_KEY = {};
  CUBIES.forEach((c, i) => { c.index = i; HOME_BY_KEY[c.key] = c; });
  const CUBIE_AT = new Map(CUBIES.map((c) => [c.coord.join(','), c]));

  function pieceByName(name) { // p.ej. 'DL', 'DLF'
    const c = [0, 0, 0];
    for (const ch of name) NORMALS[ch].forEach((v, k) => { c[k] += v; });
    return CUBIE_AT.get(c.join(','));
  }
  const piecePos = (name) => pieceByName(name).pos;
  const pieceSolved = (state, name) => piecePos(name).every((i) => state[i] === i);
  const piecesSolved = (state, names) => names.every((n) => pieceSolved(state, n));

  const det3 = (a, b, c) =>
    a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);

  // ───────────── Colores escaneados → estado de pegatinas (ids) ─────────────
  // colors[i] ∈ 0..5 = "del color del centro de la cara k". Devuelve {state} o {error}.
  function stateFromColors(colors) {
    if (colors.length !== 54) return { error: 'Se necesitan 54 pegatinas.' };
    for (let f = 0; f < 6; f++) if (colors[f * 9 + 4] !== f) return { error: 'Los centros deben ser de 6 colores distintos.' };
    const counts = [0, 0, 0, 0, 0, 0];
    colors.forEach((c) => { counts[c]++; });
    if (counts.some((n) => n !== 9)) return { error: 'Cada color debe aparecer exactamente 9 veces (ahora: ' + counts.join('/') + ').' };
    const state = new Array(54);
    for (const slot of CUBIES) {
      const key = slot.pos.map((i) => colors[i]).sort((a, b) => a - b).join('');
      const home = HOME_BY_KEY[key];
      if (!home) return { error: 'Hay una pieza imposible (colores ' + key.split('').map((k) => FACES[k]).join('') + ' en ' + slot.faces.map((k) => FACES[k]).join('') + '). Revisa esa zona.', slot: slot.pos };
      for (const i of slot.pos) state[i] = home.pos.find((h) => Math.floor(h / 9) === colors[i]);
    }
    if (new Set(state).size !== 54) return { error: 'Hay piezas repetidas: algún color está mal leído.' };
    const err = validateState(state);
    if (err) return { error: err };
    return { state };
  }

  const parity = (perm) => {
    const seen = new Array(perm.length).fill(false);
    let swaps = 0;
    for (let i = 0; i < perm.length; i++) {
      if (seen[i]) continue;
      let j = i, len = 0;
      while (!seen[j]) { seen[j] = true; j = perm[j]; len++; }
      swaps += len - 1;
    }
    return swaps % 2;
  };

  function validateState(state) {
    const corners = CUBIES.filter((c) => c.type === 'corner');
    const edges = CUBIES.filter((c) => c.type === 'edge');
    const pieceOfId = (id) => CUBIES.find((c) => c.pos.includes(id));
    let twist = 0;
    const cperm = [];
    for (const slot of corners) {
      const ids = slot.pos.map((i) => state[i]);
      const home = pieceOfId(ids[0]);
      cperm.push(corners.indexOf(home));
      // quiralidad
      const dSlot = det3(...slot.pos.map((i) => POS[i].n));
      const dIds = det3(...ids.map((i) => POS[i].n));
      if (dSlot * dIds < 0) return 'Una esquina está en un orden de colores imposible (¿pegatina mal leída?).';
      const q0 = slot.pos.find((i) => { const f = Math.floor(i / 9); return f === 0 || f === 3; });
      const rest = slot.pos.filter((i) => i !== q0);
      const ordered = det3(POS[q0].n, POS[rest[0]].n, POS[rest[1]].n) > 0 ? [q0, rest[0], rest[1]] : [q0, rest[1], rest[0]];
      const k = ordered.findIndex((i) => { const f = Math.floor(state[i] / 9); return f === 0 || f === 3; });
      twist += k;
    }
    if (twist % 3 !== 0) return 'Una esquina parece girada: revisa los colores de las esquinas.';
    let flip = 0;
    const eperm = [];
    const primary = (c) => c.pos.find((i) => { const f = Math.floor(i / 9); return f === 0 || f === 3; }) ??
      c.pos.find((i) => { const f = Math.floor(i / 9); return f === 2 || f === 5; });
    for (const slot of edges) {
      const id = state[primary(slot)];
      const home = pieceOfId(id);
      eperm.push(edges.indexOf(home));
      if (id !== primary(home)) flip++;
    }
    if (flip % 2 !== 0) return 'Una arista parece volteada: revisa los colores de las aristas.';
    if (parity(cperm) !== parity(eperm)) return 'Dos piezas parecen intercambiadas (paridad imposible). Revisa las pegatinas.';
    return null;
  }

  // ───────────────────────── Búsqueda IDA* con tablas de poda ─────────────────────────
  function pieceStickers(name) { // 2 pegatinas bastan para fijar posición+orientación de cualquier pieza
    return pieceByName(name).pos.slice(0, 2);
  }

  function buildTable(names, moveNames, maxDepth) {
    const ids = names.flatMap(pieceStickers);
    const mvs = moveNames.map((m) => MOVES[m]);
    const keyFor = (arr) => { let k = 0; for (let i = 0; i < arr.length; i++) k = k * 54 + arr[i]; return k; };
    const map = new Map();
    let frontier = [Int8Array.from(ids)];
    map.set(keyFor(frontier[0]), 0);
    for (let d = 1; d <= maxDepth; d++) {
      const next = [];
      for (const st of frontier) {
        for (const mv of mvs) {
          const ns = new Int8Array(st.length);
          for (let i = 0; i < st.length; i++) ns[i] = mv[st[i]];
          const k = keyFor(ns);
          if (!map.has(k)) { map.set(k, d); next.push(ns); }
        }
      }
      if (!next.length) return { map, limit: d, complete: true, ids };
      frontier = next;
    }
    return { map, limit: maxDepth, complete: false, ids };
  }

  const tableCache = new Map();
  function getTables(setNames, groups, moveNames, maxDepth) {
    const out = [];
    for (const g of groups) {
      const ck = g.join('+') + '|' + moveNames.join(',') + '|' + maxDepth;
      if (!tableCache.has(ck)) tableCache.set(ck, buildTable(g, moveNames, maxDepth));
      const t = tableCache.get(ck);
      // índices dentro del vector de seguimiento completo
      const full = setNames.flatMap(pieceStickers);
      const idx = t.ids.map((id) => full.indexOf(id));
      out.push({ ...t, idx });
    }
    return out;
  }

  function faceAxisClass(m) { return AXIS_OF[m[0]]; }

  /* Búsqueda IDA* óptima para colocar las piezas `setNames` en casa usando sólo `moveNames`. */
  function idaSearch(state, setNames, moveNames, tableGroups, tableDepth, maxLen, deadlineMs) {
    const full = setNames.flatMap(pieceStickers);
    const inv = invert(state);
    const start = Int8Array.from(full.map((id) => inv[id]));
    const goal = Int8Array.from(full);
    const tables = getTables(setNames, tableGroups, moveNames, tableDepth);
    const mvs = moveNames.map((m) => MOVES[m]);
    const info = moveNames.map((m) => ({ face: m[0], axis: faceAxisClass(m) }));
    const n = full.length;
    const t0 = Date.now();

    const h = (pos) => {
      let best = 0;
      for (const t of tables) {
        let k = 0;
        for (let i = 0; i < t.idx.length; i++) k = k * 54 + pos[t.idx[i]];
        const v = t.map.get(k);
        const hv = v === undefined ? t.limit + 1 : v;
        if (hv > best) best = hv;
      }
      return best;
    };
    const atGoal = (pos) => { for (let i = 0; i < n; i++) if (pos[i] !== goal[i]) return false; return true; };

    const stack = []; for (let i = 0; i <= maxLen + 1; i++) stack.push(new Int8Array(n));
    const path = [];
    let found = null;
    const dfs = (depth, bound, last, g) => {
      const pos = stack[depth];
      const hv = h(pos);
      if (g + hv > bound) return g + hv;
      if (hv === 0 && atGoal(pos)) { found = path.slice(); return -1; }
      if (g === bound) return Infinity;
      if ((Date.now() - t0) > deadlineMs) throw new Error('tiempo');
      let min = Infinity;
      for (let mi = 0; mi < mvs.length; mi++) {
        const inf = info[mi];
        if (last >= 0) {
          const l = info[last];
          if (l.face === inf.face) continue;
          if (l.axis === inf.axis && last > mi) continue; // orden canónico en el mismo eje
        }
        const mv = mvs[mi], nxt = stack[depth + 1];
        for (let i = 0; i < n; i++) nxt[i] = mv[pos[i]];
        path.push(moveNames[mi]);
        const r = dfs(depth + 1, bound, mi, g + 1);
        if (r === -1) return -1;
        path.pop();
        if (r < min) min = r;
      }
      return min;
    };
    stack[0].set(start);
    if (atGoal(start)) return [];
    for (let bound = h(start); bound <= maxLen; bound++) {
      if (dfs(0, bound, -1, 0) === -1) return found;
    }
    return null;
  }

  const MOVES18 = []; ['U', 'D', 'R', 'L', 'F', 'B'].forEach((f) => MOVES18.push(f, f + "'", f + '2'));
  const MOVES_SB = []; ['U', 'R', 'r', 'M'].forEach((f) => MOVES_SB.push(f, f + "'", f + '2'));

  const FB_PIECES = ['DL', 'FL', 'BL', 'DLF', 'DLB'];
  const SB_PIECES = ['DR', 'FR', 'BR', 'DRF', 'DRB'];
  const FB_TABLES = [['DL', 'FL', 'BL', 'DLF'], ['DL', 'FL', 'BL', 'DLB'], ['DLF', 'DLB', 'DL', 'FL'], ['DLF', 'DLB', 'DL', 'BL']];
  const SB_TABLES = [['DR', 'FR', 'BR', 'DRF'], ['DR', 'FR', 'BR', 'DRB'], ['DRF', 'DRB', 'DR', 'FR'], ['DRF', 'DRB', 'DR', 'BR']];

  // ───────────────────────── CMLL por macros ─────────────────────────
  // Todos conservan las dos capas inferiores y los dos bloques; sólo mueven la capa U (verificado en tests).
  const CMLL_MACROS = [
    { label: 'Giro de la capa superior', alg: 'U', free: true },
    { label: 'Giro de la capa superior', alg: "U'", free: true },
    { label: 'Giro de la capa superior', alg: 'U2', free: true },
    { label: 'Sune (orienta esquinas)', alg: "R U R' U R U2 R'" },
    { label: 'Anti-Sune (orienta esquinas)', alg: "R U2 R' U' R U' R'" },
    { label: 'H (orienta esquinas)', alg: "F R U R' U' R U R' U' R U R' U' F'" },
    { label: 'Pi (orienta esquinas)', alg: "R U2 R2 U' R2 U' R2 U2 R" },
    { label: 'U (orienta esquinas)', alg: "R2 D R' U2 R D' R' U2 R'" },
    { label: 'T (orienta esquinas)', alg: "r U R' U' r' F R F'" },
    { label: 'L (orienta esquinas)', alg: "F R' F' r U R U' r'" },
    { label: 'Ciclo de 3 esquinas', alg: "R U' L' U R' U' L U" },
        { label: 'Ciclo de 3 esquinas (espejo)', alg: "L' U R U' L U R' U'" },
    { label: 'Intercambio de esquinas', alg: "R U2 R' U' R U2 L' U R' U' L" },
    { label: 'Intercambio de esquinas (J)', alg: "R U R' F' R U R' U' R' F R2 U' R'" },
    { label: 'Intercambio diagonal (Y)', alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
  ];

  const U_CORNER_NAMES = ['UFR', 'UFL', 'UBL', 'UBR'];

  function uLayerPositions() {
    const set = new Set();
    CUBIES.forEach((c) => { if (c.coord[1] === 1) c.pos.forEach((i) => set.add(i)); });
    return set;
  }

  function checkMacro(alg) {
    const perm = algPerm(alg);
    const u = uLayerPositions();
    for (let i = 0; i < 54; i++) if (!u.has(i) && perm[i] !== i) return false;
    return true;
  }

  const macroList = [];
  for (const m of CMLL_MACROS) {
    let ok = false;
    try { ok = checkMacro(m.alg); } catch (e) { ok = false; }
    if (ok) macroList.push({ label: m.label, alg: parseAlg(m.alg), perm: algPerm(m.alg), cost: parseAlg(m.alg).length, free: !!m.free });
  }

  function solveCMLL(state) {
    const names = U_CORNER_NAMES;
    const full = names.flatMap(pieceStickers);
    const inv = invert(state);
    const start = full.map((id) => inv[id]);
    const keyFor = (a) => a.join(',');
    const goalKey = keyFor(full);
    const dist = new Map([[keyFor(start), 0]]);
    const prev = new Map();
    const open = [[0, start]];
    // Dijkstra simple (espacio de ≤ 648 estados)
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      const [d, st] = open.splice(bi, 1)[0];
      const k = keyFor(st);
      if (d > dist.get(k)) continue;
      if (k === goalKey) break;
      for (let mi = 0; mi < macroList.length; mi++) {
        const m = macroList[mi];
        const ns = st.map((p) => m.perm[p]);
        const nk = keyFor(ns);
        const nd = d + m.cost;
        if (!dist.has(nk) || nd < dist.get(nk)) { dist.set(nk, nd); prev.set(nk, [k, mi]); open.push([nd, ns]); }
      }
    }
    if (!dist.has(goalKey)) return null;
    const seq = [];
    let k = goalKey;
    const startKey = keyFor(start);
    while (k !== startKey) { const [pk, mi] = prev.get(k); seq.push(mi); k = pk; }
    seq.reverse();
    // fusiona giros U consecutivos en un solo segmento
    const segments = [];
    for (const mi of seq) {
      const m = macroList[mi];
      const last = segments[segments.length - 1];
      if (m.free && last && last.free) { last.moves.push(...m.alg); }
      else segments.push({ label: m.label, moves: m.alg.slice(), free: m.free });
    }
    segments.forEach((s) => { if (s.free) s.moves = simplifyU(s.moves); });
    return segments.filter((s) => s.moves.length);
  }

  function simplifyU(moves) { // suma giros U
    let q = 0;
    for (const m of moves) q += m === 'U' ? 1 : m === "U'" ? 3 : 2;
    q %= 4;
    return q === 0 ? [] : q === 1 ? ['U'] : q === 2 ? ['U2'] : ["U'"];
  }

  // ───────────────────────── LSE: BFS en <M,U> ─────────────────────────
  const LSE_EDGES = ['UF', 'UB', 'UL', 'UR', 'DF', 'DB'];
  const LSE_TRACK = LSE_EDGES.flatMap(pieceStickers).concat(pieceStickers('UFR'), [4, 22, 31, 49]);
  const LSE_MOVES = ['M', "M'", 'M2', 'U', "U'", 'U2'];
  let lseTable = null;
  const keyStr = (arr) => String.fromCharCode.apply(null, arr);

  function buildLSE() {
    const mvs = LSE_MOVES.map((m) => MOVES[m]);
    const dist = new Map();
    const startArr = Uint8Array.from(LSE_TRACK);
    dist.set(keyStr(startArr), 0);
    let frontier = [startArr];
    let d = 0;
    while (frontier.length) {
      d++;
      const next = [];
      for (const st of frontier) {
        for (const mv of mvs) {
          const ns = new Uint8Array(st.length);
          for (let i = 0; i < st.length; i++) ns[i] = mv[st[i]];
          const k = keyStr(ns);
          if (!dist.has(k)) { dist.set(k, d); next.push(ns); }
        }
      }
      frontier = next;
    }
    return dist;
  }

  function solveLSE(state) {
    if (!lseTable) lseTable = buildLSE();
    const inv = invert(state);
    let cur = Uint8Array.from(LSE_TRACK.map((id) => inv[id]));
    let d = lseTable.get(keyStr(cur));
    if (d === undefined) return null;
    const seq = [];
    while (d > 0) {
      let moved = false;
      for (const name of LSE_MOVES) {
        const mv = MOVES[name];
        const ns = new Uint8Array(cur.length);
        for (let i = 0; i < cur.length; i++) ns[i] = mv[cur[i]];
        const nd = lseTable.get(keyStr(ns));
        if (nd === d - 1) { seq.push(name); cur = ns; d = nd; moved = true; break; }
      }
      if (!moved) return null;
    }
    return seq;
  }

  // ───────────────────────── Etapas ─────────────────────────
  const STAGES = [
    { id: 'FB', name: 'Primer bloque', short: '1', info: 'Construye un bloque de 1×2×3 en la cara izquierda: tres aristas y dos esquinas pegadas entre sí. No hay fórmulas que memorizar: sólo mira el cubo y sigue las jugadas.' },
    { id: 'SB', name: 'Segundo bloque', short: '2', info: 'Construye el bloque de 1×2×3 simétrico en la cara derecha sin romper el izquierdo. Sólo se usan U, R, r y M.' },
    { id: 'CMLL', name: 'Esquinas de arriba', short: '3', info: 'Orienta y coloca las cuatro esquinas de la capa superior. Aquí aparecen los únicos algoritmos "con nombre".' },
    { id: 'LSE', name: 'Seis aristas finales', short: '4', info: 'Resuelve las seis aristas que faltan usando sólo M y U. Parece caótico, pero cada jugada acerca el cubo a la meta.' },
  ];

  const FB_NAMES = FB_PIECES, SB_NAMES = SB_PIECES;
  const fbDone = (s) => piecesSolved(s, FB_NAMES);
  const sbDone = (s) => piecesSolved(s, SB_NAMES);
  const cmllDone = (s) => fbDone(s) && sbDone(s) && piecesSolved(s, U_CORNER_NAMES);

  function currentStage(state) {
    if (isSolved(state)) return 'DONE';
    if (!fbDone(state)) return 'FB';
    if (!sbDone(state)) return 'SB';
    if (!cmllDone(state)) return 'CMLL';
    return 'LSE';
  }

  /* Calcula las jugadas de la etapa actual. Devuelve {stage, segments:[{label,moves}], error?}. */
  function planStage(state, opts) {
    const stage = currentStage(state);
    const deadline = (opts && opts.deadlineMs) || 60000;
    try {
      if (stage === 'DONE') return { stage, segments: [] };
      if (stage === 'FB') {
        const mv = idaSearch(state, FB_PIECES, MOVES18, FB_TABLES, 5, 14, deadline);
        if (!mv) return { stage, error: 'No encontré solución para el primer bloque.' };
        return { stage, segments: [{ label: 'Bloque izquierdo', moves: mv }] };
      }
      if (stage === 'SB') {
        const mv = idaSearch(state, SB_PIECES, MOVES_SB, SB_TABLES, 7, 16, deadline);
        if (!mv) return { stage, error: 'No encontré solución para el segundo bloque.' };
        return { stage, segments: [{ label: 'Bloque derecho', moves: mv }] };
      }
      if (stage === 'CMLL') {
        const seg = solveCMLL(state);
        if (!seg) return { stage, error: 'No encontré solución para las esquinas.' };
        return { stage, segments: seg };
      }
      const mv = solveLSE(state);
      if (!mv) return { stage, error: 'Las aristas finales no tienen solución con M y U: revisa el escaneo.' };
      return { stage, segments: [{ label: 'Aristas finales (sólo M y U)', moves: mv }] };
    } catch (e) {
      return { stage, error: 'La búsqueda tardó demasiado. Vuelve a escanear.' };
    }
  }

  // ───────────────────────── Visión: color → clase ─────────────────────────
  function rgb2lab(r, g, b) {
    const f = (v) => { v /= 255; return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92; };
    const R = f(r), G = f(g), B = f(b);
    const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const t = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
    return [116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))];
  }

  function hungarian(a) {
    const n = a.length, m = a[0].length, INF = 1e18;
    const u = new Array(n + 1).fill(0), v = new Array(m + 1).fill(0), p = new Array(m + 1).fill(0), way = new Array(m + 1).fill(0);
    for (let i = 1; i <= n; i++) {
      p[0] = i; let j0 = 0;
      const minv = new Array(m + 1).fill(INF), used = new Array(m + 1).fill(false);
      do {
        used[j0] = true;
        const i0 = p[j0]; let delta = INF, j1 = 0;
        for (let j = 1; j <= m; j++) if (!used[j]) {
          const cur = a[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
        for (let j = 0; j <= m; j++) { if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
        j0 = j1;
      } while (p[j0] !== 0);
      do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
    }
    const ans = new Array(n);
    for (let j = 1; j <= m; j++) if (p[j]) ans[p[j] - 1] = j - 1;
    return ans;
  }

  /* rgb: 54 colores [r,g,b] en orden URFDLB (centros en f*9+4). Devuelve {colors[54], means[6]} */
  function classifyColors(rgb) {
    const labs = rgb.map((c) => rgb2lab(c[0], c[1], c[2]));
    let means = [0, 1, 2, 3, 4, 5].map((f) => labs[f * 9 + 4].slice());
    let colors = new Array(54).fill(0);
    for (let iter = 0; iter < 4; iter++) {
      const cost = labs.map((l, i) => {
        const row = [];
        for (let c = 0; c < 6; c++) {
          const d = (l[0] - means[c][0]) ** 2 * 0.5 + (l[1] - means[c][1]) ** 2 + (l[2] - means[c][2]) ** 2;
          const isCenter = i % 9 === 4;
          for (let k = 0; k < 9; k++) row.push(isCenter && Math.floor(i / 9) !== c ? 1e9 : d);
        }
        return row;
      });
      const asg = hungarian(cost);
      colors = asg.map((s) => Math.floor(s / 9));
      const sums = [0, 1, 2, 3, 4, 5].map(() => [0, 0, 0]);
      colors.forEach((c, i) => { for (let k = 0; k < 3; k++) sums[c][k] += labs[i][k]; });
      means = sums.map((s) => s.map((v) => v / 9));
    }
    const rgbMeans = [0, 1, 2, 3, 4, 5].map((c) => {
      const s = [0, 0, 0]; let n = 0;
      colors.forEach((cc, i) => { if (cc === c) { for (let k = 0; k < 3; k++) s[k] += rgb[i][k]; n++; } });
      return s.map((v) => Math.round(v / n));
    });
    return { colors, means: rgbMeans };
  }

  // Utilidades para demo y tests
  const STD_PALETTE = [[240, 240, 240], [200, 30, 40], [20, 155, 72], [235, 210, 40], [240, 120, 25], [30, 80, 190]];
  function scramble(n, rng) {
    const r = rng || Math.random;
    const names = ['U', 'D', 'R', 'L', 'F', 'B'];
    const out = []; let last = '';
    while (out.length < n) {
      const f = names[Math.floor(r() * 6)];
      if (f === last) continue;
      last = f;
      out.push(f + ['', "'", '2'][Math.floor(r() * 3)]);
    }
    return out;
  }
  function colorsFromState(state) { return state.map((id) => Math.floor(id / 9)); }

  const api = {
    FACES, NORMALS, POS, MOVES, CUBIES, STAGES, STD_PALETTE,
    parseAlg, algPerm, invertAlg, applyPerm, applyAlg, SOLVED, isSolved,
    pieceByName, pieceSolved, piecesSolved,
    stateFromColors, validateState, colorsFromState, scramble,
    currentStage, planStage, solveCMLL, solveLSE, idaSearch, macroList, checkMacro,
    fbDone, sbDone, cmllDone, classifyColors, hungarian, rgb2lab,
    _internals: { buildLSE, FB_TABLES, SB_TABLES, MOVES18, MOVES_SB, FB_PIECES, SB_PIECES, CMLL_MACROS },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Rubik = api;
})(typeof window !== 'undefined' ? window : globalThis);
