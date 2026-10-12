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
  hat: boolean   // Para la restricción de sombrero de Hyacinth
  eyepatch: boolean  // Para restricciones de parche
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
