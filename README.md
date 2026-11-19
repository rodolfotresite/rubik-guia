# Cubo Guiado

Resuelve un cubo de Rubik 3×3 con el método **Roux**: escaneas las 6 caras con la cámara del móvil y la app te guía jugada a jugada. Todo corre en el navegador; no se envía ninguna imagen a ningún servidor.

**Úsala:** https://rodolfotresite.github.io/rubik-guia/

## Cómo se usa

1. Sostén el cubo con una cara al frente y otra arriba, con buena luz y sin reflejos.
2. Escanea las 6 caras siguiendo las instrucciones de pantalla (cámara en vivo con cuadrícula 3×3, o modo foto).
3. Revisa los colores en la plantilla; toca una pegatina para corregirla.
4. Mantén el cubo en la misma posición inicial y sigue las jugadas.

Etapas: 1) primer bloque 1×2×3 a la izquierda, 2) segundo bloque a la derecha (U, R, r, M), 3) CMLL: esquinas de arriba, 4) LSE: las 6 aristas finales solo con M y U. Notación: una letra es un cuarto de vuelta, con ′ va al revés, con 2 es media vuelta; M es la capa del medio y r son las dos capas de la derecha juntas.

## Cómo funciona

- `src/engine.js`: modelo del cubo con 54 pegatinas y geometría real, validación (paridad, giro de esquinas, volteo de aristas), solver por etapas y visión de color. Sin dependencias; corre en Node y en navegador.
  - Bloques: IDA* con tablas de poda por subconjuntos de piezas.
  - CMLL: Dijkstra sobre las 648 configuraciones de las 4 esquinas de arriba, usando 15 macros que no tocan nada fuera de la capa U (se verifica al cargar).
  - LSE: BFS exhaustivo en ⟨M, U⟩, por lo que las jugadas son óptimas.
  - Color: asignación húngara en Lab con exactamente 9 pegatinas por color.
- `src/app.template.html`: interfaz (intro, escaneo, revisión, resolver).
- `build.js`: une motor e interfaz en `dist/index.html` (página completa) y `dist/artifact.html` (fragmento).
- `test/`: `test.js` (geometría, macros, cobertura CMLL y barajados aleatorios resueltos de punta a punta), `vision.js` (precisión del color con ruido) y `scanorder.js` (secuencia de giros del escaneo).

```sh
node test/test.js 60   # debe terminar en TODO OK
node build.js          # genera dist/
```

Cada push a `main` ejecuta las pruebas, compila y publica en GitHub Pages (`.github/workflows/pages.yml`).

## Notas

- La cámara en vivo necesita HTTPS (por eso Pages). Si el navegador la bloquea, la app cae al modo foto.
- Resultado típico: bloque izquierdo ~7 jugadas, derecho ~10, CMLL ~15, LSE ~11 (≈43 en total).
- Si el solver devuelve un error, casi siempre es una pegatina mal leída o una jugada distinta a la indicada: usa «Re-escanear».
- El método Roux y su estructura en etapas se inspiran en el artículo de philoli.com *Resolver el cubo de Rubik en menos de 30 segundos sin memorizar* (CC BY-NC-SA 4.0). Aquí solo se usa la idea general y notación estándar; no se copia su texto.
