// Tipos base del dominio Murdoku

/** Temáticas disponibles para los puzzles */
export type ThemeId = 'pirates' | 'medieval' | 'scifi' | 'western' | 'jungle' | 'spooky' | 'detective' | 'egypt' | 'cyberpunk' | 'feudal' | 'zombie' | 'olympics' | 'kitchen'

/** Niveles de dificultad */
export type DifficultyId = 'easy' | 'medium' | 'hard' | 'expert'

/** Tipos de zonas en el mapa */
export type ZoneType = 'room' | 'outdoor' | 'water' | 'vehicle' | 'special'

/** Objeto en el mapa (ocupable o no) */
export interface MapObject {
  id: string
  name: string         // Nombre para mostrar
  emoji: string        // Emoji representativo
  occupiable: boolean  // Si un personaje puede estar sobre él
}

/** Zona del mapa */
export interface Zone {
  id: string
  name: string
  type: ZoneType
  emoji: string
  color: string        // Color HSL para visualización
  cells: [number, number][]  // Celdas [fila, columna] (0-indexed)
  topRow?: number      // Fila superior (si aplica)
}

/** Personaje del puzzle */
export interface Character {
  id: string
  name: string
  emoji: string
  row: number    // 0-indexed
  col: number    // 0-indexed
  zoneId: string
  hat: boolean       // Lleva sombrero
  glasses: boolean   // Lleva gafas
  eyepatch: boolean  // Lleva un parche en el ojo
}

/** Rasgos visuales opcionales de los personajes */
export type AccessoryId = 'hat' | 'glasses' | 'eyepatch'

/** Metadatos de presentación de cada rasgo */
export interface AccessoryMeta {
  id: AccessoryId
  /** Emoji que se muestra junto al del personaje */
  emoji: string
  /** Etiqueta corta para insignias y buscador */
  label: string
  /** Frase autónoma: "Llevaba sombrero." */
  selfSentence: string
  /** Complemento para "que llevaba ...": "sombrero" / "gafas" / "un parche en el ojo" */
  wornPhrase: string
  /** Complemento negativo para "nadie llevaba ...": "sombrero" / "gafas" / "parche en el ojo" */
  negativePhrase: string
}

/** Catálogo de rasgos con sus textos (formulación neutra, sin género) */
export const ACCESSORY_META: Record<AccessoryId, AccessoryMeta> = {
  hat: {
    id: 'hat',
    emoji: '🎩',
    label: 'Sombrero',
    selfSentence: 'Llevaba sombrero.',
    wornPhrase: 'sombrero',
    negativePhrase: 'sombrero',
  },
  glasses: {
    id: 'glasses',
    emoji: '👓',
    label: 'Gafas',
    selfSentence: 'Llevaba gafas.',
    wornPhrase: 'gafas',
    negativePhrase: 'gafas',
  },
  eyepatch: {
    id: 'eyepatch',
    emoji: '👁️',
    label: 'Parche',
    selfSentence: 'Llevaba un parche en el ojo.',
    wornPhrase: 'un parche en el ojo',
    negativePhrase: 'parche en el ojo',
  },
}

/** Lista ordenada de rasgos para iterar en la interfaz */
export const ACCESSORY_LIST: AccessoryMeta[] = [
  ACCESSORY_META.hat,
  ACCESSORY_META.glasses,
  ACCESSORY_META.eyepatch,
]

/** Rasgos de un personaje como lista (vacía si no lleva ninguno) */
export function getCharacterAccessories(c: {
  hat: boolean
  glasses: boolean
  eyepatch: boolean
}): AccessoryId[] {
  const list: AccessoryId[] = []
  if (c.hat) list.push('hat')
  if (c.glasses) list.push('glasses')
  if (c.eyepatch) list.push('eyepatch')
  return list
}

/** Tipos de pistas disponibles */
export type ClueType = 'zone' | 'adjacency' | 'relative' | 'row' | 'column' | 'special'

/** Pista de un personaje */
export interface Clue {
  characterId: string
  characterName: string
  text: string
  type: ClueType
}

/** Objeto colocado en el mapa */
export interface PlacedObject {
  objectId: string
  row: number
  col: number
}

/** Configuración completa del puzzle generado */
export interface GeneratedPuzzle {
  id: string
  theme: ThemeId
  difficulty: DifficultyId
  title: string
  description: string
  gridSize: number      // Tamaño del grid NxN
  zones: Zone[]
  characters: Character[]
  placedObjects: PlacedObject[]
  clues: Clue[]
  treasureRow: number   // 1-indexed (o -1 si aún no resuelto)
  treasureCol: number   // 1-indexed
  generatedAt: string
}

/** Información de una temática */
export interface ThemeInfo {
  id: ThemeId
  name: string
  emoji: string
  description: string
  gradient: string        // Clases de Tailwind para gradiente
  accentColor: string     // Color HEX del acento
  previewImage?: string   // URL de imagen de preview
  zones: string[]         // Nombres de zonas típicas
  objects: MapObject[]    // Objetos de la temática
  maleNames: string[]     // Nombres masculinos
  femaleNames: string[]   // Nombres femeninos
  characterEmojis: string[] // Emojis temáticos únicos para personajes
  maleEmojis?: string[]   // Emojis específicos masculinos (1 sola posición)
  femaleEmojis?: string[] // Emojis específicos femeninos (1 sola posición)
}

/** Información de dificultad */
export interface DifficultyInfo {
  id: DifficultyId
  name: string
  description: string
  emoji: string
  gridSize: number
  numCharacters: number
  numZones: number
  clueComplexity: 'simple' | 'moderate' | 'complex' | 'devious'
  color: string  // Color de acento
}

/** Estado de generación */
export type GenerationStatus = 'idle' | 'generating' | 'done' | 'error'
