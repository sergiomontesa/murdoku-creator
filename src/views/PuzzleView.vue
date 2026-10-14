<script setup lang="ts">
/**
 * Vista interactiva del mapa Murdoku.
 * Soporta dos modos: búsqueda del tesoro y asesino clásico (con víctima).
 * El jugador coloca las fichas y, en modo asesino, además acusa al culpable.
 */
import { computed, ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  RotateCcw, Home, Users,
  EyeOff, Eye,
  HelpCircle, CheckCircle2, AlertTriangle, Sparkles,
  Compass, Info, UserCheck, ZoomIn, ZoomOut, Clock,
  Lightbulb, Gavel, Undo2, Pencil
} from 'lucide-vue-next'
import { usePuzzleStore } from '@/stores/puzzle'
import { getTheme, getDifficulty } from '@/data/themes'
import { ACCESSORY_META, ACCESSORY_LIST, getCharacterAccessories, GAME_MODES } from '@/types/puzzle'
import type { Zone, Character, Clue, ClueType, PlacedObject, MapObject, AccessoryId, ZoneType } from '@/types/puzzle'

const router = useRouter()
const store = usePuzzleStore()
const puzzle = computed(() => store.currentPuzzle!)

const theme = computed(() => getTheme(puzzle.value.theme))
const difficulty = computed(() => getDifficulty(puzzle.value.difficulty))

/** true en el modo clásico con víctima y asesino */
const isMurderMode = computed(() => (puzzle.value.mode ?? 'treasure') === 'murder')
/** Metadatos del modo actual para insignias */
const modeInfo = computed(() => GAME_MODES[isMurderMode.value ? 'murder' : 'treasure'])
/** Víctima del caso (solo modo asesino) */
const victim = computed(() =>
  puzzle.value.characters.find((c) => c.isVictim || c.id === puzzle.value.victimId),
)
/** Zona donde apareció la víctima (solo modo asesino) */
const victimZone = computed(() => {
  if (!victim.value) return undefined
  return puzzle.value.zones.find((z) => z.id === victim.value!.zoneId)
})

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

/** Marcas candidatas por personaje: charId -> celdas posibles (lápiz) */
const candidateMarks = reactive<Record<string, Array<{ row: number; col: number }>>>({})

/** Modo candidatas: los clics marcan casillas posibles en vez de colocar */
const candidateMode = ref(false)

/** Foto del tablero para Deshacer (fichas colocadas + marcas candidatas) */
const placementHistory = ref<Array<{
  placements: Record<string, { row: number; col: number }>
  candidates: Record<string, Array<{ row: number; col: number }>>
}>>([])
const MAX_UNDO = 50

/** Casillas descartadas por el jugador (marca X): clave "row,col" */
const excludedCells = reactive<Record<string, boolean>>({})

/** Pestaña activa del panel auxiliar */
const activeTab = ref<'suspects' | 'legend'>('suspects')

/** Sospechoso acusado por el jugador (solo modo asesino) */
const accusedCharacterId = ref<string | null>(null)

/** Indica si la acusación actual es correcta (solo modo asesino) */
const isAccusationCorrect = computed(() => {
  if (!isMurderMode.value) return false
  return accusedCharacterId.value !== null && accusedCharacterId.value === puzzle.value.murdererId
})

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
/** Filtrar sospechosos por zona ('all' = todas) */
const zoneFilter = ref<string>('all')
/** Mostrar siempre los nombres de los objetos */
const showObjectNames = ref(false)
/** Sospechosos filtrados por colocación, texto, tipo de pista y zona */
const filteredSuspects = computed(() => {
  const q = clueQuery.value.trim().toLowerCase()
  return puzzle.value.characters.filter((c) => {
    if (showOnlyUnplaced.value && playerPlacements[c.id]) return false
    const clue = clueByCharacter.value.get(c.id)
    if (clueTypeFilter.value !== 'all' && clue?.type !== clueTypeFilter.value) return false
    if (zoneFilter.value !== 'all' && c.zoneId !== zoneFilter.value) return false
    // La búsqueda incluye nombre, pista y rasgos (sombrero, gafas, parche, bufanda, bastón, anillo, medalla)
    if (q) {
      const traits = getCharacterAccessories(c).map((a) => ACCESSORY_META[a].label).join(' ')
      if (!(`${c.name} ${clue?.text ?? ''} ${traits}`.toLowerCase().includes(q))) return false
    }
    return true
  })
})

/** Clases de la insignia de cada rasgo */
const ACCESSORY_BADGE_CLASSES: Record<AccessoryId, string> = {
  hat: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  glasses: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  eyepatch: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  scarf: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  cane: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  ring: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  medal: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
}

function accessoryBadgeClass(id: AccessoryId): string {
  return ACCESSORY_BADGE_CLASSES[id] ?? 'bg-white/10 text-gray-300 border-white/20'
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

/** Zona sobrevolada en la leyenda (resaltado temporal) */
const hoveredLegendZoneId = ref<string | null>(null)

/** Zona fijada con clic en la leyenda (resaltado persistente) */
const pinnedZoneId = ref<string | null>(null)

/** Zona con resaltado activo: manda el hover, si no la fijada */
const highlightZoneId = computed(() => hoveredLegendZoneId.value ?? pinnedZoneId.value)

/** Zona de la casilla inspeccionada (para iluminar su pastilla en la leyenda) */
const hoveredZoneId = computed(() => {
  if (!hoveredCell.value) return null
  return getCellZone(hoveredCell.value.row, hoveredCell.value.col)?.id ?? null
})

/** Indica si una celda pertenece a la zona resaltada (0-indexed) */
function isZoneHighlighted(row: number, col: number): boolean {
  const hz = highlightZoneId.value
  if (!hz) return false
  return zoneIdGrid.value.get(`${row},${col}`) === hz
}

/** Fija o suelta el resaltado de una zona desde la leyenda */
function togglePinZone(zoneId: string) {
  pinnedZoneId.value = pinnedZoneId.value === zoneId ? null : zoneId
}

/** Tipo de zona de una celda para su textura (0-indexed) */
function cellZoneType(row: number, col: number): ZoneType {
  return getCellZone(row, col)?.type ?? 'outdoor'
}

/**
 * Bordes de delimitacion de zona para una celda (0-indexed).
 * Trazo grueso con el color de la zona donde cambia de zona, fino dentro.
 */
/** Etiquetas de zona ajustadas a cada zona: se colocan sobre el subtramo
 * libre de objetos más largo de las 2 filas superiores (para que ningún
 * objeto las tape) y se recortan con puntos suspensivos a su ancho
 * (para no salirse de la zona). El nombre completo vive en el tooltip,
 * la leyenda y el inspector de casilla.
 * El overlay va detras de fichas (z-20), tesoro y descartes (z-10). */
const zoneLabels = computed(() => {
  const list: { id: string; name: string; color: string; borderColor: string; top: number; left: number; fontSize: string; maxWidth: number; row: number; col: number }[] = []
  // Celdas con objeto (la etiqueta las evita para que no la tapen)
  const occupied = new Set(puzzle.value.placedObjects.map(p => `${p.row},${p.col}`))
  for (const zone of puzzle.value.zones) {
    if (zone.cells.length === 0) continue
    const rows = [...new Set(zone.cells.map(([r]) => r))].sort((a, b) => a - b)
    let best = { row: -1, col: -1, len: 0 }
    let fallback = { row: -1, col: -1, len: 0 }
    for (const r of rows.slice(0, 2)) {
      const cols = zone.cells
        .filter(([rr]) => rr === r)
        .map(([, cc]) => cc)
        .sort((a, b) => a - b)
      let run: number[] = []
      const flushRun = () => {
        if (run.length === 0) return
        if (run.length > fallback.len) fallback = { row: r, col: run[0], len: run.length }
        let free: number[] = []
        const flushFree = () => {
          if (free.length > best.len) {
            best = { row: r, col: free[0], len: free.length }
          }
          free = []
        }
        for (const cc of run) {
          if (occupied.has(`${r},${cc}`)) flushFree()
          else free.push(cc)
        }
        flushFree()
        run = []
      }
      for (const cc of cols) {
        if (run.length > 0 && cc !== run[run.length - 1] + 1) flushRun()
        run.push(cc)
      }
      flushRun()
    }
    const chosen = best.len > 0 ? best : fallback.len > 0 ? fallback : null
    if (!chosen) continue
    const width = chosen.len * cellSize.value - 10
    if (width < 40) continue // Tramo diminuto: el nombre vive en la leyenda y el inspector
    list.push({
      id: zone.id,
      name: zone.name,
      color: zone.color,
      borderColor: zone.color,
      top: chosen.row * cellSize.value + 5,
      left: 28 + chosen.col * cellSize.value + 3,
      fontSize: cellSize.value > 40 ? '11px' : '9px',
      maxWidth: width,
      row: chosen.row,
      col: chosen.col,
    })
  }
  return list
})

/** Bordes de delimitacion de zona (ver getZoneEdgeStyle) */
/** Malla fina neutra de celda (los límites entre zonas los dibuja el trazado SVG) */
function getZoneEdgeStyle() {
  const hairline = '1px solid rgba(255,255,255,0.08)'
  return {
    borderTop: hairline,
    borderRight: hairline,
    borderBottom: hairline,
    borderLeft: hairline,
  }
}

/** Esquinas exteriores redondeadas para un marco limpio (0-indexed) */
function cornerClass(row: number, col: number): string {
  const n = puzzle.value.gridSize
  if (row === 0 && col === 0) return 'rounded-tl-[10px]'
  if (row === 0 && col === n - 1) return 'rounded-tr-[10px]'
  if (row === n - 1 && col === 0) return 'rounded-bl-[10px]'
  if (row === n - 1 && col === n - 1) return 'rounded-br-[10px]'
  return ''
}

/** Fronteras entre zonas como segmentos para el trazado SVG.
 * Cada arista compartida se dibuja dos veces (línea doble estilo mapa,
 * una por zona, ligeramente desplazadas) con extremos redondeados. */
const zoneBoundaries = computed(() => {
  const segs: { x1: number; y1: number; x2: number; y2: number; color: string }[] = []
  const n = puzzle.value.gridSize
  const at = (r: number, c: number) => zoneIdGrid.value.get(`${r},${c}`)
  const colorOf = (id: string | undefined) =>
    (id ? zoneById.value.get(id)?.color : undefined) ?? '#3a3550'
  const OFF = 0.035
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const id = at(r, c)
      if (!id) continue
      const right = c + 1 < n ? at(r, c + 1) : id
      const down = r + 1 < n ? at(r + 1, c) : id
      if (right && right !== id) {
        segs.push({ x1: c + 1 - OFF, y1: r, x2: c + 1 - OFF, y2: r + 1, color: colorOf(id) })
        segs.push({ x1: c + 1 + OFF, y1: r, x2: c + 1 + OFF, y2: r + 1, color: colorOf(right) })
      }
      if (down && down !== id) {
        segs.push({ x1: c, y1: r + 1 - OFF, x2: c + 1, y2: r + 1 - OFF, color: colorOf(id) })
        segs.push({ x1: c, y1: r + 1 + OFF, x2: c + 1, y2: r + 1 + OFF, color: colorOf(down) })
      }
    }
  }
  return segs
})

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

/** Comprueba si una celda es la del Tesoro (solo modo tesoro) */
function isTreasureCell(row: number, col: number): boolean {
  if (isMurderMode.value) return false
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
// DESHACER (UNDO DE COLOCAR / MOVER / QUITAR FICHAS)
// ============================================================

/** Guarda una foto del estado actual para poder deshacerlo después */
function snapshotPlacements() {
  placementHistory.value.push({
    placements: JSON.parse(JSON.stringify(playerPlacements)),
    candidates: JSON.parse(JSON.stringify(candidateMarks)),
  })
  if (placementHistory.value.length > MAX_UNDO) placementHistory.value.shift()
}

/** Indica si hay algún movimiento que deshacer */
const canUndo = computed(() => placementHistory.value.length > 0)

/** Restaura la última foto guardada (colocar, mover, quitar o candidatas) */
function undo() {
  const prev = placementHistory.value.pop()
  if (!prev) {
    notify('No hay movimientos que deshacer.', 'info')
    return
  }
  for (const key of Object.keys(playerPlacements)) delete playerPlacements[key]
  for (const [charId, pos] of Object.entries(prev.placements)) {
    playerPlacements[charId] = { row: pos.row, col: pos.col }
  }
  for (const key of Object.keys(candidateMarks)) delete candidateMarks[key]
  for (const [charId, cells] of Object.entries(prev.candidates)) {
    candidateMarks[charId] = cells.map((p) => ({ row: p.row, col: p.col }))
  }
  notify('Movimiento deshecho.', 'info')
}

// ============================================================
// MARCAS CANDIDATAS (LÁPIZ)
// ============================================================

/** Candidatas por casilla: clave "row,col" -> ids de personaje */
const candidatesByCell = computed(() => {
  const map = new Map<string, string[]>()
  for (const [charId, cells] of Object.entries(candidateMarks)) {
    for (const pos of cells) {
      const key = `${pos.row},${pos.col}`
      const arr = map.get(key) ?? []
      arr.push(charId)
      map.set(key, arr)
    }
  }
  return map
})

/** Número total de marcas candidatas en el tablero */
const totalCandidates = computed(() =>
  Object.values(candidateMarks).reduce((n, cells) => n + cells.length, 0),
)

/** Activa o desactiva el modo candidatas */
function toggleCandidateMode() {
  if (showSolution.value) return
  candidateMode.value = !candidateMode.value
  notify(candidateMode.value
    ? 'Modo candidatas: pulsa casillas para marcarlas como posibles del seleccionado (otra pulsación la quita). Arrastrar sigue colocando.'
    : 'Modo candidatas desactivado.', 'info')
}

/** Marca o desmarca una casilla como posible para un personaje */
function toggleCandidate(charId: string, row: number, col: number) {
  for (const [otherId, pos] of Object.entries(playerPlacements)) {
    if (pos.row === row && pos.col === col) {
      const other = puzzle.value.characters.find(c => c.id === otherId)
      notify(`Casilla ocupada por ${other?.name ?? 'otro sospechoso'}.`, 'warning')
      return
    }
  }
  const char = puzzle.value.characters.find(c => c.id === charId)
  const list = candidateMarks[charId] ?? []
  snapshotPlacements()
  if (list.some(p => p.row === row && p.col === col)) {
    candidateMarks[charId] = list.filter(p => !(p.row === row && p.col === col))
    if (candidateMarks[charId].length === 0) delete candidateMarks[charId]
    notify(`Marca candidata eliminada para ${char?.name ?? 'sospechoso'}.`, 'info')
  } else {
    candidateMarks[charId] = [...list, { row, col }]
    notify(`Casilla F${row + 1} C${col + 1} marcada como posible para ${char?.name ?? 'sospechoso'}.`, 'info')
  }
}

/** Fija una candidata: la convierte en la ficha colocada y borra el resto */
function lockCandidate(charId: string, row: number, col: number) {
  const list = candidateMarks[charId] ?? []
  if (!list.some(p => p.row === row && p.col === col)) return
  const reason = placementBlockedReason(charId, row, col)
  if (reason) {
    notify(reason, 'warning')
    return
  }
  snapshotPlacements()
  moves.value++
  delete candidateMarks[charId]
  delete excludedCells[`${row},${col}`]
  playerPlacements[charId] = { row, col }
  const char = puzzle.value.characters.find(c => c.id === charId)
  notify(`${char?.name ?? 'Sospechoso'} fijado en Fila ${row + 1}, Columna ${col + 1}.`, 'success')
  if (selectedCharacterId.value === charId) selectedCharacterId.value = null
}

/** Elimina una marca candidata concreta */
function removeCandidate(charId: string, row: number, col: number) {
  const list = candidateMarks[charId]
  if (!list) return
  snapshotPlacements()
  candidateMarks[charId] = list.filter(p => !(p.row === row && p.col === col))
  if (candidateMarks[charId].length === 0) delete candidateMarks[charId]
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

/** Ficha arrastrada (desde el panel o desde una casilla del tablero) */
const draggingCharacterId = ref<string | null>(null)

/** Origen del arrastre: casilla del tablero (null si viene del panel) */
const dragOrigin = ref<{ row: number; col: number } | null>(null)

/** Indica si el arrastre terminó soltando sobre una casilla del mapa */
const didDrop = ref(false)

/** Celda resaltada como destino durante el arrastre */
const dropCell = ref<{ row: number; col: number } | null>(null)

/**
 * Coloca la ficha de un personaje en una celda (0-indexed).
 * Reutilizada por el clic y por el arrastre.
 * @returns true si la ficha quedo colocada
 */
/**
 * Motivo por el que una ficha no puede colocarse (null si se puede).
 * Reutilizado por colocar, mover y fijar candidatas.
 */
function placementBlockedReason(charId: string, row: number, col: number): string | null {
  const cellObj = getCellObject(row, col)
  if (cellObj && !cellObj.info.occupiable) {
    return `No se puede ocupar: hay ${cellObj.info.name} (${cellObj.info.emoji}), que es un objeto fijo no ocupable.`
  }
  for (const [otherId, pos] of Object.entries(playerPlacements)) {
    if (otherId !== charId && pos.row === row && pos.col === col) {
      const other = puzzle.value.characters.find(c => c.id === otherId)
      return `Casilla ocupada por ${other?.name ?? 'otro sospechoso'}. Mueve esa ficha primero para liberar la casilla.`
    }
  }
  return null
}

function placeCharacter(charId: string, row: number, col: number): boolean {
  const char = puzzle.value.characters.find(c => c.id === charId)
  const cellObj = getCellObject(row, col)

  // Soltar sobre su propia casilla: no hay cambios, no se guarda historial
  const current = playerPlacements[charId]
  if (current && current.row === row && current.col === col) {
    if (selectedCharacterId.value === charId) selectedCharacterId.value = null
    return true
  }

  const reason = placementBlockedReason(charId, row, col)
  if (reason) {
    notify(reason, 'warning')
    return false
  }

  snapshotPlacements()
  moves.value++
  delete excludedCells[`${row},${col}`]
  // Fijar limpia las candidatas del personaje: ya se sabe dónde va
  delete candidateMarks[charId]
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
  dragOrigin.value = null
  didDrop.value = false
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', charId)
    e.dataTransfer.effectAllowed = 'move'
  }
}

/** Inicio del arrastre de una ficha ya colocada para moverla a otra casilla */
function onTokenDragStart(e: DragEvent, charId: string) {
  if (showSolution.value || !playerPlacements[charId]) {
    e.preventDefault()
    return
  }
  draggingCharacterId.value = charId
  selectedCharacterId.value = charId
  dragOrigin.value = { ...playerPlacements[charId] }
  didDrop.value = false
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', charId)
    e.dataTransfer.effectAllowed = 'move'
  }
}

/** Indica si una celda contiene una ficha del jugador que se puede arrastrar */
function isPlayerToken(row: number, col: number): boolean {
  if (showSolution.value) return false
  return Object.values(playerPlacements).some(pos => pos.row === row && pos.col === col)
}

/** Fin del arrastre: si una ficha del tablero se soltó fuera del mapa, retirarla */
function onSuspectDragEnd() {
  const charId = draggingCharacterId.value
  if (
    charId && dragOrigin.value && !didDrop.value &&
    !showSolution.value && playerPlacements[charId]
  ) {
    snapshotPlacements()
    moves.value++
    delete playerPlacements[charId]
    const char = puzzle.value.characters.find(c => c.id === charId)
    notify(`Ficha de ${char?.name ?? 'sospechoso'} retirada del tablero. Puedes deshacerlo.`, 'info')
  }
  draggingCharacterId.value = null
  dropCell.value = null
  dragOrigin.value = null
  didDrop.value = false
}

/** Paso sobre una celda durante el arrastre */
function onCellDragOver(e: DragEvent, row: number, col: number) {
  if (showSolution.value || !draggingCharacterId.value) return
  e.preventDefault()
  dropCell.value = { row, col }
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

/** Soltado de la ficha sobre una celda del mapa (colocar o mover) */
function onCellDrop(row: number, col: number) {
  const charId = draggingCharacterId.value
  draggingCharacterId.value = null
  dropCell.value = null
  if (!charId || showSolution.value) {
    dragOrigin.value = null
    didDrop.value = false
    return
  }
  didDrop.value = true
  dragOrigin.value = null
  // Soltar sobre su propia casilla: no hacer nada
  const current = playerPlacements[charId]
  if (current && current.row === row && current.col === col) return
  placeCharacter(charId, row, col)
}

/** Manejar clic en una celda del mapa */
function handleCellClick(row: number, col: number) {
  if (showSolution.value) {
    notify('Estás en Modo Revelar Solución. Desactívalo para jugar interactivamente.', 'info')
    return
  }

  // 0. Modo candidatas con sospechoso seleccionado: marcar o desmarcar
  if (candidateMode.value && selectedCharacterId.value) {
    const sel = puzzle.value.characters.find(c => c.id === selectedCharacterId.value)
    const locked = playerPlacements[selectedCharacterId.value]
    if (locked) {
      notify(`${sel?.name ?? 'Sospechoso'} ya está colocado en Fila ${locked.row + 1}, Columna ${locked.col + 1}. Retíralo para marcar candidatas.`, 'info')
      return
    }
    toggleCandidate(selectedCharacterId.value, row, col)
    return
  }

  // 1. Si ya hay una ficha del jugador en esta celda, informar (pulsar ya
  // no la retira: para quitarla hay que arrastrarla fuera del tablero)
  for (const [charId, pos] of Object.entries(playerPlacements)) {
    if (pos.row === row && pos.col === col) {
      const placed = puzzle.value.characters.find(c => c.id === charId)
      notify(`${placed?.name ?? 'Sospechoso'} está en Fila ${row + 1}, Columna ${col + 1}. Arrastra su ficha fuera del tablero para retirarla.`, 'info')
      return
    }
  }

  // 2. Si hay un sospechoso seleccionado, intentar colocarlo
  if (selectedCharacterId.value) {
    placeCharacter(selectedCharacterId.value, row, col)
    return
  }

  // 3. Si no hay sospechoso seleccionado, mostrar información de la casilla
  // (incluidas las candidatas marcadas en ella)
  const cellObj = getCellObject(row, col)
  const zone = getCellZone(row, col)
  const candText = ((candidatesByCell.value.get(`${row},${col}`) ?? [])
    .map(id => puzzle.value.characters.find(c => c.id === id)?.name)
    .filter((n): n is string => !!n).join(', '))
  const candSuffix = candText ? ` Candidatas: ${candText}.` : ''
  if (cellObj) {
    if (cellObj.info.occupiable) {
      notify(`Casilla F${row + 1} C${col + 1} (${zone?.name ?? 'Zona'}): contiene ${cellObj.info.name} (¡se puede ocupar!).${candSuffix}`, 'info')
    } else {
      notify(`Casilla F${row + 1} C${col + 1} (${zone?.name ?? 'Zona'}): contiene ${cellObj.info.name} (objeto fijo no ocupable).${candSuffix}`, 'info')
    }
  } else {
    notify(`Casilla F${row + 1} C${col + 1} (${zone?.name ?? 'Zona'}): terreno libre.${candSuffix}`, 'info')
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
  if (!playerPlacements[charId]) return
  snapshotPlacements()
  moves.value++
  delete playerPlacements[charId]
}

/** Limpiar todas las fichas del jugador */
function resetPlacements() {
  if (Object.keys(playerPlacements).length > 0 || Object.keys(candidateMarks).length > 0) snapshotPlacements()
  for (const key of Object.keys(playerPlacements)) {
    delete playerPlacements[key]
  }
  for (const key of Object.keys(candidateMarks)) {
    delete candidateMarks[key]
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

function getZoneCellStyle(zone?: Zone, row = 0, col = 0) {
  if (!zone) return { background: '#14131c' }
  const hex = zone.color
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Damero sutil + luz cenital + tinte radial de la zona
  const checker = (row + col) % 2 === 0 ? 'rgba(255,255,255,0.028)' : 'rgba(0,0,0,0.10)'
  return {
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(0,0,0,0.22)),' +
      `radial-gradient(circle at 50% 36%, rgba(${r},${g},${b},0.30) 0%, rgba(${r},${g},${b},0.10) 72%),` +
      `linear-gradient(180deg, ${checker}, ${checker})`,
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

/** Indica si todas las fichas están en su posición correcta (sin contar la acusación) */
const placementsCorrect = computed(() => {
  if (placedCount.value !== puzzle.value.characters.length) return false
  for (const [charId, pos] of Object.entries(playerPlacements)) {
    const char = puzzle.value.characters.find(c => c.id === charId)
    if (!char) return false
    if (char.row !== pos.row || char.col !== pos.col) return false
  }
  return true
})

/** Indica si el caso está resuelto según el modo de juego */
const isSolved = computed(() => {
  // Si estamos en modo solución, siempre está resuelto
  if (showSolution.value) return true
  if (!placementsCorrect.value) return false
  // En modo asesino hay que acusar además al culpable correcto
  if (isMurderMode.value) return isAccusationCorrect.value
  return true
})

// Al revelar la solución se abandona el modo candidatas
watch(showSolution, (revealed) => {
  if (revealed) candidateMode.value = false
})

// Watcher para detectar cuando el puzzle se resuelve (debe ir tras isSolved y notify)
watch(isSolved, (solved) => {
  if (solved && !showSolution.value) {
    if (isMurderMode.value) {
      notify('¡Caso resuelto! Colocaste a todos y acusaste al verdadero asesino.', 'success')
    } else {
      notify('¡Felicidades! Has resuelto el puzzle correctamente.', 'success')
    }
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
  const target = e.target as HTMLElement | null
  const typing = !!target && (
    target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' || target.isContentEditable
  )
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) {
    e.preventDefault()
    if (!showSolution.value) undo()
    return
  }
  if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !typing) {
    if (!showSolution.value) toggleCandidateMode()
    return
  }
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
    if (isMurderMode.value && !isAccusationCorrect.value) {
      notify(accusedCharacterId.value
        ? `Las ${total} fichas están correctas, pero tu acusado no es el asesino. Revisa quién se quedó a solas con la víctima.`
        : `Las ${total} fichas están correctas. Ahora acusa al asesino desde su tarjeta.`, 'info')
    } else {
      notify(`Comprobación: ¡las ${total} fichas están correctas!`, 'success')
    }
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
  snapshotPlacements()
  playerPlacements[hintChar.id] = { row: hintChar.row, col: hintChar.col }
  delete candidateMarks[hintChar.id]
  notify(`¡Pista! ${hintChar.name} está en Fila ${hintChar.row + 1}, Columna ${hintChar.col + 1}.`, 'info')
}

/** Indica si un personaje es la víctima (identidad pública en modo asesino) */
function isVictimChar(char: Character): boolean {
  return !!char.isVictim || char.id === puzzle.value.victimId
}

/** Indica si un personaje es el asesino revelado (solo con la solución visible) */
function isRevealedMurderer(char: Character): boolean {
  return isMurderMode.value && showSolution.value && char.id === puzzle.value.murdererId
}

/**
 * Acusa (o retira la acusación) a un sospechoso en modo asesino.
 * La acusación es silenciosa: no revela si es correcta; solo se gana si
 * las fichas y el acusado son correctos. A la víctima no se la puede acusar.
 */
function accuse(charId: string) {
  if (!isMurderMode.value || showSolution.value) return
  const char = puzzle.value.characters.find(c => c.id === charId)
  if (!char || isVictimChar(char)) return
  moves.value++
  if (accusedCharacterId.value === charId) {
    accusedCharacterId.value = null
    notify(`Acusación contra ${char.name} retirada.`, 'info')
  } else {
    accusedCharacterId.value = charId
    notify(`${char.name} queda acusado como asesino. Ganarás si todas las fichas y el acusado son correctos.`, 'info')
  }
}

/** Datos del asesino para la revelación de la solución */
const murderer = computed(() =>
  puzzle.value.characters.find(c => c.id === puzzle.value.murdererId),
)
</script>

<template>
   <main class="min-h-screen w-full px-3 py-5 lg:py-7 max-w-7xl mx-auto flex flex-col gap-6">

     <!-- ===== CABECERA SUPERIOR ===== -->
     <header class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl glass border border-white/10 shadow-xl animate-fade-up">
       <!-- Datos del puzzle -->
       <div class="flex items-center gap-4">
         <div class="w-14 h-14 rounded-2xl bg-linear-to-br from-amber-500/20 to-yellow-600/10 border border-amber-500/40 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/10 flex-none font-emoji">
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
              <span class="text-xs px-2 py-0.5 rounded-full border font-bold" :style="{ color: modeInfo.color, borderColor: modeInfo.color + '55', background: modeInfo.color + '1a' }" :title="`Modo de juego: ${modeInfo.description}`">
                {{ modeInfo.emoji }} {{ modeInfo.name }}
              </span>
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
           :title="showSolution ? 'Ocultar solución y volver al modo detective' : (isMurderMode ? 'Revelar dónde estaba cada persona y quién es el asesino' : 'Revelar dónde estaba cada sospechoso y el tesoro')"
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
           id="btn-undo"
           @click="undo"
           :disabled="showSolution || !canUndo"
           class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass border border-white/10 text-xs lg:text-sm text-gray-300 hover:text-white hover:border-white/25 transition-all duration-200 cursor-pointer disabled:opacity-40"
           title="Deshace el último movimiento (colocar, mover o quitar). Atajo: Ctrl+Z"
         >
           <Undo2 class="w-4 h-4" />
           <span>Deshacer</span>
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
         <span class="font-emoji">{{ notificationMsg.text }}</span>
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

               <!-- Modo candidatas (lápiz) -->
               <button
                 @click="toggleCandidateMode"
                 :disabled="showSolution"
                 class="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer border disabled:opacity-40"
                 :class="candidateMode
                   ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                   : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10'"
                 title="Modo candidatas (C): los clics marcan casillas posibles en vez de colocar"
               >
                 <Pencil class="w-3.5 h-3.5" />
                 <span>Candidatas ({{ totalCandidates }})</span>
               </button>
               <button
                 @click="showObjectNames = !showObjectNames"
                 class="px-2 py-1 rounded text-xs transition-colors cursor-pointer border"
                 :class="showObjectNames ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold' : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10'"
                 title="Mostrar siempre los nombres de los objetos"
               >
                 Nombres
               </button>

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
                  class="relative rounded-xl overflow-hidden border shadow-[0_18px_50px_rgba(0,0,0,0.65)] ring-1 ring-black/60" :style="{ borderColor: isMurderMode ? 'rgba(239,68,68,0.35)' : 'rgba(251,191,36,0.25)' }"
                >
                  <!-- Etiquetas de zona (capa de fondo, sin recortes) -->
                  <div class="pointer-events-none absolute inset-0">
                    <div
                      v-for="label in zoneLabels"
                      :key="label.id"
                      :title="label.name"
                      @click="handleCellClick(label.row, label.col)"
                      @contextmenu.prevent="toggleExclude(label.row, label.col)"
                      @dragover="onCellDragOver($event, label.row, label.col)"
                      @drop.prevent="onCellDrop(label.row, label.col)"
                      @mouseenter="hoveredCell = { row: label.row, col: label.col }"
                      @mouseleave="hoveredCell = null"
                      class="absolute font-display font-black uppercase tracking-wider whitespace-nowrap leading-none px-1.5 py-0.5 rounded-md bg-black/65 border shadow-[0_2px_6px_rgba(0,0,0,0.7)] pointer-events-auto cursor-pointer z-10"
                      :style="{ top: `${label.top}px`, left: `${label.left}px`, color: label.color, borderColor: label.borderColor, fontSize: label.fontSize, textShadow: '0 1px 3px rgba(0,0,0,0.9)', maxWidth: `${label.maxWidth}px`, overflow: 'hidden', textOverflow: 'ellipsis' }"
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
                         ...getZoneCellStyle(getCellZone(row - 1, col - 1), row - 1, col - 1),
                          ...getZoneEdgeStyle()
                       }"
                       :class="[
                         hoveredCell?.row === row - 1 && hoveredCell?.col === col - 1 ? 'ring-2 ring-amber-400 ring-inset z-20 brightness-125' : '',
                         cornerClass(row - 1, col - 1),
                         isZoneHighlighted(row - 1, col - 1) ? 'zone-hl' : '',
                         'zone-type-' + cellZoneType(row - 1, col - 1),
                         isTreasureCell(row - 1, col - 1) ? 'ring-2 ring-yellow-400 bg-yellow-500/40 animate-pulse z-10' : '',
                          isConflictCell(row - 1, col - 1) ? 'ring-2 ring-red-500 ring-inset z-10' : '',
                          (dropCell?.row === row - 1 && dropCell?.col === col - 1) ? 'ring-2 ring-emerald-400 ring-inset z-20 brightness-125' : '',
                          (hoveredCell && (hoveredCell.row === row - 1 || hoveredCell.col === col - 1)) ? 'crosshair-cell' : ''
                        ]"
                     >
                       <!-- 1. OBJETO EN LA CASILLA (SI EXISTE) -->
                       <template v-if="getCellObject(row - 1, col - 1)">
                         <!-- Objeto OCUPABLE (cama, silla, hamaca) según las reglas generales -->
                         <div
                           v-if="getCellObject(row - 1, col - 1)!.info.occupiable"
                           class="seat-spot w-full h-full rounded-md flex flex-col items-center justify-center backdrop-blur-[2px] transition-transform group-hover:scale-105 shadow-sm"
                           :title="`${getCellObject(row - 1, col - 1)!.info.name} (Se puede ocupar)`"
                         >
                           <span class="font-emoji obj-emoji" :style="{ fontSize: cellSize > 40 ? '19px' : '14px' }">
                             {{ getCellObject(row - 1, col - 1)!.info.emoji }}
                           </span>
                           <span
                             v-if="(cellSize > 46 || showObjectNames) && !getCellCharacter(row - 1, col - 1)"
                             class="text-[7px] uppercase tracking-wider font-black text-emerald-300 leading-none mt-0.5"
                           >
                             {{ getCellObject(row - 1, col - 1)!.info.name.slice(0, 5) }}
                           </span>
                         </div>

                         <!-- Objeto FIJO / NO OCUPABLE (árbol, roca, fogata, lápida...) según las reglas generales -->
                         <div
                           v-else
                           class="obstacle-spot w-full h-full rounded-md flex flex-col items-center justify-center border border-white/10 backdrop-blur-[1px] shadow-inner"
                           :title="`${getCellObject(row - 1, col - 1)!.info.name} (Objeto Fijo - NO se puede ocupar)`"
                         >
                           <span
                             class="font-emoji obj-emoji transition-transform group-hover:scale-110"
                             :class="getCellObject(row - 1, col - 1)!.info.id === 'campfire' ? 'fire-glow' : ''"
                             :style="{ fontSize: cellSize > 40 ? '20px' : '14px' }"
                           >
                             {{ getCellObject(row - 1, col - 1)!.info.emoji }}
                           </span>
                           <span
                             v-if="cellSize > 46 || showObjectNames"
                             class="text-[7px] text-gray-300 font-bold leading-none mt-0.5 truncate max-w-[90%]"
                           >
                             {{ getCellObject(row - 1, col - 1)!.info.name.slice(0, 6) }}
                           </span>
                         </div>
                       </template>

                       <!-- 1b. MARCAS CANDIDATAS (LÁPIZ) -->
                       <div
                         v-if="!showSolution && (candidatesByCell.get(`${row - 1},${col - 1}`) ?? []).length > 0"
                         class="pointer-events-none absolute inset-0 z-[5] flex flex-wrap content-start items-start justify-start gap-px overflow-hidden p-[3px]"
                       >
                         <span
                           v-for="cid in (candidatesByCell.get(`${row - 1},${col - 1}`) ?? []).slice(0, 4)"
                           :key="cid"
                           class="font-emoji leading-none rounded bg-sky-950/90 border border-sky-400/40 px-[1px]"
                           :style="{ fontSize: cellSize > 40 ? '11px' : '8px' }"
                           :title="`Candidata: ${store.getCharacter(cid)?.name ?? ''}`"
                         >{{ store.getCharacter(cid)?.emoji }}</span>
                         <span
                           v-if="(candidatesByCell.get(`${row - 1},${col - 1}`) ?? []).length > 4"
                           class="font-mono leading-none text-sky-300"
                           :style="{ fontSize: cellSize > 40 ? '10px' : '8px' }"
                         >+{{ (candidatesByCell.get(`${row - 1},${col - 1}`) ?? []).length - 4 }}</span>
                       </div>

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
                         :class="{ 'cursor-grab active:cursor-grabbing': isPlayerToken(row - 1, col - 1), 'ring-2 ring-red-500': isRevealedMurderer(getCellCharacter(row - 1, col - 1)!) }"
                         :draggable="isPlayerToken(row - 1, col - 1)"
                         :title="`Ficha de ${getCellCharacter(row - 1, col - 1)!.name}: arrástrala fuera del tablero para retirarla`"
                         @dragstart="onTokenDragStart($event, getCellCharacter(row - 1, col - 1)!.id)"
                         @dragend="onSuspectDragEnd"
                       >
                         <span class="font-emoji obj-emoji" :style="{ fontSize: cellSize > 40 ? '20px' : '14px' }">
                           {{ getCellCharacter(row - 1, col - 1)!.emoji }}
                         </span>
                          <!-- Rasgo visible del personaje -->
                          <span
                            v-if="accessoryEmojis(getCellCharacter(row - 1, col - 1)!)"
                            class="absolute -top-1 -right-1 font-emoji bg-dark-900/95 border border-white/20 rounded-full px-0.5 shadow leading-none"
                            :style="{ fontSize: cellSize > 40 ? '11px' : '9px' }"
                            :title="accessoryTitle(getCellCharacter(row - 1, col - 1)!)"
                          >
                            {{ accessoryEmojis(getCellCharacter(row - 1, col - 1)!) }}
                          </span>
                          <span
                            v-if="isVictimChar(getCellCharacter(row - 1, col - 1)!)"
                            class="absolute -top-1 -left-1 font-emoji bg-dark-900/95 border border-white/20 rounded-full px-0.5 shadow leading-none"
                            :style="{ fontSize: cellSize > 40 ? '11px' : '9px' }"
                            title="Víctima"
                          >💀</span>
                          <span
                            v-if="isRevealedMurderer(getCellCharacter(row - 1, col - 1)!)"
                            class="absolute -bottom-1 -left-1 font-emoji bg-red-950/95 border border-red-500/50 rounded-full px-0.5 shadow leading-none"
                            :style="{ fontSize: cellSize > 40 ? '11px' : '9px' }"
                            title="El asesino"
                          >🔪</span>
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
                 <svg
                   class="absolute left-7 top-0 z-[5] pointer-events-none"
                   :width="puzzle.gridSize * cellSize"
                   :height="puzzle.gridSize * cellSize"
                   :viewBox="`0 0 ${puzzle.gridSize} ${puzzle.gridSize}`"
                   aria-hidden="true"
                 >
                   <g fill="none" stroke-linecap="round">
                     <line
                       v-for="(s, i) in zoneBoundaries"
                       :key="i"
                       :x1="s.x1" :y1="s.y1" :x2="s.x2" :y2="s.y2"
                       :stroke="s.color"
                       stroke-width="0.055"
                       stroke-opacity="0.95"
                     />
                   </g>
                 </svg>
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
                 <span v-if="getCellObject(hoveredCell.row, hoveredCell.col)" class="flex items-center gap-1 font-semibold font-emoji" :class="getCellObject(hoveredCell.row, hoveredCell.col)!.info.occupiable ? 'text-emerald-400' : 'text-amber-300'">
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
             <span class="text-xs font-bold text-gray-400 mr-1">Zonas del mapa: <span class="font-normal opacity-70">(pulsa para fijar)</span></span>
             <div
               v-for="zone in puzzle.zones"
               :key="zone.id"
               class="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border cursor-pointer transition-all"
               :class="(highlightZoneId === zone.id || hoveredZoneId === zone.id) ? 'ring-2 ring-white/50 brightness-125' : ''"
               :title="`Resaltar ${zone.name} en el tablero (clic para fijar)`"
               @mouseenter="hoveredLegendZoneId = zone.id"
               @mouseleave="hoveredLegendZoneId = null"
               @click="togglePinZone(zone.id)"
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

         <!-- REVELACIÓN DEL ASESINO (SOLUCIÓN, MODO ASESINO) -->
          <transition name="fade">
            <div
              v-if="showSolution && isMurderMode"
              class="p-5 rounded-2xl glass border border-red-500/30 bg-linear-to-r from-red-500/10 via-rose-500/5 to-transparent shadow-xl animate-fade-up"
            >
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-2xl flex-none shadow">
                  🔪
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-red-400 uppercase tracking-widest">Asesino descubierto</span>
                    <span class="text-xs text-gray-500">• Se quedó a solas con la víctima</span>
                  </div>
                  <p class="font-display text-xl font-black text-white mt-0.5">
                    {{ murderer?.name ?? 'Desconocido' }}
                    <span class="text-sm font-bold text-gray-400">asesinó a {{ victim?.name }}</span>
                  </p>
                  <p class="text-xs text-gray-400">
                    Zona del crimen: <span class="text-red-300 font-semibold">{{ victimZone?.name ?? 'Desconocida' }}</span>
                  </p>
                </div>
              </div>
            </div>
          </transition>

         <!-- REVELACIÓN DEL TESORO (SOLUCIÓN) -->
         <transition name="fade">
           <div
             v-if="showSolution && !isMurderMode"
             class="p-5 rounded-2xl glass border border-amber-500/30 bg-linear-to-r from-amber-500/10 via-yellow-500/5 to-transparent shadow-xl animate-fade-up"
           >
             <div class="flex items-center gap-3">
               <div class="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl flex-none shadow">
                 💰
               </div>
               <div class="flex-1">
                 <div class="flex items-center gap-2">
                   <span class="text-xs font-bold text-amber-400 uppercase tracking-widest">Coordenadas del Tesoro</span>
                   <span class="text-xs text-gray-500">• El cruce de la última fila y columna libres (regla general)</span>
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
                Arrastra un personaje hasta una casilla del mapa, o púlsalo para seleccionarlo y haz clic en una casilla. Para retirar una ficha, arrástrala fuera del tablero (pulsar sobre ella ya no la quita). Clic derecho en una casilla libre la marca como descartada (X). Tienes Deshacer (o Ctrl+Z) para recuperar el último movimiento. Activa ✏️ Candidatas (o pulsa C) para marcar varias casillas posibles del seleccionado; pulsa una de sus marcas o su chip F·C en la tarjeta para fijarla allí.
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
              <select
                v-model="zoneFilter"
                aria-label="Filtrar por zona"
                class="glass rounded-lg border border-white/10 px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-amber-500/50 transition-colors bg-dark-800"
              >
                <option value="all">Todas las zonas</option>
                <option v-for="z in puzzle.zones" :key="z.id" :value="z.id">{{ z.name }}</option>
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
                      <p class="font-display font-bold text-xs text-white truncate">{{ char.name }}<span v-if="isMurderMode && isVictimChar(char)" class="ml-1 text-[10px] font-emoji" title="Víctima">💀</span></p>
                      <div v-if="getCharacterAccessories(char).length > 0" class="flex items-center gap-1 mt-0.5 flex-wrap">
                        <span
                          v-for="acc in getCharacterAccessories(char)"
                          :key="acc"
                          class="text-[9px] px-1 py-0.2 rounded border inline-flex items-center gap-0.5 font-emoji"
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

                <!-- Candidatas del personaje (pulsar un chip para fijarla) -->
                <div v-if="!showSolution && (candidateMarks[char.id] ?? []).length > 0" class="mt-2 flex flex-wrap items-center gap-1.5">
                  <span class="text-[10px] font-bold text-sky-300">✏️ Posibles:</span>
                  <span
                    v-for="pos in candidateMarks[char.id] ?? []"
                    :key="`${pos.row},${pos.col}`"
                    class="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-200 border border-sky-500/30"
                  >
                    <button
                      @click.stop="lockCandidate(char.id, pos.row, pos.col)"
                      @dragstart.stop
                      class="font-bold hover:text-white cursor-pointer"
                      :title="`Fijar a ${char.name} en Fila ${pos.row + 1}, Columna ${pos.col + 1}`"
                    >
                      F{{ pos.row + 1 }}·C{{ pos.col + 1 }}
                    </button>
                    <button
                      @click.stop="removeCandidate(char.id, pos.row, pos.col)"
                      @dragstart.stop
                      class="text-sky-400 hover:text-red-400 cursor-pointer"
                      title="Quitar esta marca"
                    >
                      ×
                    </button>
                  </span>
                </div>

                <!-- Acusación (solo modo asesino, nunca a la víctima) -->
                <div v-if="isMurderMode && !isVictimChar(char)" class="mt-2">
                  <button
                    @click.stop="accuse(char.id)"
                    @dragstart.stop
                    class="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer border"
                    :class="accusedCharacterId === char.id
                      ? 'bg-red-500/25 text-red-200 border-red-500/50 ring-1 ring-red-500/40'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:border-red-500/40 hover:text-red-200'"
                    :title="accusedCharacterId === char.id ? 'Retirar la acusación' : 'Acusar como asesino (no revela si acertaste)'"
                  >
                    <Gavel class="w-3.5 h-3.5" />
                    <span>{{ accusedCharacterId === char.id ? 'Acusado (pulsar para retirar)' : 'Acusar como asesino' }}</span>
                  </button>
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

<!-- 2. PESTAÑA: REGLAS GENERALES -->
         <div v-if="activeTab === 'legend'" class="flex flex-col gap-3 animate-scale-in text-xs text-gray-300">
            <!-- Reglas generales del juego -->
            <div class="glass rounded-xl p-4 border border-white/5 space-y-2">
              <h3 class="font-display font-bold text-white text-sm flex items-center gap-1.5">
                <HelpCircle class="w-4 h-4 text-amber-400" />
                Reglas generales
              </h3>
              <ul class="space-y-1.5 text-gray-300 list-disc list-inside">
                <li v-if="!isMurderMode">Aquí no hay asesino: coloca a cada sospechoso en su casilla y encuentra las coordenadas del <strong>Tesoro</strong>.</li>
                <li v-else>Hay un asesino: coloca a <strong>todas las personas</strong> (víctima incluida, marcada con 💀) y <strong>acusa</strong> al culpable desde su tarjeta.</li>
                <li>Solo puede haber <strong>una persona por fila y por columna</strong> (en modo asesino la víctima también cuenta). Si dos fichas comparten fila o columna verás un aviso rojo.</li>
                <li>Las casillas <strong>verdes se pueden ocupar</strong> (camas, sillas, hamacas…); las <strong>grises son objetos fijos</strong> que no se pueden ocupar y solo sirven de referencia.</li>
                <li v-if="!isMurderMode">El Tesoro está en el <strong>cruce de la última fila y la última columna libres</strong> (las que quedan sin ningún sospechoso). Puede estar enterrado bajo un objeto fijo.</li>
                <li v-else>El asesino es quien <strong>se quedó a solas con la víctima</strong> en su zona: solo ellos dos están en esa zona.</li>
              </ul>
            </div>

            <!-- Cómo leer las pistas -->
            <div class="glass rounded-xl p-4 border border-white/5 space-y-2">
              <h3 class="font-display font-bold text-white text-sm">Cómo leer las pistas</h3>
              <ul class="space-y-1.5 text-gray-300 list-disc list-inside">
                <li><strong>«Estaba en una cama / en una hamaca / en un …»</strong>: está en la misma casilla que ese objeto ocupable.</li>
                <li><strong>«Estaba junto a …»</strong>: está en una casilla adyacente en cruz (arriba, abajo, izquierda o derecha), nunca en diagonal.</li>
                <li><strong>«Al este de …»</strong>: está en una columna con número mayor; <strong>«al oeste de …»</strong>: en una columna con número menor. No implica estar en la misma fila.</li>
                <li><strong>«Exactamente / al menos N filas al norte/sur de …»</strong>: diferencia de filas verificada; el norte es la fila 1 y el sur la última.</li>
                <li><strong>«En la misma zona que …»</strong>: ambos sospechosos están dentro de la misma zona del mapa.</li>
                <li><strong>«En la fila superior de su zona»</strong>: está en la fila de más arriba de esa zona.</li>
                <li><strong>«No había … en toda su columna»</strong>: ese objeto no aparece en ninguna casilla de su columna.</li>
                <li><strong>«Estaba en la columna N»</strong>: su columna exacta (se numeran de izquierda a derecha).</li>
                <li><strong>«Nadie más en su zona llevaba …»</strong>: ningún otro personaje de esa zona lleva ese rasgo (🎩 👓 👁️ 🧣 🦯 💍 🎖️). Las zonas sí pueden tener varias personas.</li>
                <li><strong>«Nadie en una columna adyacente llevaba …»</strong>: en las columnas vecinas (número ±1) nadie lleva ese rasgo.</li>
                <li class="list-none text-gray-500 italic">Por la regla de 1 por fila y por columna, ninguna pista afirma ni niega compartir fila o columna con otro personaje.</li>
              </ul>
            </div>

           <!-- Rasgos de los sospechosos (sombrero, gafas, parche) -->
           <div class="glass rounded-xl p-4 border border-white/5 space-y-2">
             <h3 class="font-display font-bold text-white text-sm">Rasgos de los sospechosos</h3>
             <p class="text-gray-400">
               Algunos sospechosos llevan un rasgo visible junto a su emoji. Las pistas lo usan como seña de
               identidad: «Llevaba sombrero», «al este de Marta, que llevaba gafas» o «nadie más en su zona llevaba parche en el ojo».
               Puedes buscar por rasgo en el panel de sospechosos.
             </p>
             <div class="flex flex-wrap gap-1.5">
               <span
                 v-for="meta in ACCESSORY_LIST"
                 :key="meta.id"
                 class="px-2 py-1 rounded border text-xs inline-flex items-center gap-1 font-emoji"
                 :class="accessoryBadgeClass(meta.id)"
                 :title="meta.selfSentence"
               >
                 {{ meta.emoji }} {{ meta.label }}
               </span>
             </div>
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
                   class="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-emoji"
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
                   class="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300 font-emoji"
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