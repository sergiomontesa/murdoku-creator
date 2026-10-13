# 🗡️ Murdoku Creator — Generador de Puzzles de Deducción

Generador procedural de puzzles tipo Murdoku con temática, mapa y personajes aleatorios. Elige temática y dificultad, genera un caso, coloca a cada sospechoso en su casilla y encuentra el tesoro escondido.

> 🎓 **Proyecto desarrollado solo con fines educativos y de aprendizaje.**
> Inspirado en [murdoku.com](https://murdoku.com) de Manuel Garand. Sin afiliación con el original.

## ✨ Características

- **13 temáticas**: Piratas, Medieval, Ciencia Ficción, Western, Selva, Terrorífico, Detective, Egipto, Cyberpunk, Japón Feudal, Apocalipsis Zombi, Olimpiadas y Cocina.
- **4 dificultades**: de 6×6 (5 sospechosos) hasta 18×18 (17 sospechosos).
- **Generación 100 % procedural y jugable en local**:
  1. Zonas del mapa.
  2. Objetos ocupables (camas, sillas, hamacas…) y fijos (árboles, rocas, cofres…).
  3. Solución oculta con regla Murdoku: un sospechoso por fila y por columna.
  4. Pistas deductivas en español (zona, adyacencia, este/oeste, fila superior…).
  5. Tesoro en el cruce de la última fila y columna libres.
- **Tablero interactivo**: arrastrar/colocar fichas, avisos de conflicto fila/columna, comprobar aciertos, 3 pistas y revelado de solución.
- **Persistencia en `localStorage`**: configuración, puzzle actual e historial (hasta 10).
- **UI responsive** con Tailwind CSS 4, animaciones propias y iconos Lucide.

## 🧩 Cómo jugar

1. **Un sospechoso por fila y por columna.** Como en el sudoku: si dos fichas comparten fila o columna, verás un aviso rojo.
2. **Lee los testimonios.** Cada pista describe dónde estaba alguien: junto a un objeto, en una zona o al este/oeste de otro.
3. **Fíjate en el suelo.** Lo verde se puede ocupar (camas, sillas, hamacas); lo gris son objetos fijos que solo sirven de referencia.
4. **El tesoro está en la última casilla.** Cuando todas las fichas estén bien colocadas, solo quedará una fila y una columna libres: su cruce esconde el tesoro.
5. **Pide ayuda si te atascas.** Tienes 3 pistas que colocan una ficha y el botón Comprobar, que cuenta aciertos sin revelar cuáles.

## 🛠️ Stack

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 + `<script setup>` + TypeScript |
| Build | Vite 8 |
| Estado | Pinia 4 |
| Router | Vue Router 5 |
| Datos remotos | Axios + TanStack Query (`@tanstack/vue-query`) |
| Estilos | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Iconos | `lucide-vue-next` |
| Lint | `oxlint` |
| Tipos | `vue-tsc` |

## ✅ Requisitos

- Node.js 20+ (recomendado 22 LTS)
- `pnpm` 9+ (el repo incluye `pnpm-lock.yaml`)

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

1. Abre `http://localhost:8888`.
2. Elige una de las 13 temáticas (con buscador) y un nivel de dificultad.
3. Pulsa **¡Generar Puzzle!** → verás la pantalla de generación animada (`/generating`).
4. Resuelve el caso en `/puzzle`: coloca fichas, usa pistas y encuentra el tesoro.
5. Tus últimos 5 puzzles quedan accesibles desde **Puzzles anteriores** en la portada.

### Rutas

| Ruta | Vista | Acceso |
|---|---|---|
| `/` | `HomeView.vue` — selección de temática/dificultad | pública |
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
3. **Personajes** (`generateCharacters`): posiciones con fila y columna únicas, nunca sobre objeto no ocupable (sí sobre vacías u ocupables). Nombres y emojis alternando género.
4. **Pistas** (`generateClues`): por personaje, priorizando `en una cama/hamaca/silla` → `junto a X` → zona / este-oeste / fila superior, más regla secundaria de columna/sombrero en ~35 % de casos.
5. **Tesoro** (`generatePuzzle`): última fila y columna sin sospechoso (1-indexed). Puede quedar bajo un objeto no ocupable, como en las reglas originales.

Además existe `src/data/officialContest.ts` con el caso oficial Murdoku Contest #1 (24×24, basado en `mapa.png` y `reglas.txt`).

## 📁 Estructura

```text
src/
├── assets/            # Estáticos (hero, iconos vite/vue)
├── components/        # Componentes reutilizables
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
│   └── puzzle.ts              # Dominio: Zone, Character, Clue, GeneratedPuzzle…
├── views/
│   ├── HomeView.vue           # Portada: temática + dificultad
│   ├── GeneratingView.vue     # Progreso animado
│   └── PuzzleView.vue         # Tablero de juego
├── App.vue              # Shell + transición de rutas
├── main.ts              # createApp + Pinia + Router + Vue Query
└── style.css            # Tailwind + animaciones propias
```

## 💾 Persistencia

Clave `murdoku-creator-state` en `localStorage`: tema, dificultad, puzzle actual, historial y pistas usadas. Clave `murdoku-help-seen` para el modal "Cómo jugar" de la primera visita.

## 📜 Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor Vite en puerto 8888 |
| `pnpm build` | `vue-tsc -b && vite build` |
| `pnpm preview` | Sirve `dist/` en local |

## 🙏 Créditos

- Idea y reglas originales: [murdoku.com](https://murdoku.com) de Manuel Garand.
- Este repositorio es un clon educativo sin afiliación: no redistribuye contenido original, solo implementa la mecánica con datos propios generados proceduralmente.

## 📄 Licencia

Uso educativo y de aprendizaje. Si lo publicas o reutilizas, cita la inspiración en `murdoku.com` y revisa qué licencia quieres aplicarle a tu código.
