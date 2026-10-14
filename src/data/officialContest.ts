/**
 * Caso oficial Murdoku Contest #1 — "La Búsqueda del Tesoro" (The Treasure Hunt).
 * Basado fielmente en mapa.png, murdoku.pdf y reglas.txt.
 * Grid de 24x24 con 23 sospechosos, objetos ocupables y no ocupables, y la búsqueda del tesoro.
 */
import type { GeneratedPuzzle, Character, Clue, Zone, PlacedObject } from '@/types/puzzle'

/** Índices 0-based de celdas con objetos no ocupables del mapa oficial */
const OFFICIAL_BLOCKED_INDICES = [
  0, 3, 5, 14, 19, 20, 25, 32, 33, 37, 42, 43, 55, 63, 68, 73, 82, 84, 85, 90, 93,
  100, 101, 104, 124, 126, 152, 174, 193, 197, 201, 207, 219, 231, 235,
  250, 255, 259, 260, 269, 280, 284, 288, 297, 306, 309,
  322, 325, 330, 332, 334, 338, 345, 357,
  364, 366, 367, 372, 374, 379, 381, 382, 383, 386,
  412, 413, 415, 417, 422, 428, 429, 431,
  454, 455, 456, 464, 465, 475, 478,
  487, 488, 499, 502, 504, 506, 511, 514, 516,
  529, 537, 538, 548, 550, 558, 563, 569,
]

/** Rectangulos aproximados de cada zona del mapa oficial (0-indexed, inclusivos).
 *  Deducidos visualmente de mapa.png. Se asignan en orden de especificidad:
 *  edificios y barcos primero; toda celda restante queda como Agua. */
interface ZoneRect {
  id: string
  name: string
  type: Zone['type']
  emoji: string
  color: string
  r0: number
  r1: number
  c0: number
  c1: number
}

const OFFICIAL_ZONE_RECTS: ZoneRect[] = [
  { id: 'zone-cabana-a', name: 'Cabaña A', type: 'room', emoji: '🛖', color: '#854D0E', r0: 0, r1: 2, c0: 3, c1: 5 },
  { id: 'zone-caverna', name: 'Caverna', type: 'room', emoji: '🕳', color: '#475569', r0: 0, r1: 4, c0: 16, c1: 23 },
  { id: 'zone-playa-norte', name: 'Playa Norte', type: 'outdoor', emoji: '🏖', color: '#D97706', r0: 4, r1: 4, c0: 7, c1: 15 },
  { id: 'zone-fragata-a', name: 'Fragata A', type: 'vehicle', emoji: '🚢', color: '#C2410C', r0: 8, r1: 9, c0: 12, c1: 16 },
  { id: 'zone-playa', name: 'Playa', type: 'outdoor', emoji: '🏖', color: '#EAB308', r0: 5, r1: 10, c0: 0, c1: 10 },
  { id: 'zone-balandra-a', name: 'Balandra A', type: 'vehicle', emoji: '⛵', color: '#EA580C', r0: 10, r1: 11, c0: 4, c1: 7 },
  { id: 'zone-balandra-b', name: 'Balandra B', type: 'vehicle', emoji: '⛵', color: '#F97316', r0: 12, r1: 13, c0: 2, c1: 5 },
  { id: 'zone-balandra-c', name: 'Balandra C', type: 'vehicle', emoji: '⛵', color: '#FB923C', r0: 12, r1: 13, c0: 7, c1: 10 },
  { id: 'zone-galeon', name: 'Galeón', type: 'vehicle', emoji: '🏴', color: '#B45309', r0: 14, r1: 17, c0: 4, c1: 10 },
  { id: 'zone-muelle', name: 'Muelle', type: 'special', emoji: '⚓', color: '#0D9488', r0: 13, r1: 19, c0: 8, c1: 11 },
  { id: 'zone-fragata-b', name: 'Fragata B', type: 'vehicle', emoji: '🚢', color: '#9A3412', r0: 21, r1: 23, c0: 0, c1: 3 },
  { id: 'zone-acantilado', name: 'Acantilado', type: 'special', emoji: '⛰', color: '#64748B', r0: 20, r1: 22, c0: 3, c1: 7 },
  { id: 'zone-cabana-b', name: 'Cabaña B', type: 'room', emoji: '🛖', color: '#A16207', r0: 13, r1: 17, c0: 12, c1: 15 },
  { id: 'zone-taberna', name: 'Taberna', type: 'room', emoji: '🍺', color: '#7C3AED', r0: 14, r1: 20, c0: 18, c1: 23 },
  { id: 'zone-cabana-c', name: 'Cabaña C', type: 'room', emoji: '🛖', color: '#713F12', r0: 19, r1: 22, c0: 12, c1: 15 },
  { id: 'zone-bosque', name: 'Bosque', type: 'outdoor', emoji: '🌲', color: '#16A34A', r0: 0, r1: 6, c0: 0, c1: 15 },
  { id: 'zone-claro', name: 'Claro', type: 'outdoor', emoji: '🌾', color: '#65A30D', r0: 10, r1: 20, c0: 12, c1: 23 },
  { id: 'zone-claro-sur', name: 'Claro Sur', type: 'outdoor', emoji: '🌾', color: '#4D7C0F', r0: 21, r1: 23, c0: 0, c1: 23 },
]

/**
 * Construye las zonas con sus celdas, sin solapes (primera zona en ganar la celda).
 * Las celdas no cubiertas por ningun rectangulo pertenecen al Agua.
 */
function buildOfficialZones(): Zone[] {
  const taken = new Set<string>()
  const zones: Zone[] = []
  for (const rect of OFFICIAL_ZONE_RECTS) {
    const cells: [number, number][] = []
    for (let r = rect.r0; r <= rect.r1; r++) {
      for (let c = rect.c0; c <= rect.c1; c++) {
        const key = `${r},${c}`
        if (!taken.has(key)) {
          taken.add(key)
          cells.push([r, c])
        }
      }
    }
    if (cells.length > 0) {
      zones.push({
        id: rect.id,
        name: rect.name,
        type: rect.type,
        emoji: rect.emoji,
        color: rect.color,
        cells,
        topRow: rect.r0,
      })
    }
  }
  const water: [number, number][] = []
  for (let r = 0; r < 24; r++) {
    for (let c = 0; c < 24; c++) {
      if (!taken.has(`${r},${c}`)) water.push([r, c])
    }
  }
  zones.push({ id: 'zone-agua', name: 'Agua / Mar', type: 'water', emoji: '🌊', color: '#0284C7', cells: water })
  return zones
}

/** Genera los objetos colocados en el mapa del caso oficial */
function getOfficialPlacedObjects(): PlacedObject[] {
  const list: PlacedObject[] = []

  // Mapeo de objetos fijos según los índices bloqueados
  const nonOccTypes = [
    'tree', 'rock', 'campfire', 'flowers', 'shark', 'sack', 'pig',
    'gravestone', 'crate', 'rope', 'barrel', 'bookshelf', 'bush', 'table', 'cannon'
  ]

  OFFICIAL_BLOCKED_INDICES.forEach((idx, i) => {
    const row = Math.floor(idx / 24)
    const col = idx % 24

    // Objetos específicos confirmados por las reglas:
    let objectId = nonOccTypes[i % nonOccTypes.length]
    if (row === 9 && col === 15) objectId = 'rope' // F10 C16 = Cuerda al lado de Mortimer (F10 C17)
    if (row === 8 && col === 15) objectId = 'gravestone' // F9 C16 = Lápida de Cedric

    list.push({ objectId, row, col })
  })

  // Objetos ocupables clave: hamacas, camas, sillas
  // Bart: hamaca, Pedro: cama, Isolde: silla, Rosalind: silla
  list.push({ objectId: 'hammock', row: 13, col: 14 }) // Cerca de Bart
  list.push({ objectId: 'bed', row: 17, col: 13 })     // En Cabaña para Pedro
  list.push({ objectId: 'chair', row: 15, col: 15 })   // En Cabaña para Isolde
  list.push({ objectId: 'chair', row: 19, col: 20 })   // En Taberna para Rosalind
  list.push({ objectId: 'hammock', row: 6, col: 12 })  // Hamaca adicional

  return list
}

/** Los 23 personajes con sus testimonios literales de reglas.txt */
const OFFICIAL_CHARACTERS: Character[] = [
  { id: 'char-augustus', name: 'Augustus', emoji: '🧔', row: 8, col: 1, zoneId: 'zone-woods', hat: true, eyepatch: false, glasses: false },
  { id: 'char-bart', name: 'Bart', emoji: '👦', row: 13, col: 14, zoneId: 'zone-cabins', hat: false, eyepatch: false, glasses: false },
  { id: 'char-cedric', name: 'Cedric', emoji: '👴', row: 16, col: 15, zoneId: 'zone-cabins', hat: false, eyepatch: false, glasses: false },
  { id: 'char-dudley', name: 'Dudley', emoji: '👨', row: 6, col: 8, zoneId: 'zone-woods', hat: true, eyepatch: false, glasses: false },
  { id: 'char-eiko', name: 'Eiko', emoji: '👵', row: 14, col: 11, zoneId: 'zone-cabins', hat: false, eyepatch: false, glasses: false },
  { id: 'char-fleur', name: 'Fleur', emoji: '👩', row: 2, col: 15, zoneId: 'zone-woods', hat: false, eyepatch: false, glasses: false },
  { id: 'char-griselda', name: 'Griselda', emoji: '🧕', row: 6, col: 3, zoneId: 'zone-beach', hat: false, eyepatch: false, glasses: false },
  { id: 'char-hyacinth', name: 'Hyacinth', emoji: '👸', row: 21, col: 6, zoneId: 'zone-cliff', hat: false, eyepatch: false, glasses: false },
  { id: 'char-isolde', name: 'Isolde', emoji: '👰', row: 15, col: 15, zoneId: 'zone-cabins', hat: false, eyepatch: false, glasses: false },
  { id: 'char-julius', name: 'Julius', emoji: '👱', row: 18, col: 9, zoneId: 'zone-galleon', hat: true, eyepatch: false, glasses: false },
  { id: 'char-kathleen', name: 'Kathleen', emoji: '👧', row: 11, col: 4, zoneId: 'zone-sloops', hat: false, eyepatch: false, glasses: false },
  { id: 'char-linus', name: 'Linus', emoji: '👲', row: 6, col: 13, zoneId: 'zone-woods', hat: false, eyepatch: false, glasses: false },
  { id: 'char-mortimer', name: 'Mortimer', emoji: '🤠', row: 9, col: 16, zoneId: 'zone-frigates', hat: true, eyepatch: false, glasses: false },
  { id: 'char-nehemiah', name: 'Nehemiah', emoji: '🏊', row: 12, col: 7, zoneId: 'zone-water', hat: false, eyepatch: false, glasses: false },
  { id: 'char-orville', name: 'Orville', emoji: '💂', row: 14, col: 5, zoneId: 'zone-sloops', hat: true, eyepatch: false, glasses: false },
  { id: 'char-pedro', name: 'Pedro', emoji: '👮', row: 17, col: 13, zoneId: 'zone-cabins', hat: false, eyepatch: true, glasses: false },
  { id: 'char-quincy', name: 'Quincy', emoji: '👳', row: 20, col: 1, zoneId: 'zone-water', hat: false, eyepatch: false, glasses: false },
  { id: 'char-rosalind', name: 'Rosalind', emoji: '💃', row: 19, col: 20, zoneId: 'zone-tavern', hat: false, eyepatch: false, glasses: false },
  { id: 'char-seraphina', name: 'Seraphina', emoji: '🧙', row: 0, col: 18, zoneId: 'zone-cavern', hat: false, eyepatch: false, glasses: false },
  { id: 'char-ursula', name: 'Ursula', emoji: '🙋', row: 13, col: 11, zoneId: 'zone-cabins', hat: false, eyepatch: false, glasses: false },
  { id: 'char-wilfred', name: 'Wilfred', emoji: '🎅', row: 4, col: 4, zoneId: 'zone-woods', hat: false, eyepatch: false, glasses: false },
  { id: 'char-yannis', name: 'Yannis', emoji: '🤴', row: 1, col: 10, zoneId: 'zone-woods', hat: false, eyepatch: false, glasses: false },
  { id: 'char-zoe', name: 'Zoe', emoji: '🧚', row: 22, col: 17, zoneId: 'zone-tavern', hat: false, eyepatch: false, glasses: false },
]

/** Pistas exactas y literales extraídas de reglas.txt */
const OFFICIAL_CLUES: Clue[] = [
  {
    characterId: 'char-augustus',
    characterName: 'Augustus',
    text: 'Estaba junto a una fogata.',
    type: 'adjacency',
  },
  {
    characterId: 'char-bart',
    characterName: 'Bart',
    text: 'Estaba en una hamaca. No había ningún saco en toda su columna.',
    type: 'adjacency',
  },
  {
    characterId: 'char-cedric',
    characterName: 'Cedric',
    text: 'Alguien situado exactamente ocho filas al norte de él estaba junto a la lápida.',
    type: 'special',
  },
  {
    characterId: 'char-dudley',
    characterName: 'Dudley',
    text: 'Estaba al este de Griselda y al oeste de Linus.',
    type: 'relative',
  },
  {
    characterId: 'char-eiko',
    characterName: 'Eiko',
    text: 'Estaba junto a una estantería.',
    type: 'adjacency',
  },
  {
    characterId: 'char-fleur',
    characterName: 'Fleur',
    text: 'Estaba junto a unas flores.',
    type: 'adjacency',
  },
  {
    characterId: 'char-griselda',
    characterName: 'Griselda',
    text: 'Estaba en la fila superior de su zona.',
    type: 'row',
  },
  {
    characterId: 'char-hyacinth',
    characterName: 'Hyacinth',
    text: 'Estaba en el Acantilado. Nadie en una columna adyacente llevaba sombrero.',
    type: 'zone',
  },
  {
    characterId: 'char-isolde',
    characterName: 'Isolde',
    text: 'Estaba sentada en una silla. Estaba en una Cabaña con alguien que llevaba un parche en el ojo.',
    type: 'special',
  },
  {
    characterId: 'char-julius',
    characterName: 'Julius',
    text: 'Estaba junto a un barril.',
    type: 'adjacency',
  },
  {
    characterId: 'char-kathleen',
    characterName: 'Kathleen',
    text: 'Estaba en una Balandra.',
    type: 'zone',
  },
  {
    characterId: 'char-linus',
    characterName: 'Linus',
    text: 'Estaba junto a un árbol.',
    type: 'adjacency',
  },
  {
    characterId: 'char-mortimer',
    characterName: 'Mortimer',
    text: 'Estaba en un barco, junto a una cuerda.',
    type: 'adjacency',
  },
  {
    characterId: 'char-nehemiah',
    characterName: 'Nehemiah',
    text: 'Estaba en el Agua, junto a un barco.',
    type: 'zone',
  },
  {
    characterId: 'char-orville',
    characterName: 'Orville',
    text: 'Estaba en un barco.',
    type: 'zone',
  },
  {
    characterId: 'char-pedro',
    characterName: 'Pedro',
    text: 'Estaba en una cama.',
    type: 'adjacency',
  },
  {
    characterId: 'char-quincy',
    characterName: 'Quincy',
    text: 'Estaba en el Agua, junto a un tiburón.',
    type: 'adjacency',
  },
  {
    characterId: 'char-rosalind',
    characterName: 'Rosalind',
    text: 'Estaba sentada en una silla.',
    type: 'adjacency',
  },
  {
    characterId: 'char-seraphina',
    characterName: 'Seraphina',
    text: 'Estaba al menos seis filas al norte de Linus.',
    type: 'relative',
  },
  {
    characterId: 'char-ursula',
    characterName: 'Ursula',
    text: 'Estaba delante de una puerta.',
    type: 'adjacency',
  },
  {
    characterId: 'char-wilfred',
    characterName: 'Wilfred',
    text: 'Estaba junto a un cerdo.',
    type: 'adjacency',
  },
  {
    characterId: 'char-yannis',
    characterName: 'Yannis',
    text: 'Estaba en el Bosque. No estaba junto a un árbol.',
    type: 'zone',
  },
  {
    characterId: 'char-zoe',
    characterName: 'Zoe',
    text: 'Estaba junto a un arbusto.',
    type: 'adjacency',
  },
]

/** Puzzle oficial completo listo para jugar o explorar */
export function getOfficialContestPuzzle(): GeneratedPuzzle {
  const zones = buildOfficialZones()
  const characters: Character[] = OFFICIAL_CHARACTERS.map((c) => ({
    ...c,
    zoneId:
      zones.find((z) => z.cells.some(([r, cell]) => r === c.row && cell === c.col))?.id ??
      'zone-agua',
  }))
  return {
    id: 'murdoku-official-contest-1',
    theme: 'pirates',
    difficulty: 'expert',
    mode: 'treasure',
    title: 'Murdoku Contest #1 — El Tesoro Pirata',
    description: 'El caso oficial del concurso Murdoku de 24×24. Encuentra las coordenadas del Tesoro resolviendo los testimonios de los 23 sospechosos.',
    gridSize: 24,
    zones,
    characters,
    placedObjects: getOfficialPlacedObjects(),
    clues: OFFICIAL_CLUES,
    treasureRow: 24,
    treasureCol: 8,
    victimId: null,
    murdererId: null,
    generatedAt: '2026-10-12T10:00:00Z',
  }
}
