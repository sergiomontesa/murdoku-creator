<script setup lang="ts">
/**
 * Vista interactiva del mapa Murdoku.
 * El mapa presenta la riqueza geográfica de las zonas y los objetos distribuidos
 * (distiñendo entre ocupables y no ocupables) siguiendo las reglas del juego (reglas.txt).
 * El jugador puede deducir y colocar las fichas de los personajes o revelar la solución.
 */
import { computed, ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  RotateCcw, Home, Users,
  EyeOff, Eye,
  HelpCircle, CheckCircle2, AlertTriangle, Sparkles,
  Compass, Info, UserCheck, ZoomIn, ZoomOut, Clock,
  Lightbulb
} from 'lucide-vue-next'
import { usePuzzleStore } from '@/stores/puzzle'
import { getTheme, getDifficulty } from '@/data/themes'
import { ACCESSORY_META, getCharacterAccessories } from '@/types/puzzle'
import type { Zone, Character, Clue, ClueType, PlacedObject, MapObject, AccessoryId } from '@/types/puzzle'

const router = useRouter()
const store = usePuzzleStore()
const puzzle = computed(() => store.currentPuzzle!)

const theme = computed(() => getTheme(puzzle.value.theme))
const difficulty = computed(() => getDifficulty(puzzle.value.difficulty))

// ============================================================
// ESTADO INTERACTIVO DE JUEGO (MODO DETECTIVE)
// ============================================================

/** Indica si se está mostrando la solución oficial en lugar del tablero de juego */
const showSolution = ref(false)

/** Nivel de zoom multiplicador para el grid */
const zoom = ref(puzzle.value.gridSize >= 18 ? 1.25 : 1)

/** Personaje actualmente seleccionado por el jugador para colocar en el mapa */
const selectedCharacterId = ref<string | null>(null)

/** Fichas colocadas interactivamente por el jugador: charId -> { row, col } */
const playerPlacements = reactive<Record<string, { row: number; col: number }>>({})

/** Casillas descartadas por el jugador (marca X): clave "row,col" */
const excludedCells = reactive<Record<string, boolean>>({})

/** Pestaña activa del panel auxiliar */
const activeTab = ref<'suspects' | 'legend'>('suspects')

/** Filtros del panel de pistas */
const clueQuery = ref('')
const clueTypeFilter = ref<ClueType | 'all'>('all')
/** Pista de cada personaje indexada por characterId */
const clueByCharacter = computed(() => {
  const map = new Map<string, Clue>()
  for (const clue of puzzle.value.clues) map.set(clue.characterId, clue)
  return map
})

/** Mostrar solo sospechosos sin colocar */
const showOnlyUnplaced = ref(false)
/** Sospechosos filtrados por colocacion, texto y tipo de pista */
const filteredSuspects = computed(() => {
  const q = clueQuery.value.trim().toLowerCase()
  return puzzle.value.characters.filter((c) => {
    if (showOnlyUnplaced.value && playerPlacements[c.id]) return false
    const clue = clueByCharacter.value.get(c.id)
    if (clueTypeFilter.value !== 'all' && clue?.type !== clueTypeFilter.value) return false
    // La búsqueda incluye nombre, pista y rasgos (sombrero, gafas, parche)
    if (q) {
      const traits = getCharacterAccessories(c).map((a) => ACCESSORY_META[a].label).join(' ')
      if (!(`${c.name} ${clue?.text ?? ''} ${traits}`.toLowerCase().includes(q))) return false
    }
    return true
  })
})

/** Clases de la insignia de cada rasgo */
function accessoryBadgeClass(id: AccessoryId): string {
  if (id === 'hat') return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  if (id === 'glasses') return 'bg-sky-500/20 text-sky-300 border-sky-500/30'
  return 'bg-violet-500/20 text-violet-300 border-violet-500/30'
}

/** Emojis de los rasgos de un personaje para mostrar junto a su avatar */
function accessoryEmojis(char: Character): string {
  return getCharacterAccessories(char).map((a) => ACCESSORY_META[a].emoji).join(' ')
}

/** Etiqueta de rasgos para tooltips (p. ej. "Sombrero, Gafas") */
function accessoryTitle(char: Character): string {
  return getCharacterAccessories(char).map((a) => ACCESSORY_META[a].label).join(', ')
}

/** Mensaje de aviso/feedback cuando el usuario hace clic (ej. celda no ocupable) */
const notificationMsg = ref<{ text: string; type: 'warning' | 'success' | 'info' } | null>(null)

/** Celda sobre la que se encuentra el cursor para inspección gráfica */
const hoveredCell = ref<{ row: number; col: number } | null>(null)

// ============================================================
// CONTROLES DE ZOOM
// ============================================================

function zoomIn() {
  if (zoom.value < 2.2) zoom.value = +(zoom.value + 0.2).toFixed(1)
}

function zoomOut() {
  if (zoom.value > 0.7) zoom.value = +(zoom.value - 0.2).toFixed(1)
}

function resetZoom() {
  zoom.value = puzzle.value.gridSize >= 18 ? 1.25 : 1
}

// ============================================================
// HELPERS DEL MAPA Y OBJETOS
// ============================================================

/** Diccionario rápido de objetos de la temática */
const objectMap = computed(() => {
  const map = new Map<string, MapObject>()
  for (const obj of theme.value.objects) {
    map.set(obj.id, obj)
  }
  return map
})

/** Diccionario de objetos colocados en el mapa indexados por clave "row,col" */
const placedObjectMap = computed(() => {
  const map = new Map<string, PlacedObject>()
  for (const p of puzzle.value.placedObjects) {
    map.set(`${p.row},${p.col}`, p)
  }
  return map
})

/** Mapa rapido "row,col" -> zoneId para bordes y etiquetas */
const zoneIdGrid = computed(() => {
  const map = new Map<string, string>()
  for (const z of puzzle.value.zones) {
    for (const [r, c] of z.cells) map.set(`${r},${c}`, z.id)
  }
  return map
})

/** Zonas indexadas por id */
const zoneById = computed(() => new Map(puzzle.value.zones.map(z => [z.id, z])))

/** Celda ancla (superior-izquierda) de cada zona para su etiqueta */
const zoneLabelCell = computed(() => {
  const anchors = new Map<string, Zone>()
  for (const z of puzzle.value.zones) {
    if (z.cells.length === 0) continue
    let best: [number, number] = z.cells[0]
    for (const [r, c] of z.cells) {
      if (r < best[0] || (r === best[0] && c < best[1])) best = [r, c]
    }
    anchors.set(`${best[0]},${best[1]}`, z)
  }
  return anchors
})

/**
 * Bordes de delimitacion de zona para una celda (0-indexed).
 * Trazo grueso con el color de la zona donde cambia de zona, fino dentro.
 */
/** Etiquetas de zona posicionadas en px sobre el tablero (sin recortes).
 * El overlay va detras de fichas (z-20), tesoro y descartes (z-10). */
const zoneLabels = computed(() => {
  const list: { id: string; name: string; color: string; top: number; left: number; fontSize: string }[] = []
  for (const [key, zone] of zoneLabelCell.value) {
    const [r, c] = key.split(',').map(Number)
    list.push({
      id: zone.id,
      name: zone.name,
      color: zone.color,
      top: r * cellSize.value + 5,
      left: 28 + c * cellSize.value + 3,
      fontSize: cellSize.value > 40 ? '11px' : '9px',
    })
  }
  return list
})

/** Bordes de delimitacion de zona (ver getZoneEdgeStyle) */
function getZoneEdgeStyle(row: number, col: number) {
  const n = puzzle.value.gridSize
  const id = zoneIdGrid.value.get(`${row},${col}`)
  const color = (id ? zoneById.value.get(id)?.color : undefined) ?? '#3a3550'
  const same = (r: number, c: number) => zoneIdGrid.value.get(`${r},${c}`) === id
  const edge = (border: boolean) => (border ? `2px solid ${color}` : `1px solid ${color}55`)
  return {
    borderTop: edge(row === 0 || !same(row - 1, col)),
    borderRight: edge(col === n - 1 || !same(row, col + 1)),
    borderBottom: edge(row === n - 1 || !same(row + 1, col)),
    borderLeft: edge(col === 0 || !same(row, col - 1)),
  }
}

/** Obtiene la zona correspondiente a una coordenada (0-indexed) */
function getCellZone(row: number, col: number): Zone | undefined {
  return puzzle.value.zones.find(z => z.cells.some(([r, c]) => r === row && c === col))
}

/** Obtiene el objeto colocado en una celda (0-indexed) */
function getCellObject(row: number, col: number): { placed: PlacedObject; info: MapObject } | undefined {
  const placed = placedObjectMap.value.get(`${row},${col}`)
  if (!placed) return undefined
  const info = objectMap.value.get(placed.objectId)
  if (!info) return undefined
  return { placed, info }
}

/** Obtiene el personaje que ocupa la celda (en solución oficial o por colocación del jugador) */
function getCellCharacter(row: number, col: number): Character | undefined {
  if (showSolution.value) {
    // Modo solución: posiciones oficiales
    return puzzle.value.characters.find(c => c.row === row && c.col === col)
  }

  // Modo juego interactivo: ficha colocada por el jugador
  for (const [charId, pos] of Object.entries(playerPlacements)) {
    if (pos.row === row && pos.col === col) {
      return puzzle.value.characters.find(c => c.id === charId)
    }
  }
  return undefined
}

/** Comprueba si una celda es la del Tesoro */
function isTreasureCell(row: number, col: number): boolean {
  return showSolution.value &&
    row === puzzle.value.treasureRow - 1 &&
    col === puzzle.value.treasureCol - 1
}

/** Notificación efímera */
function notify(text: string, type: 'warning' | 'success' | 'info' = 'info') {
  notificationMsg.value = { text, type }
  setTimeout(() => {
    if (notificationMsg.value?.text === text) {
      notificationMsg.value = null
    }
  }, 3500)
}

// ============================================================
// ACCIONES DE COLOCACIÓN INTERACTIVA
// ============================================================

/** Seleccionar o deseleccionar un sospechoso */
function selectCharacter(id: string) {
  if (selectedCharacterId.value === id) {
    selectedCharacterId.value = null
  } else {
    selectedCharacterId.value = id
    const char = puzzle.value.characters.find(c => c.id === id)
    if (char) {
      notify(`Seleccionado: ${char.name}. Haz clic en una casilla para colocarlo.`, 'info')
    }
  }
}

/** Ficha arrastrada desde el panel (drag & drop) */
const draggingCharacterId = ref<string | null>(null)

/** Celda resaltada como destino durante el arrastre */
const dropCell = ref<{ row: number; col: number } | null>(null)

/**
 * Coloca la ficha de un personaje en una celda (0-indexed).
 * Reutilizada por el clic y por el arrastre.
 * @returns true si la ficha quedo colocada
 */
function placeCharacter(charId: string, row: number, col: number): boolean {
  const char = puzzle.value.characters.find(c => c.id === charId)
  const cellObj = getCellObject(row, col)

  if (cellObj && !cellObj.info.occupiable) {
    notify(`No se puede ocupar: hay ${cellObj.info.name} (${cellObj.info.emoji}), que es un objeto fijo no ocupable.`, 'warning')
    return false
  }

  moves.value++
  delete excludedCells[`${row},${col}`]
  playerPlacements[charId] = { row, col }
  if (cellObj && cellObj.info.occupiable) {
    notify(`¡${char?.name} colocado sobre ${cellObj.info.name.toLowerCase()}!`, 'success')
  } else {
    notify(`${char?.name} colocado en Fila ${row + 1}, Columna ${col + 1}.`, 'success')
  }
  if (selectedCharacterId.value === charId) selectedCharacterId.value = null
  return true
}

/** Inicio del arrastre de un sospechoso hacia el mapa */
function onSuspectDragStart(e: DragEvent, charId: string) {
  draggingCharacterId.value = charId
  selectedCharacterId.value = charId
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', charId)
    e.dataTransfer.effectAllowed = 'move'
  }
}

/** Fin del arrastre (se coloque o no) */
function onSuspectDragEnd() {
  draggingCharacterId.value = null
  dropCell.value = null
}

/** Paso sobre una celda durante el arrastre */
function onCellDragOver(e: DragEvent, row: number, col: number) {
  if (showSolution.value || !draggingCharacterId.value) return
  e.preventDefault()
  dropCell.value = { row, col }
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

/** Soltado de la ficha sobre una celda del mapa */
function onCellDrop(row: number, col: number) {
  const charId = draggingCharacterId.value
  draggingCharacterId.value = null
  dropCell.value = null
  if (!charId || showSolution.value) return
  placeCharacter(charId, row, col)
}

/** Manejar clic en una celda del mapa */
function handleCellClick(row: number, col: number) {
  if (showSolution.value) {
    notify('Estás en Modo Revelar Solución. Desactívalo para jugar interactivamente.', 'info')
    return
  }

  // 1. Si ya hay una ficha del jugador en esta celda, quitarla
  for (const [charId, pos] of Object.entries(playerPlacements)) {
    if (pos.row === row && pos.col === col) {
      delete playerPlacements[charId]
      notify('Ficha retirada de la casilla.', 'info')
      return
    }
  }

  // 2. Si hay un sospechoso seleccionado, intentar colocarlo
  if (selectedCharacterId.value) {
    placeCharacter(selectedCharacterId.value, row, col)
    return
  }

  // 3. Si no hay sospechoso seleccionado, mostrar información de la casilla
  const cellObj = getCellObject(row, col)
  const zone = getCellZone(row, col)
  if (cellObj) {
    if (cellObj.info.occupiable) {
      notify(`Casilla F${row + 1} C${col + 1} (${zone?.name ?? 'Zona'}): contiene ${cellObj.info.name} (¡se puede ocupar!).`, 'info')
    } else {
      notify(`Casilla F${row + 1} C${col + 1} (${zone?.name ?? 'Zona'}): contiene ${cellObj.info.name} (objeto fijo no ocupable).`, 'info')
    }
  } else {
    notify(`Casilla F${row + 1} C${col + 1} (${zone?.name ?? 'Zona'}): terreno libre.`, 'info')
  }
}

/** Marca o desmarca una casilla como descartada (clic derecho) */
function toggleExclude(row: number, col: number) {
  if (showSolution.value) return
  for (const pos of Object.values(playerPlacements)) {
    if (pos.row === row && pos.col === col) return
  }
  const key = `${row},${col}`
  if (excludedCells[key]) delete excludedCells[key]
  else excludedCells[key] = true
}

/** Indica si una casilla (0-indexed) esta descartada */
function isExcluded(row: number, col: number): boolean {
  return !!excludedCells[`${row},${col}`]
}

/** Descolocar un sospechoso desde el panel */
function removeCharacterPlacement(charId: string) {
  moves.value++
  delete playerPlacements[charId]
}

/** Limpiar todas las fichas del jugador */
function resetPlacements() {
  for (const key of Object.keys(playerPlacements)) {
    delete playerPlacements[key]
  }
  for (const key of Object.keys(excludedCells)) {
    delete excludedCells[key]
  }
  notify('Tablero reiniciado. Todas las fichas han vuelto al panel.', 'info')
}

// ============================================================
// ESTILOS VISUALES DEL MAPA
// ============================================================

/** Tamaño responsivo de cada casilla en píxeles ajustado con el zoom */
const cellSize = computed(() => {
  const n = puzzle.value.gridSize
  let base = 28
  if (n <= 6) base = 60
  else if (n <= 9) base = 46
  else if (n <= 12) base = 38
  else if (n <= 18) base = 30
  else base = 26
  return Math.round(base * zoom.value)
})

function getZoneCellStyle(zone?: Zone) {
  if (!zone) return { background: '#111019' }
  const hex = zone.color
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return {
    background: `radial-gradient(circle at 50% 50%, rgba(${r},${g},${b},0.24) 0%, rgba(${r},${g},${b},0.12) 100%)`,
    borderColor: `rgba(${r},${g},${b},0.35)`
  }
}

function getClueTypeLabel(type: ClueType): string {
  const map: Record<ClueType, string> = {
    zone: '📍 Zona',
    adjacency: '📦 Adyacencia / Objeto',
    relative: '↔️ Posición Relativa',
    row: '↕️ Fila / Nivel',
    column: '↔️ Columna',
    special: '✨ Especial',
  }
  return map[type] ?? '📌 Pista'
}

/** Número de personajes colocados por el jugador */
const placedCount = computed(() => Object.keys(playerPlacements).length)

/** Indica si todas las fichas del jugador están colocadas correctamente */
const isSolved = computed(() => {
  // Si estamos en modo solución, siempre está resuelto
  if (showSolution.value) return true
  
  // Verificar que todos los personajes estén colocados
  if (placedCount.value !== puzzle.value.characters.length) return false
  
  // Verificar que cada personaje esté en su posición correcta
  for (const [charId, pos] of Object.entries(playerPlacements)) {
    const char = puzzle.value.characters.find(c => c.id === charId)
    if (!char) return false
    if (char.row !== pos.row || char.col !== pos.col) return false
  }
  
  return true
})

// Watcher para detectar cuando el puzzle se resuelve (debe ir tras isSolved y notify)
watch(isSolved, (solved) => {
  if (solved && !showSolution.value) {
    notify('¡Felicidades! Has resuelto el puzzle correctamente.', 'success')
    // Desactivar temporalmente la notificación para evitar spam
    setTimeout(() => {
      notificationMsg.value = null
    }, 100)
  }
})

/** Celdas con fila o columna duplicada (regla Murdoku: 1 por fila/columna) */
const conflictKeys = computed(() => {
  const entries = Object.entries(playerPlacements)
  const byRow = new Map<number, number>()
  const byCol = new Map<number, number>()
  for (const [, pos] of entries) {
    byRow.set(pos.row, (byRow.get(pos.row) ?? 0) + 1)
    byCol.set(pos.col, (byCol.get(pos.col) ?? 0) + 1)
  }
  const keys = new Set<string>()
  for (const [, pos] of entries) {
    if ((byRow.get(pos.row) ?? 0) > 1 || (byCol.get(pos.col) ?? 0) > 1) {
      keys.add(`${pos.row},${pos.col}`)
    }
  }
  return keys
})

/** Hay fichas compartiendo fila o columna */
const hasConflicts = computed(() => conflictKeys.value.size > 0)

/** Indica si una celda (0-indexed) esta en conflicto */
function isConflictCell(row: number, col: number): boolean {
  return conflictKeys.value.has(`${row},${col}`)
}

/** Movimientos del jugador en esta partida */
const moves = ref(0)

/** Cronometro de la partida en segundos */
const seconds = ref(0)
let timer: number | null = null
onMounted(() => {
  timer = window.setInterval(() => {
    seconds.value++
  }, 1000)
  window.addEventListener('keydown', onKeydown)
})

/** Atajos de teclado del tablero */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') selectedCharacterId.value = null
}
onUnmounted(() => {
  if (timer !== null) window.clearInterval(timer)
  window.removeEventListener('keydown', onKeydown)
})

/** Tiempo formateado mm:ss */
const formattedTime = computed(() => {
  const m = Math.floor(seconds.value / 60)
  const s = seconds.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

/**
 * Comprueba cuantas fichas estan bien colocadas sin revelar cuales.
 * Suma un movimiento al usarla.
 */
function checkPlacements() {
  moves.value++
  let ok = 0
  for (const [charId, pos] of Object.entries(playerPlacements)) {
    const char = puzzle.value.characters.find(c => c.id === charId)
    if (char && char.row === pos.row && char.col === pos.col) ok++
  }
  const total = puzzle.value.characters.length
  if (ok === total && placedCount.value === total) {
    notify(`Comprobación: ¡las ${total} fichas están correctas!`, 'success')
  } else {
    notify(`Comprobación: ${ok} de ${total} fichas en su posición correcta.`, 'info')
  }
}

/** Colores del confeti de victoria */
const CONFETTI_COLORS = ['#FFD54A', '#8B5CF6', '#2DD4BF', '#FB7185', '#38BDF8', '#A3E635']

/** Estilo determinista para cada pieza de confeti */
function confettiStyle(i: number) {
  const left = (i * 37) % 100
  const delay = ((i * 13) % 20) / 10
  const dur = 2.2 + ((i * 7) % 10) / 10
  const size = 6 + ((i * 11) % 6)
  return {
    left: `${left}%`,
    background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    width: `${size}px`,
    height: `${size * 0.6}px`,
    animationDelay: `${delay}s`,
    animationDuration: `${dur}s`,
  }
}

/** Numero de fichas contenidas en cada zona (ayuda de deduccion) */
const zoneCounts = computed(() => {
  const counts = new Map<string, number>()
  if (showSolution.value) {
    for (const c of puzzle.value.characters) {
      counts.set(c.zoneId, (counts.get(c.zoneId) ?? 0) + 1)
    }
  } else {
    for (const pos of Object.values(playerPlacements)) {
      const z = puzzle.value.zones.find((zz) =>
        zz.cells.some(([r, c]) => r === pos.row && c === pos.col)
      )
      if (z) counts.set(z.id, (counts.get(z.id) ?? 0) + 1)
    }
  }
  return counts
})

async function regenerate() {
  store.clearPuzzle()
  router.push({ name: 'generating' })
  store.generationStatus = 'generating'
  const success = await store.generate()
  if (!success) router.push({ name: 'home' })
  else router.push({ name: 'puzzle' })
}

function goHome() {
  store.clearPuzzle()
  router.push({ name: 'home' })
}

function useHint() {
  const hintUsed = store.useHint()
  if (!hintUsed) {
    if (store.hintsRemaining === 0) {
      notify('No tienes más pistas disponibles para este puzzle.', 'warning')
    } else {
      notify('No se pudo obtener una pista. Inténtalo de nuevo.', 'warning')
    }
    return
  }
  
  // Encontrar personajes que aún no han sido colocados correctamente
  const unplacedCharacters = puzzle.value.characters.filter(char => {
    const placedPos = playerPlacements[char.id]
    return !placedPos || placedPos.row !== char.row || placedPos.col !== char.col
  })
  
  if (unplacedCharacters.length === 0) {
    notify('No hay personajes sin colocar para dar una pista.', 'warning')
    return
  }
  
  // Seleccionar un personaje al azar entre los no colocados
  const hintChar = unplacedCharacters[Math.floor(Math.random() * unplacedCharacters.length)]
  
  // Colocar automáticamente la ficha en la posición correcta
  playerPlacements[hintChar.id] = { row: hintChar.row, col: hintChar.col }
  notify(`¡Pista! ${hintChar.name} está en Fila ${hintChar.row + 1}, Columna ${hintChar.col + 1}.`, 'info')
}
</script>

<template>
   <main class="min-h-screen w-full px-3 py-5 lg:py-7 max-w-7xl mx-auto flex flex-col gap-6">

     <!-- ===== CABECERA SUPERIOR ===== -->
     <header class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl glass border border-white/10 shadow-xl animate-fade-up">
       <!-- Datos del puzzle -->
       <div class="flex items-center gap-4">
         <div class="w-14 h-14 rounded-2xl bg-linear-to-br from-amber-500/20 to-yellow-600/10 border border-amber-500/40 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/10 flex-none">
           {{ theme.emoji }}
         </div>
         <div>
           <div class="flex items-center gap-2 mb-1 flex-wrap">
             <span class="text-xs font-black tracking-widest uppercase text-amber-400">MURDOKU</span>
             <span class="text-xs text-gray-500">•</span>
             <span class="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
               {{ theme.name }}
             </span>
             <span class="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
               {{ difficulty.name }} ({{ puzzle.gridSize }}×{{ puzzle.gridSize }})
             </span>
             <span v-if="puzzle.id === 'murdoku-official-contest-1'" class="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 font-bold">
               mapa.png &amp; reglas.txt
             </span>
           </div>
           <h1 class="font-display text-2xl lg:text-3xl font-black text-white tracking-tight">
             {{ puzzle.title }}
           </h1>
           <p class="text-xs lg:text-sm text-gray-400 mt-0.5">
             {{ puzzle.description }}
           </p>
         </div>
       </div>

       <!-- Acciones de barra -->
       <div class="flex items-center gap-2.5 flex-wrap">
         <!-- Interruptor Modo Solución / Modo Detective -->
         <button
           id="btn-toggle-solution"
           @click="showSolution = !showSolution"
           class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs lg:text-sm transition-all duration-200 shadow-md cursor-pointer"
           :class="showSolution
             ? 'bg-linear-to-r from-amber-500 to-yellow-400 text-dark-900 shadow-amber-500/25 ring-2 ring-amber-400/50 hover:bg-amber-400 active:scale-95'
             : 'glass border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/40 active:scale-95'"
           :title="showSolution ? 'Ocultar solución y volver al modo detective' : 'Revelar dónde estaba cada sospechoso y el tesoro'"
         >
           <component :is="showSolution ? EyeOff : Eye" class="w-4 h-4" />
           <span>{{ showSolution ? 'Ocultar Solución' : 'Revelar Solución' }}</span>
         </button>

         <button
           id="btn-regenerate"
           @click="regenerate"
           class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass border border-white/10 text-xs lg:text-sm text-gray-300 hover:text-white hover:border-white/25 transition-all duration-200 cursor-pointer"
         >
           <RotateCcw class="w-4 h-4" />
           <span>Nuevo Puzzle</span>
         </button>

         <!-- Botón de Pista -->
         <button
           id="btn-hint"
           @click="useHint"
           :disabled="store.hintsRemaining === 0 || showSolution"
           class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass border border-white/10 text-xs lg:text-sm text-gray-300 hover:text-white hover:border-white/25 transition-all duration-200 cursor-pointer"
         >
           <Lightbulb class="w-4 h-4" />
           <span>{{ store.hintsRemaining }} Pistas</span>
         </button>

         <button
           id="btn-check"
           @click="checkPlacements"
           :disabled="showSolution || placedCount === 0"
           class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass border border-white/10 text-xs lg:text-sm text-gray-300 hover:text-white hover:border-white/25 transition-all duration-200 cursor-pointer disabled:opacity-40"
           title="Cuenta cuántas fichas están bien colocadas sin revelar cuáles"
         >
           <CheckCircle2 class="w-4 h-4" />
           <span>Comprobar</span>
         </button>

         <button
           id="btn-home"
           @click="goHome"
           class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass border border-white/10 text-xs lg:text-sm text-gray-300 hover:text-white transition-all duration-200 cursor-pointer"
         >
           <Home class="w-4 h-4" />
           <span>Inicio</span>
         </button>
       </div>
     </header>

     <!-- ===== NOTIFICACIÓN TOAST REACTIVA ===== -->
     <transition name="fade">
       <div
         v-if="notificationMsg"
         class="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg animate-fade-up"
         :class="{
           'bg-amber-950/80 border-amber-500/40 text-amber-200': notificationMsg.type === 'warning',
           'bg-emerald-950/80 border-emerald-500/40 text-emerald-200': notificationMsg.type === 'success',
           'bg-dark-800/90 border-white/15 text-gray-200': notificationMsg.type === 'info',
         }"
       >
         <AlertTriangle v-if="notificationMsg.type === 'warning'" class="w-4 h-4 flex-none text-amber-400" />
         <CheckCircle2 v-else-if="notificationMsg.type === 'success'" class="w-4 h-4 flex-none text-emerald-400" />
         <Info v-else class="w-4 h-4 flex-none text-sky-400" />
         <span>{{ notificationMsg.text }}</span>
       </div>
     </transition>

     <!-- ===== CONTENIDO PRINCIPAL: MAPA + PANEL LATERAL ===== -->
     <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

       <!-- ============================================================
            SECCIÓN DEL MAPA (TABLERO ILUSTRADO CON COORDENADAS)
            ============================================================ -->
       <section class="xl:col-span-8 flex flex-col gap-4">

         <!-- Marco del mapa -->
         <div class="glass rounded-2xl p-4 lg:p-6 border border-white/10 shadow-2xl relative overflow-hidden bg-linear-to-b from-dark-800/90 to-dark-900/95 backdrop-blur-xl">

           <!-- Barra de controles y estado del mapa -->
           <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
             <div class="flex items-center gap-2">
               <Compass class="w-5 h-5 text-amber-400" />
               <h2 class="font-display font-bold text-base lg:text-lg text-white">
                 Escenario del Caso ({{ puzzle.gridSize }}×{{ puzzle.gridSize }})
               </h2>
               <span
                 class="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                 :class="showSolution ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'"
               >
                 {{ showSolution ? 'Modo Solución Revelada' : 'Modo Detective (Investigación)' }}
               </span>
             </div>

             <!-- Controles visuales (Zoom) -->
             <div class="flex items-center gap-2 text-xs flex-wrap">
               <!-- Controles de Zoom -->
               <div class="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                 <button
                   @click="zoomOut"
                   class="p-1 rounded hover:bg-white/10 text-gray-300 transition-colors cursor-pointer"
                   title="Reducir zoom"
                 >
                   <ZoomOut class="w-3.5 h-3.5" />
                 </button>
                 <button
                   @click="resetZoom"
                   class="px-1.5 py-0.5 text-[10px] font-mono text-amber-400 font-bold cursor-pointer"
                   title="Restablecer zoom"
                 >
                   {{ Math.round(zoom * 100) }}%
                 </button>
                 <button
                   @click="zoomIn"
                   class="p-1 rounded hover:bg-white/10 text-gray-300 transition-colors cursor-pointer"
                   title="Aumentar zoom"
                 >
                   <ZoomIn class="w-3.5 h-3.5" />
                 </button>
               </div>

               <!-- Contador de fichas colocadas -->
               <span v-if="!showSolution" class="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 text-gray-300">
                  <UserCheck class="w-3.5 h-3.5 text-amber-400" />
                  <span>{{ placedCount }} / {{ puzzle.characters.length }}</span>
                </span>
                <span v-if="!showSolution" class="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 text-gray-300" title="Tiempo de partida y movimientos">
                  <Clock class="w-3.5 h-3.5 text-sky-400" />
                  <span class="font-mono">{{ formattedTime }} · {{ moves }} mov.</span>
                </span>
                <span v-if="!showSolution && hasConflicts" class="flex items-center gap-1.5 bg-red-500/20 px-2.5 py-1.5 rounded-lg border border-red-500/40 text-red-300" title="En Murdoku solo puede haber un sospechoso por fila y por columna">
                  <AlertTriangle class="w-3.5 h-3.5" />
                  <span>Fila/col. duplicada</span>
                </span>

               <!-- Indicador de puzzle resuelto -->
               <span v-if="!showSolution && isSolved" class="flex items-center gap-1.5 bg-emerald-500/20 px-2.5 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-300">
                 <CheckCircle2 class="w-3.5 h-3.5" />
                 <span>¡Resuelto!</span>
               </span>

               <button
                 v-if="!showSolution && placedCount > 0"
                 @click="resetPlacements"
                 class="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 transition-colors cursor-pointer"
                 title="Quitar todas las fichas del tablero"
               >
                 Limpiar
               </button>
             </div>
           </div>

           <!-- Contenedor scrollable del tablero con máxima riqueza gráfica -->
           <div class="overflow-auto pb-4 pt-1 flex justify-center max-h-180 rounded-xl border border-white/5 p-2 bg-dark-950/80">

             <!-- TABLERO CON COORDENADAS (FILAS 1..N Y COLUMNAS 1..N) -->
             <div class="inline-flex flex-col select-none">

               <!-- Cabecera de columnas superior (1..N) -->
               <div class="flex items-center ml-7 mb-1">
                 <div
                   v-for="col in puzzle.gridSize"
                   :key="`header-col-${col}`"
                   class="font-mono text-[11px] font-bold text-amber-400/90 text-center flex items-center justify-center"
                   :style="{ width: `${cellSize}px` }"
                 >
                   {{ col }}
                 </div>
               </div>

               <!-- Contenedor de filas (modo tactico por zonas) -->
                <div
                  class="relative rounded-xl overflow-hidden border border-amber-500/30 shadow-2xl"
                >
                  <!-- Etiquetas de zona (capa de fondo, sin recortes) -->
                  <div class="pointer-events-none absolute inset-0" aria-hidden="true">
                    <div
                      v-for="label in zoneLabels"
                      :key="label.id"
                      class="absolute font-display font-black uppercase tracking-wider whitespace-nowrap opacity-50 leading-none"
                      :style="{ top: `${label.top}px`, left: `${label.left}px`, color: label.color, fontSize: label.fontSize, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }"
                    >
                      {{ label.name }}
                    </div>
                  </div>
                 <!-- Filas con índice lateral y celdas -->
                 <div
                   v-for="row in puzzle.gridSize"
                   :key="`row-${row}`"
                   class="flex items-center"
                 >
                   <!-- Índice de fila lateral izquierda (1..N) -->
                   <div class="w-7 font-mono text-[11px] font-bold text-amber-400/90 text-right pr-1.5 flex-none bg-dark-900/60 backdrop-blur-sm h-full flex items-center justify-end">
                     {{ row }}
                   </div>

                   <!-- Celdas de la fila -->
                   <div class="flex">
                     <div
                       v-for="col in puzzle.gridSize"
                       :key="`cell-${row}-${col}`"
                       :id="`cell-${row}-${col}`"
                       @click="handleCellClick(row - 1, col - 1)"
                        @contextmenu.prevent="toggleExclude(row - 1, col - 1)"
                        @dragover="onCellDragOver($event, row - 1, col - 1)"
                        @drop.prevent="onCellDrop(row - 1, col - 1)"
                       @mouseenter="hoveredCell = { row: row - 1, col: col - 1 }"
                       @mouseleave="hoveredCell = null"
                       class="relative border transition-all duration-150 cursor-pointer flex flex-col items-center justify-center p-0.5 group overflow-hidden"
                       :style="{
                         width: `${cellSize}px`,
                         height: `${cellSize}px`,
                         ...getZoneCellStyle(getCellZone(row - 1, col - 1)),
                          ...getZoneEdgeStyle(row - 1, col - 1)
                       }"
                       :class="[
                         hoveredCell?.row === row - 1 && hoveredCell?.col === col - 1 ? 'ring-2 ring-amber-400 ring-inset z-20 brightness-125' : '',
                         isTreasureCell(row - 1, col - 1) ? 'ring-2 ring-yellow-400 bg-yellow-500/40 animate-pulse z-10' : '',
                          isConflictCell(row - 1, col - 1) ? 'ring-2 ring-red-500 ring-inset z-10' : '',
                          (dropCell?.row === row - 1 && dropCell?.col === col - 1) ? 'ring-2 ring-emerald-400 ring-inset z-20 brightness-125' : '',
                          (hoveredCell && (hoveredCell.row === row - 1 || hoveredCell.col === col - 1)) ? 'crosshair-cell' : ''
                        ]"
                     >
                       <!-- 1. OBJETO EN LA CASILLA (SI EXISTE) -->
                       <template v-if="getCellObject(row - 1, col - 1)">
                         <!-- Objeto OCUPABLE (cama, silla, hamaca) según reglas.txt -->
                         <div
                           v-if="getCellObject(row - 1, col - 1)!.info.occupiable"
                           class="seat-spot w-full h-full rounded-md flex flex-col items-center justify-center backdrop-blur-[2px] transition-transform group-hover:scale-105 shadow-sm"
                           :title="`${getCellObject(row - 1, col - 1)!.info.name} (Se puede ocupar)`"
                         >
                           <span class="font-emoji" :style="{ fontSize: cellSize > 40 ? '19px' : '14px' }">
                             {{ getCellObject(row - 1, col - 1)!.info.emoji }}
                           </span>
                           <span
                             v-if="cellSize > 46 && !getCellCharacter(row - 1, col - 1)"
                             class="text-[7px] uppercase tracking-wider font-black text-emerald-300 leading-none mt-0.5"
                           >
                             {{ getCellObject(row - 1, col - 1)!.info.name.slice(0, 5) }}
                           </span>
                         </div>

                         <!-- Objeto FIJO / NO OCUPABLE (árbol, roca, fogata, lápida...) según reglas.txt -->
                         <div
                           v-else
                           class="obstacle-spot w-full h-full rounded-md flex flex-col items-center justify-center border border-white/10 bg-black/40 backdrop-blur-[1px] shadow-inner"
                           :title="`${getCellObject(row - 1, col - 1)!.info.name} (Objeto Fijo - NO se puede ocupar)`"
                         >
                           <span
                             class="font-emoji transition-transform group-hover:scale-110"
                             :class="getCellObject(row - 1, col - 1)!.info.id === 'campfire' ? 'fire-glow' : ''"
                             :style="{ fontSize: cellSize > 40 ? '20px' : '14px' }"
                           >
                             {{ getCellObject(row - 1, col - 1)!.info.emoji }}
                           </span>
                           <span
                             v-if="cellSize > 46"
                             class="text-[7px] text-gray-300 font-bold leading-none mt-0.5 truncate max-w-[90%]"
                           >
                             {{ getCellObject(row - 1, col - 1)!.info.name.slice(0, 6) }}
                           </span>
                         </div>
                       </template>

                       <div
                          v-if="isExcluded(row - 1, col - 1)"
                          class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-red-500/60 font-black"
                          :style="{ fontSize: cellSize > 40 ? '18px' : '12px' }"
                        >
                          &#10005;
                        </div>

                        <!-- 2. FICHA DE PERSONAJE (EN MODO JUEGO O EN SOLUCIÓN) -->
                       <div
                         v-if="getCellCharacter(row - 1, col - 1)"
                         class="token-disc absolute inset-0.5 flex flex-col items-center justify-center z-20 rounded-full animate-scale-in"
                         :title="`Sospechoso: ${getCellCharacter(row - 1, col - 1)!.name}`"
                       >
                         <span class="font-emoji" :style="{ fontSize: cellSize > 40 ? '20px' : '14px' }">
                           {{ getCellCharacter(row - 1, col - 1)!.emoji }}
                         </span>
                          <!-- Rasgo del personaje (sombrero, gafas, parche) -->
                          <span
                            v-if="accessoryEmojis(getCellCharacter(row - 1, col - 1)!)"
                            class="absolute -top-1 -right-1 font-emoji bg-dark-900/95 border border-white/20 rounded-full px-0.5 shadow leading-none"
                            :style="{ fontSize: cellSize > 40 ? '11px' : '9px' }"
                            :title="accessoryTitle(getCellCharacter(row - 1, col - 1)!)"
                          >
                            {{ accessoryEmojis(getCellCharacter(row - 1, col - 1)!) }}
                          </span>
                         <span
                           v-if="cellSize > 36"
                           class="text-amber-200 font-display font-black text-[7px] leading-none mt-0.5 truncate max-w-[90%] bg-dark-900/90 px-1 py-0.5 rounded shadow"
                         >
                           {{ getCellCharacter(row - 1, col - 1)!.name.split(' ')[0] }}
                         </span>
                       </div>

                       <!-- 3. TESORO (SI ESTÁ REVELADO Y ESTA ES LA CASILLA) -->
                       <div
                         v-else-if="isTreasureCell(row - 1, col - 1)"
                         class="treasure-glow absolute inset-0.5 flex flex-col items-center justify-center z-30 rounded-lg animate-bounce border-2 border-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.6)]"
                         title="¡EL TESORO ESTÁ AQUÍ!"
                       >
                         <span class="font-emoji text-2xl animate-bounce">💰</span>
                         <span class="text-[7px] font-black uppercase text-yellow-300 bg-dark-900/90 px-1 rounded shadow">
                           TESORO
                         </span>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>

           <!-- Barra de inspección contextual al pasar el ratón -->
           <div class="mt-3 p-3 rounded-xl bg-black/50 border border-white/5 flex items-center justify-between text-xs text-gray-400 flex-wrap gap-2">
             <div class="flex items-center gap-2 flex-wrap">
               <span class="text-amber-400 font-bold">Casilla:</span>
               <span v-if="hoveredCell" class="font-mono text-white">
                 Fila {{ hoveredCell.row + 1 }} · Columna {{ hoveredCell.col + 1 }}
               </span>
               <span v-else class="text-gray-500 italic">Pasa el ratón sobre una casilla</span>

               <template v-if="hoveredCell">
                 <span class="text-gray-600">•</span>
                 <span class="text-gray-300 font-medium">
                   Zona: {{ getCellZone(hoveredCell.row, hoveredCell.col)?.name ?? 'Terreno' }}
                 </span>
                 <span class="text-gray-600">•</span>
                 <span v-if="getCellObject(hoveredCell.row, hoveredCell.col)" class="flex items-center gap-1 font-semibold" :class="getCellObject(hoveredCell.row, hoveredCell.col)!.info.occupiable ? 'text-emerald-400' : 'text-amber-300'">
                   {{ getCellObject(hoveredCell.row, hoveredCell.col)!.info.emoji }}
                   {{ getCellObject(hoveredCell.row, hoveredCell.col)!.info.name }}
                   ({{ getCellObject(hoveredCell.row, hoveredCell.col)!.info.occupiable ? 'Ocupable' : 'Fijo / NO ocupable' }})
                 </span>
                 <span v-else class="text-gray-400">Suelo libre</span>
               </template>
             </div>

             <!-- Leyenda rápida -->
             <div class="flex items-center gap-3 text-[11px]">
               <span class="flex items-center gap-1">
                 <span class="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500" />
                 <span class="text-emerald-300">Ocupable</span>
               </span>
               <span class="flex items-center gap-1">
                 <span class="w-2.5 h-2.5 rounded bg-white/10 border border-white/20" />
                 <span class="text-gray-400">Fijo (No ocupable)</span>
               </span>
             </div>
           </div>

           <!-- LEYENDA DE ZONAS -->
           <div class="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-2 items-center">
             <span class="text-xs font-bold text-gray-400 mr-1">Zonas del mapa:</span>
             <div
               v-for="zone in puzzle.zones"
               :key="zone.id"
               class="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border"
               :style="{
                 background: (() => {
                   const hex = zone.color;
                   const r = parseInt(hex.slice(1, 3), 16);
                   const g = parseInt(hex.slice(3, 5), 16);
                   const b = parseInt(hex.slice(5, 7), 16);
                   return `rgba(${r},${g},${b},0.15)`
                 })(),
                 borderColor: zone.color + '50',
                 color: zone.color,
               }"
             >
               <span class="w-2 h-2 rounded-full" :style="{ background: zone.color }" />
               <span class="font-medium">{{ zone.name }}</span>
                <span class="opacity-70 font-mono">· {{ zoneCounts.get(zone.id) ?? 0 }}</span>
             </div>
           </div>
         </div>

         <!-- REVELACIÓN DEL TESORO (SOLUCIÓN) -->
         <transition name="fade">
           <div
             v-if="showSolution"
             class="p-5 rounded-2xl glass border border-amber-500/30 bg-linear-to-r from-amber-500/10 via-yellow-500/5 to-transparent shadow-xl animate-fade-up"
           >
             <div class="flex items-center gap-3">
               <div class="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl flex-none shadow">
                 💰
               </div>
               <div class="flex-1">
                 <div class="flex items-center gap-2">
                   <span class="text-xs font-bold text-amber-400 uppercase tracking-widest">Coordenadas del Tesoro</span>
                   <span class="text-xs text-gray-500">• El cruce de la última fila y columna libres (reglas.txt)</span>
                 </div>
                 <p class="font-mono text-xl font-black text-white mt-0.5">
                   Fila {{ puzzle.treasureRow }} · Columna {{ puzzle.treasureCol }}
                 </p>
                 <p class="text-xs text-gray-400">
                   En la zona: <span class="text-amber-300 font-semibold">{{ getCellZone(puzzle.treasureRow - 1, puzzle.treasureCol - 1)?.name ?? 'Barco / Terreno' }}</span>
                 </p>
               </div>
             </div>
           </div>
         </transition>

       </section>

       <!-- ============================================================
            PANEL LATERAL: PISTAS, SOSPECHOSOS Y REGLAS
            ============================================================ -->
       <aside class="xl:col-span-4 flex flex-col gap-4">

         <!-- Selector de pestañas auxiliares -->
         <div class="flex p-1 rounded-xl glass border border-white/5 w-full">
           <button
             v-for="tab in [
                              { id: 'suspects', label: `Sospechosos (${puzzle.characters.length})`, icon: Users },
               { id: 'legend', label: 'Reglas', icon: HelpCircle },
             ]"
             :key="tab.id"
             :id="`tab-${tab.id}`"
             @click="activeTab = tab.id as any"
             class="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
             :class="activeTab === tab.id
               ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
               : 'text-gray-400 hover:text-gray-200'"
           >
             <component :is="tab.icon" class="w-3.5 h-3.5" />
             <span>{{ tab.label }}</span>
           </button>
         </div>

         <!-- 1. PESTAÑA: SOSPECHOSOS Y PISTAS -->
          <div v-if="activeTab === 'suspects'" class="flex flex-col gap-3 animate-scale-in">
            <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              <p class="font-bold flex items-center gap-1.5 mb-1">
                <Sparkles class="w-3.5 h-3.5" />
                ¿Cómo colocar sospechosos?
              </p>
              <p class="text-gray-300">
                Arrastra un personaje hasta una casilla del mapa, o púlsalo para seleccionarlo y haz clic en una casilla. Clic derecho en una casilla la marca como descartada (X).
              </p>
            </div>

            <div class="flex gap-2">
              <input
                v-model="clueQuery"
                type="text"
                placeholder="Buscar personaje, pista o rasgo..."
                aria-label="Buscar personaje, pista o rasgo"
                class="flex-1 min-w-0 glass rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-200 placeholder:text-gray-600 outline-none focus:border-amber-500/50 transition-colors"
              />
              <select
                v-model="clueTypeFilter"
                aria-label="Filtrar por tipo de pista"
                class="glass rounded-lg border border-white/10 px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-amber-500/50 transition-colors bg-dark-800"
              >
                <option value="all">Todos los tipos</option>
                <option value="zone">Zona</option>
                <option value="adjacency">Adyacencia</option>
                <option value="relative">Relativa</option>
                <option value="row">Fila</option>
                <option value="column">Columna</option>
                <option value="special">Especial</option>
              </select>
            </div>
            <label class="flex items-center gap-2 text-xs text-gray-400 px-1 cursor-pointer select-none">
              <input v-model="showOnlyUnplaced" type="checkbox" class="accent-amber-500 w-3.5 h-3.5" />
              <span>Solo sin colocar ({{ puzzle.characters.length - placedCount }})</span>
            </label>
            <p v-if="filteredSuspects.length === 0" class="text-center text-xs text-gray-500 py-4">Sin sospechosos para ese filtro.</p>
            <div class="flex flex-col gap-2 max-h-145 overflow-y-auto pr-1">
              <div
                v-for="char in filteredSuspects"
                :key="char.id"
                draggable="true"
                @dragstart="onSuspectDragStart($event, char.id)"
                @dragend="onSuspectDragEnd"
                @click="selectCharacter(char.id)"
                class="glass rounded-xl p-3 border transition-all duration-200 cursor-grab active:cursor-grabbing"
                :class="[
                  selectedCharacterId === char.id
                    ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/30'
                    : 'border-white/5 hover:border-white/20',
                  draggingCharacterId === char.id ? 'opacity-50 ring-2 ring-amber-400/60' : '',
                  playerPlacements[char.id] ? 'opacity-90' : ''
                ]"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="relative w-9 h-9 rounded-xl bg-dark-700 border border-white/10 flex items-center justify-center text-lg font-emoji flex-none">
                      {{ char.emoji }}
                      <!-- Emoji del rasgo junto al del personaje -->
                      <span
                        v-if="accessoryEmojis(char)"
                        class="absolute -bottom-1.5 -right-1.5 text-[11px] font-emoji bg-dark-900 border border-white/20 rounded-full px-0.5 shadow leading-none"
                        :title="accessoryTitle(char)"
                      >{{ accessoryEmojis(char) }}</span>
                    </div>
                    <div class="min-w-0">
                      <p class="font-display font-bold text-xs text-white truncate">{{ char.name }}</p>
                      <div v-if="getCharacterAccessories(char).length > 0" class="flex items-center gap-1 mt-0.5 flex-wrap">
                        <span
                          v-for="acc in getCharacterAccessories(char)"
                          :key="acc"
                          class="text-[9px] px-1 py-0.2 rounded border inline-flex items-center gap-0.5"
                          :class="accessoryBadgeClass(acc)"
                          :title="ACCESSORY_META[acc].selfSentence"
                        >{{ ACCESSORY_META[acc].emoji }} {{ ACCESSORY_META[acc].label }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Estado de colocación -->
                  <div class="flex items-center gap-2 flex-none">
                    <span
                      v-if="playerPlacements[char.id]"
                      class="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                    >
                      F{{ playerPlacements[char.id].row + 1 }} C{{ playerPlacements[char.id].col + 1 }}
                    </span>
                    <span v-else class="text-[10px] text-gray-500 italic">
                      Sin colocar
                    </span>

                    <button
                      v-if="playerPlacements[char.id]"
                      @click.stop="removeCharacterPlacement(char.id)"
                      @dragstart.stop
                      class="text-xs text-gray-500 hover:text-red-400 p-1 cursor-pointer"
                      title="Quitar del tablero"
                    >
                      X
                    </button>
                  </div>
                </div>

                <!-- Pista del personaje -->
                <div v-if="clueByCharacter.get(char.id)" class="mt-2.5 pt-2 border-t border-white/5">
                  <p class="text-[10px] text-amber-400/90 font-medium mb-1">
                    {{ getClueTypeLabel(clueByCharacter.get(char.id)!.type) }}
                  </p>
                  <p class="text-xs text-gray-300 leading-relaxed italic whitespace-pre-line">
                    "{{ clueByCharacter.get(char.id)!.text }}"
                  </p>
                </div>
              </div>
            </div>
          </div>

<!-- 2. PESTAÑA: REGLAS (reglas.txt) -->
         <div v-if="activeTab === 'legend'" class="flex flex-col gap-3 animate-scale-in text-xs text-gray-300">
           <!-- Reglas de reglas.txt -->
           <div class="glass rounded-xl p-4 border border-white/5 space-y-2">
             <h3 class="font-display font-bold text-white text-sm flex items-center gap-1.5">
               <HelpCircle class="w-4 h-4 text-amber-400" />
               Reglas Especiales (reglas.txt)
             </h3>
             <ul class="space-y-1.5 text-gray-300 list-disc list-inside">
               <li>Esta vez no hay asesino, encuentra las coordenadas del <strong>Tesoro</strong> para resolver este caso. El Tesoro está en la última casilla de todas.</li>
               <li>Las <strong>Balandras</strong>, las <strong>Fragatas</strong> y el <strong>Galeón</strong> cuentan como barcos, y cada uno cuenta como su propia zona.</li>
               <li>La <strong>cama, silla y hamaca</strong> se pueden ocupar.</li>
               <li>La <strong>fogata, árbol, flores, tiburón, saco, cerdo, lápida, caja, cuerda, barril, estantería, arbusto, mesa y roca</strong> no se pueden ocupar.</li>
               <li>El Tesoro puede estar enterrado bajo un objeto que normalmente no se puede ocupar.</li>
             </ul>
           </div>

           <!-- Clasificación de objetos -->
           <div class="glass rounded-xl p-4 border border-white/5 space-y-3">
             <h3 class="font-display font-bold text-white text-sm">Objetos en el escenario</h3>

             <!-- Ocupables -->
             <div>
               <p class="text-emerald-400 font-bold mb-1.5 flex items-center gap-1">
                 <span>✅ Se PUEDEN ocupar:</span>
               </p>
               <div class="flex flex-wrap gap-1.5">
                 <span
                   v-for="obj in theme.objects.filter(o => o.occupiable)"
                   :key="obj.id"
                   class="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                 >
                   {{ obj.emoji }} {{ obj.name }}
                 </span>
               </div>
             </div>

             <!-- No ocupables -->
             <div class="pt-2 border-t border-white/5">
               <p class="text-amber-400 font-bold mb-1.5 flex items-center gap-1">
                 <span>⛔ Fijos / NO ocupables (referencias para pistas):</span>
               </p>
               <div class="flex flex-wrap gap-1.5">
                 <span
                   v-for="obj in theme.objects.filter(o => !o.occupiable)"
                   :key="obj.id"
                   class="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300"
                 >
                   {{ obj.emoji }} {{ obj.name }}
                 </span>
               </div>
             </div>
           </div>
         </div>
       </aside>

     </div>

      <!-- Lluvia de confeti al resolver -->
      <transition name="fade">
        <div
          v-if="!showSolution && isSolved"
          class="pointer-events-none fixed inset-0 z-40 overflow-hidden"
          aria-hidden="true"
        >
          <div
            v-for="i in 40"
            :key="i"
            class="confetti-piece"
            :style="confettiStyle(i)"
          />
        </div>
      </transition>

   </main>
</template>