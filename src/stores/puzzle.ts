/**
 * Store principal del puzzle Murdoku.
 * Gestiona el estado global del puzzle generado y la sesión del usuario.
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { GeneratedPuzzle, ThemeId, DifficultyId, Character, Clue } from '@/types/puzzle'
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
        if (state.currentPuzzle) currentPuzzle.value = state.currentPuzzle
        if (state.puzzleHistory) puzzleHistory.value = state.puzzleHistory
        if (state.hintsUsed !== undefined) hintsUsed.value = state.hintsUsed
      }
    } catch (e) {
      console.error('Error loading state from localStorage:', e)
    }
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

  /**
   * Genera un nuevo puzzle con la temática y dificultad actuales.
   * @returns true si la generación fue exitosa
   */
  async function generate(): Promise<boolean> {
    generationStatus.value = 'generating'
    errorMessage.value = null
    hintsUsed.value = 0  // Resetear pistas al generar un nuevo puzzle

    try {
      const puzzle = await generator.generatePuzzle(
        selectedTheme.value,
        selectedDifficulty.value
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