/**
 * Store principal del puzzle Murdoku.
 * Gestiona el estado global del puzzle generado y la sesión del usuario.
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { GeneratedPuzzle, ThemeId, DifficultyId, Character, Clue, GameMode } from '@/types/puzzle'
import { usePuzzleGenerator } from '@/composables/usePuzzleGenerator'
import { getOfficialContestPuzzle } from '@/data/officialContest'

export const usePuzzleStore = defineStore('puzzle', () => {
  // ============================================================
  // ESTADO
  // ============================================================

  /** Temática seleccionada por el usuario */
  const selectedTheme = ref<ThemeId>('pirates')

  /** Dificultad seleccionada por el usuario */
  const selectedDifficulty = ref<DifficultyId>('easy')

  /** Modo de juego seleccionado por el usuario */
  const selectedMode = ref<GameMode>('treasure')

  /** Puzzle generado actualmente (null si no hay ninguno) */
  const currentPuzzle = ref<GeneratedPuzzle | null>(null)

  /** Historial de puzzles generados en la sesión */
  const puzzleHistory = ref<GeneratedPuzzle[]>([])

  /** Estado de generación */
  const generationStatus = ref<'idle' | 'generating' | 'done' | 'error'>('idle')

  /** Mensaje de error si hubo algún problema */
  const errorMessage = ref<string | null>(null)

  // Sistema de pistas
  const hintsUsed = ref(0)
  const maxHints = 3

  // ============================================================
  // GENERADOR
  // ============================================================
  const generator = usePuzzleGenerator()

  // Re-exportar estado del generador para acceso desde componentes
  const isGenerating = generator.isGenerating
  const progress = generator.progress
  const statusMessage = generator.statusMessage

  // ============================================================
  // PERSISTENCIA
  // ============================================================

  /** Guarda el estado actual en localStorage */
  function saveState(): void {
    try {
      const state = {
        selectedTheme: selectedTheme.value,
        selectedDifficulty: selectedDifficulty.value,
        selectedMode: selectedMode.value,
        currentPuzzle: currentPuzzle.value,
        puzzleHistory: puzzleHistory.value,
        hintsUsed: hintsUsed.value,
      }
      localStorage.setItem('murdoku-creator-state', JSON.stringify(state))
    } catch (e) {
      console.error('Error saving state to localStorage:', e)
    }
  }

  /** Carga el estado desde localStorage */
  function loadState(): void {
    try {
      const stateJson = localStorage.getItem('murdoku-creator-state')
      if (stateJson) {
        const state = JSON.parse(stateJson)
        if (state.selectedTheme) selectedTheme.value = state.selectedTheme
        if (state.selectedDifficulty) selectedDifficulty.value = state.selectedDifficulty
        if (state.selectedMode === 'treasure' || state.selectedMode === 'murder') {
          selectedMode.value = state.selectedMode
        }
        if (state.currentPuzzle) currentPuzzle.value = normalizePuzzle(state.currentPuzzle)
        if (state.puzzleHistory) {
          state.puzzleHistory = state.puzzleHistory.map(normalizePuzzle)
          puzzleHistory.value = state.puzzleHistory
        }
        if (state.hintsUsed !== undefined) hintsUsed.value = state.hintsUsed
      }
    } catch (e) {
      console.error('Error loading state from localStorage:', e)
    }
  }

  /**
   * Normaliza un puzzle guardado para compatibilizar partidas anteriores
   * con el modelo actual de rasgos (los puzzles viejos no tienen `glasses`)
   * y con el nuevo campo `mode` (los viejos son de búsqueda del tesoro).
   * Además sanea pistas antiguas incoherentes con la regla de 1 por fila y
   * por columna ("Nadie en su fila/columna llevaba ...") y repara direcciones
   * norte/sur generadas con el sentido invertido.
   */
  function normalizePuzzle(puzzle: GeneratedPuzzle): GeneratedPuzzle {
    const characters = (puzzle.characters ?? []).map((c) => ({
      ...c,
      hat: !!c.hat,
      glasses: !!c.glasses,
      eyepatch: !!c.eyepatch,
      scarf: !!c.scarf,
      cane: !!c.cane,
      ring: !!c.ring,
      medal: !!c.medal,
      isVictim: !!c.isVictim || c.id === puzzle.victimId,
    }))
    return {
      ...puzzle,
      mode: puzzle.mode === 'murder' ? 'murder' : 'treasure',
      victimId: puzzle.victimId ?? null,
      murdererId: puzzle.murdererId ?? null,
      characters,
      clues: (puzzle.clues ?? []).map((clue) => ({
        ...clue,
        text: repairClueText(clue.text, clue.characterId, characters),
      })),
    }
  }

  /**
   * Sanea el texto de una pista guardada: elimina frases incoherentes con
   * la regla de 1 persona por fila y por columna y corrige la dirección
   * norte/sur verificándola contra las posiciones reales (la fila 0 es el
   * norte y las filas crecen hacia el sur).
   */
  function repairClueText(
    text: string,
    characterId: string,
    characters: Character[],
  ): string {
    const me = characters.find((c) => c.id === characterId)
    const sanitized = text
      .replace(/Nadie en su fila llevaba [^.]+\.\s*/gi, '')
      .replace(/Nadie en su columna llevaba [^.]+\.\s*/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (!me) return sanitized
    return sanitized.replace(
      /Estaba (exactamente|al menos) (una fila|\d+ filas?) al (norte|sur) de ([^.]+)\./gi,
      (m, _adv: string, _qty: string, dir: string, name: string) => {
        const ref = characters.find((c) => c.name === name.trim())
        if (!ref || ref.id === me.id || ref.row === me.row) return m
        const correct = ref.row > me.row ? 'al norte' : 'al sur'
        return dir.toLowerCase() === correct ? m : m.replace(/al (norte|sur)/i, correct)
      },
    )
  }

  // ============================================================
  // GETTERS (COMPUTED)
  // ============================================================

  /** Indica si hay un puzzle disponible */
  const hasPuzzle = computed(() => currentPuzzle.value !== null)

  /** Número de personajes del puzzle actual */
  const numCharacters = computed(() => currentPuzzle.value?.characters.length ?? 0)

  /** Número de zonas del puzzle actual */
  const numZones = computed(() => currentPuzzle.value?.zones.length ?? 0)

  /** Indica si quedan pistas disponibles */
  const hintsRemaining = computed(() => maxHints - hintsUsed.value)

  /** Personaje por ID */
  const getCharacter = computed(() => {
    return (id: string) => currentPuzzle.value?.characters.find((c: Character) => c.id === id)
  })

  /** Pistas para un personaje específico */
  const getClues = computed(() => {
    return (characterId: string) =>
      currentPuzzle.value?.clues.filter((c: Clue) => c.characterId === characterId) ?? []
  })

  // ============================================================
  // ACCIONES
  // ============================================================

  /** Actualiza la temática seleccionada */
  function setTheme(theme: ThemeId) {
    selectedTheme.value = theme
    saveState()
  }

  /** Actualiza la dificultad seleccionada */
  function setDifficulty(difficulty: DifficultyId) {
    selectedDifficulty.value = difficulty
    saveState()
  }

  /** Actualiza el modo de juego seleccionado */
  function setMode(mode: GameMode) {
    selectedMode.value = mode
    saveState()
  }

  /**
   * Genera un nuevo puzzle con la temática, dificultad y modo actuales.
   * @returns true si la generación fue exitosa
   */
  async function generate(): Promise<boolean> {
    generationStatus.value = 'generating'
    errorMessage.value = null
    hintsUsed.value = 0  // Resetear pistas al generar un nuevo puzzle

    try {
      const puzzle = await generator.generatePuzzle(
        selectedTheme.value,
        selectedDifficulty.value,
        selectedMode.value,
      )

      if (puzzle) {
        currentPuzzle.value = puzzle
        puzzleHistory.value.unshift(puzzle)
        // Mantener solo los últimos 10 puzzles en historial
        if (puzzleHistory.value.length > 10) {
          puzzleHistory.value = puzzleHistory.value.slice(0, 10)
        }
        generationStatus.value = 'done'
        saveState()
        return true
      } else {
        generationStatus.value = 'error'
        errorMessage.value = 'Error al generar el puzzle. Inténtalo de nuevo.'
        saveState()
        return false
      }
    } catch (err) {
      console.error('Error generando puzzle:', err)
      generationStatus.value = 'error'
      errorMessage.value = 'Ocurrió un error inesperado al generar el puzzle.'
      saveState()
      return false
    }
  }

  /** Carga un puzzle del historial */
  function loadFromHistory(puzzleId: string) {
    const found = puzzleHistory.value.find((p: GeneratedPuzzle) => p.id === puzzleId)
    if (found) {
      currentPuzzle.value = found
      generationStatus.value = 'done'
      saveState()
    }
  }

  /** Limpia el puzzle actual */
  function clearPuzzle() {
    currentPuzzle.value = null
    generationStatus.value = 'idle'
    errorMessage.value = null
    hintsUsed.value = 0
    saveState()
  }

  /** Carga el caso oficial Murdoku Contest #1 (24x24) basado en mapa.png y reglas.txt */
  function loadOfficialContest() {
    const official = getOfficialContestPuzzle()
    currentPuzzle.value = official
    selectedTheme.value = 'pirates'
    selectedDifficulty.value = 'expert'
    selectedMode.value = official.mode
    generationStatus.value = 'done'
    hintsUsed.value = 0  // Resetear pistas para el caso oficial
    saveState()
  }

  /**
   * Incrementa el contador de pistas usadas
   * @returns true si se pudo usar una pista, false si no hay más disponibles
   */
  function useHint(): boolean {
    if (!currentPuzzle.value) return false
    if (hintsUsed.value >= maxHints) return false
    
    hintsUsed.value++
    saveState()
    return true
  }

  // ============================================================
  // SUSCRIPTORES
  // ============================================================

  // Guardar estado automáticamente cuando cambie el puzzle o historial
  watch([currentPuzzle, puzzleHistory, hintsUsed], () => {
    saveState()
  })

  // Cargar estado al iniciar el store
  loadState()

  // ============================================================
  // RETORNO PÚBLICO
  // ============================================================
  return {
    // Estado
    selectedTheme,
    selectedDifficulty,
    selectedMode,
    currentPuzzle,
    puzzleHistory,
    generationStatus,
    errorMessage,
    isGenerating,
    progress,
    statusMessage,
    hintsUsed,
    maxHints,
    hintsRemaining,
    // Getters
    hasPuzzle,
    numCharacters,
    numZones,
    getCharacter,
    getClues,
    // Acciones
    setTheme,
    setDifficulty,
    setMode,
    generate,
    loadFromHistory,
    loadOfficialContest,
    clearPuzzle,
    useHint,
    // Persistencia
    saveState,
    loadState,
  }
})