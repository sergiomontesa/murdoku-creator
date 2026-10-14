# 🗡️ Murdoku Creator — Generador de Puzzles de Deducción

Generador procedural de puzzles tipo Murdoku con temática, mapa y personajes aleatorios. Elige modo de juego (búsqueda del tesoro o asesino clásico), temática y dificultad, genera un caso y deduce dónde va cada personaje.

> 🎓 **Proyecto desarrollado solo con fines educativos y de aprendizaje.**
> Inspirado en [murdoku.com](https://murdoku.com) de Manuel Garand. Sin afiliación con el original.

## ✨ Características

- **2 modos de juego**: 💰 *Búsqueda del Tesoro* (encuentra el tesoro en la última casilla libre) y 🔪 *El Asesino* (tablero lleno con víctima incluida; gana quien coloca a todos y acusa a quien se quedó a solas con la víctima).
- **13 temáticas**: Piratas, Medieval, Ciencia Ficción, Western, Selva, Terrorífico, Detective, Egipto, Cyberpunk, Japón Feudal, Apocalipsis Zombi, Olimpiadas y Cocina.
- **4 dificultades**: de 6×6 (5 sospechosos) hasta 18×18 (17 sospechosos) en modo tesoro; en modo asesino el tablero se llena (víctima incluida).
- **7 rasgos visibles**: sombrero, gafas, parche, bufanda, bastón, anillo y medalla; las pistas los usan como señas de identidad.
- **Generación 100 % procedural y jugable en local**:
  1. Zonas del mapa.
  2. Objetos ocupables (camas, sillas, hamacas…) y fijos (árboles, rocas, cofres…).
  3. Solución oculta con regla Murdoku: una persona por fila y por columna (la víctima también cuenta en modo asesino).
  4. Pistas deductivas en español de 2–3 frases verificadas (zona, adyacencia, este/oeste, norte/sur, columna, fila superior, rasgos…), coherentes con la regla de fila y columna.
  5. En modo tesoro, tesoro en el cruce de la última fila y columna libres; en modo asesino, víctima y asesino a solas en su zona.
- **Tablero interactivo**: arrastrar/colocar fichas, marcas candidatas ✏️ para anotar posibilidades y fijarlas, avisos de conflicto fila/columna, Deshacer (Ctrl+Z), comprobar aciertos, 3 pistas, acusación con maza y revelado de solución.
- **Persistencia en `localStorage`**: configuración (incluido el modo), puzzle actual e historial (hasta 10); las partidas antiguas se normalizan y sanean al cargarlas.
- **UI responsive** con Tailwind CSS 4, animaciones propias y iconos Lucide.

## 🧩 Cómo jugar

1. **Una persona por fila y por columna.** Como en el sudoku: si dos fichas comparten fila o columna, verás un aviso rojo (la víctima también cuenta).
2. **Lee los testimonios.** Cada pista describe dónde estaba alguien: junto a un objeto, en una zona, al este/oeste, al norte/sur o en una columna concreta. Algunos llevan rasgos visibles y las pistas los mencionan.
3. **Fíjate en el suelo.** Lo verde se puede ocupar (camas, sillas, hamacas); lo gris son objetos fijos que solo sirven de referencia.
4. **Dos formas de ganar.** En 💰 Tesoro, la última fila y columna libres esconden el tesoro. En 🔪 Asesino, el tablero se llena y el culpable es quien se quedó a solas con la víctima: colócalos a todos y pulsa Acusar.
5. **Pide ayuda y anota.** Tienes 3 pistas que colocan una ficha, el botón Comprobar (cuenta aciertos sin revelar cuáles), Deshacer (Ctrl+Z) y marcas ✏️ Candidatas para anotar posibilidades antes de fijar una.

## 🛠️ Stack

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 + `<script setup>` + TypeScript |
| Build | Vite+ 1.1 (`vp` CLI, core Vite 8 + Rolldown) |
| Estado | Pinia 4 |
| Router | Vue Router 5 |
| Datos remotos | Axios + TanStack Query (`@tanstack/vue-query`) |
| Estilos | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Iconos | `lucide-vue-next` |
| Lint | `oxlint` |
| Tipos | `vue-tsc` |

## ✅ Requisitos

- Node.js 20+ (recomendado 22 LTS)
- `pnpm` 9+ (el repo incluye `pnpm-lock.yaml` y fija el gestor con `packageManager`)
- El toolchain de build es [Vite+](https://viteplus.dev/): `vite` se resuelve a `@voidzero-dev/vite-plus-core` vía `overrides` en `pnpm-workspace.yaml`

## 🚀 Puesta en marcha

```bash
# Instalar dependencias
pnpm install

# Desarrollo (http://localhost:8888)
pnpm dev

# Comprobación de tipos + build de producción
pnpm build

# Previsualizar la build
pnpm preview
```

> El puerto de desarrollo es el **8888** (ver `vite.config.ts`).

## 🎮 Uso

1. Abre `http://localhost:8888` (si está ocupado se toma el siguiente libre).
2. Elige modo de juego, una de las 13 temáticas (con buscador) y un nivel de dificultad. También puedes jugar el caso oficial Murdoku Contest #1 (24×24).
3. Pulsa **¡Generar Puzzle!** → verás la pantalla de generación animada (`/generating`).
4. Resuelve el caso en `/puzzle`: coloca fichas (o marca candidatas), usa pistas y, según el modo, encuentra el tesoro o acusa al asesino.
5. Tus últimos 5 puzzles quedan accesibles desde **Puzzles anteriores** en la portada.

### Rutas

| Ruta | Vista | Acceso |
|---|---|---|
| `/` | `HomeView.vue` — selección de modo, temática y dificultad + caso oficial | pública |
| `/generating` | `GeneratingView.vue` — progreso animado | solo si `generationStatus !== 'idle'` |
| `/puzzle` | `PuzzleView.vue` — tablero de juego | solo si hay puzzle generado |
| `*` | redirige a `/` | — |

## 🎭 Temáticas

| ID | Nombre | Emoji |
|---|---|---|
| `pirates` | Piratas | 🏴 |
| `medieval` | Medieval | ⚔️ |
| `scifi` | Ciencia Ficción | 🚀 |
| `western` | Western | 🤠 |
| `jungle` | Selva | 🌿 |
| `spooky` | Terrorífico | 👻 |
| `detective` | Detective | 🕵 |
| `egypt` | Egipto | 🏺 |
| `cyberpunk` | Cyberpunk | 🌃 |
| `feudal` | Japón Feudal | ⛩️ |
| `zombie` | Apocalipsis Zombi | 🧟 |
| `olympics` | Olimpiadas | 🏅 |
| `kitchen` | Cocina | 🍳 |

Cada temática define en `src/data/themes.ts`: zonas típicas, objetos con emoji único, nombres masculinos/femeninos y avatares por género.

## 📊 Dificultades

| ID | Nombre | Grid | Personajes | Zonas | Pistas |
|---|---|---|---|---|---|
| `easy` | Principiante | 6×6 | 5 | 3 | simples |
| `medium` | Aventurero | 9×9 | 8 | 5 | cruzadas |
| `hard` | Experto | 12×12 | 11 | 7 | encadenadas |
| `expert` | Maestro | 18×18 | 17 | 10 | avanzadas |

Definidas en `DIFFICULTIES` (`src/data/themes.ts`).

## ⚙️ Cómo se genera un puzzle

Lógica en `src/composables/usePuzzleGenerator.ts`, orquestada por el store `src/stores/puzzle.ts`:

1. **Zonas** (`generateZones`): división del grid en bloques con nombre, color y emoji.
2. **Objetos** (`generateObjects`): 3–6 ocupables aprox. + ~18 % del mapa en fijos, en celdas aleatorias no repetidas.
3. **Personajes** (`generateCharacters`): posiciones con fila y columna únicas, nunca sobre objeto no ocupable (sí sobre vacías u ocupables). Nombres y emojis alternando género; ~45 % lleva un rasgo visible.
4. **Pistas** (`generateClues`): 2–3 frases verificadas por personaje (localización principal + zona, norte/sur, este/oeste, columna, ausencias de objetos o rasgos), coherentes con la regla de 1 por fila y columna; la cantidad de frases extra escala con la dificultad.
5. **Desenlace** (`generatePuzzle`): en modo tesoro, tesoro en la última fila y columna sin sospechoso (1-indexed, puede quedar bajo un objeto no ocupable); en modo asesino, tablero lleno con víctima y asesino a solas en su zona.

Además existe `src/data/officialContest.ts` con el caso oficial Murdoku Contest #1 (24×24, basado en `mapa.png` y `reglas.txt`).

## 📁 Estructura

```text
src/
├── composables/
│   └── usePuzzleGenerator.ts  # Algoritmo procedural
├── data/
│   ├── themes.ts              # 13 temáticas + 4 dificultades
│   └── officialContest.ts     # Caso oficial 24×24
├── router/
│   └── index.ts               # /, /generating, /puzzle + guardias
├── stores/
│   └── puzzle.ts              # Estado Pinia + localStorage
├── types/
│   └── puzzle.ts              # Dominio: modo, zonas, personajes, rasgos, pistas…
├── views/
│   ├── HomeView.vue           # Portada: modo + temática + dificultad + caso oficial
│   ├── GeneratingView.vue     # Progreso animado
│   └── PuzzleView.vue         # Tablero de juego
├── App.vue              # Shell + transición de rutas
├── main.ts              # createApp + Pinia + Router + Vue Query
└── style.css            # Tailwind + animaciones propias
```

## 💾 Persistencia

Clave `murdoku-creator-state` en `localStorage`: tema, dificultad, modo, puzzle actual, historial y pistas usadas (al cargar se normalizan los puzzles antiguos al modelo actual). Clave `murdoku-help-seen` para el modal "Cómo jugar" de la primera visita.

## 📜 Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor Vite+ en puerto 8888 (`scripts/dev.mjs` + `vp dev`; si está ocupado toma el siguiente libre) |
| `pnpm build` | `vue-tsc -b && vp build` |
| `pnpm preview` | Sirve `dist/` en local (`vp preview`) |
| `pnpm exec vp toolchain` | Muestra las versiones del toolchain Vite+ |

## 🙏 Créditos

- Idea y reglas originales: [murdoku.com](https://murdoku.com) de Manuel Garand.
- Este repositorio es un clon educativo sin afiliación: no redistribuye contenido original, solo implementa la mecánica con datos propios generados proceduralmente.

## 📄 Licencia

Uso educativo y de aprendizaje. Si lo publicas o reutilizas, cita la inspiración en `murdoku.com` y revisa qué licencia quieres aplicarle a tu código.
