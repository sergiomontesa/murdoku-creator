<script setup lang="ts">
/**
 * Vista principal: selección de temática y dificultad.
 * El usuario configura el puzzle antes de generarlo.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Sparkles, Wand2, ChevronRight, Clock, Layers, Users, Search, HelpCircle, X } from 'lucide-vue-next'
import { usePuzzleStore } from '@/stores/puzzle'
import { THEME_LIST, DIFFICULTY_LIST } from '@/data/themes'
import type { ThemeId, DifficultyId, ThemeInfo, DifficultyInfo } from '@/types/puzzle'

const router = useRouter()
const store = usePuzzleStore()

// Estado local de selección
const hoveredTheme = ref<ThemeId | null>(null)

// Modal de ayuda: se muestra en la primera visita
const showHelp = ref(false)
onMounted(() => {
  try {
    if (!localStorage.getItem('murdoku-help-seen')) showHelp.value = true
  } catch {
    showHelp.value = true
  }
})
function closeHelp() {
  showHelp.value = false
  try {
    localStorage.setItem('murdoku-help-seen', '1')
  } catch {
    /* sin persistencia disponible */
  }
}

// Buscador de tematicas (13 disponibles)
const themeQuery = ref('')
const filteredThemes = computed(() =>
  THEME_LIST.filter((t: ThemeInfo) =>
    t.name.toLowerCase().includes(themeQuery.value.trim().toLowerCase())
  )
)

// Computed para la tarjeta de tema seleccionado
const selectedThemeData = computed(() =>
  THEME_LIST.find((t: ThemeInfo) => t.id === store.selectedTheme)
)
const selectedDifficultyData = computed(() =>
  DIFFICULTY_LIST.find((d: DifficultyInfo) => d.id === store.selectedDifficulty)
)

// Selección de temática
function selectTheme(id: ThemeId) {
  store.setTheme(id)
}

// Selección de dificultad
function selectDifficulty(id: DifficultyId) {
  store.setDifficulty(id)
}

// Lanzar generación
async function startGeneration() {
  store.generationStatus = 'generating'
  router.push({ name: 'generating' })
}


</script>

<template>
  <main class="min-h-screen w-full flex flex-col items-center px-4 py-8 lg:py-12">

    <!-- ===== CABECERA ===== -->
    <header class="text-center mb-10 animate-fade-up">
      <!-- Logo / Título -->
      <div class="inline-flex items-center gap-3 mb-4">
        <div class="relative">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse-gold">
            <span class="text-2xl">🗡️</span>
          </div>
          <div class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
            <Sparkles class="w-3 h-3 text-white" />
          </div>
        </div>
        <div class="text-left">
          <h1 class="font-display text-3xl lg:text-4xl font-black tracking-tight text-gradient-gold">
            Murdoku Creator
          </h1>
          <p class="font-script text-lg text-amber-400/80 -mt-1">by AI</p>
        </div>
      </div>

      <p class="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
        Crea puzzles deductivos a medida con temática, mapa y personajes procedimentales.
        Coloca a cada sospechoso en su casilla y encuentra el tesoro escondido.
      </p>

      <!-- Aviso de fines educativos -->
      <p class="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-gray-400 bg-white/5 border border-white/10">
        🎓 Proyecto con fines exclusivamente educativos y de aprendizaje
      </p>
    </header>

    <div class="mb-8 animate-fade-up">
      <button
        @click="showHelp = true"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl glass border border-white/10 text-sm text-gray-300 hover:text-amber-300 hover:border-amber-500/40 transition-all cursor-pointer"
      >
        <HelpCircle class="w-4 h-4" />
        <span>Cómo jugar</span>
      </button>
    </div>

    <!-- ===== SECCIÓN: TEMÁTICA ===== -->
    <section class="w-full max-w-5xl mb-10 animate-fade-up" style="animation-delay: 0.1s">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
          <Layers class="w-4 h-4 text-violet-400" />
        </div>
        <h2 class="font-display text-xl font-bold text-white">Elige la temática</h2>
        <div class="flex-1 h-px bg-gradient-to-r from-violet-500/30 to-transparent" />
      </div>

      <div class="relative mb-4">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          v-model="themeQuery"
          type="text"
          placeholder="Buscar temática..."
          aria-label="Buscar temática"
          class="w-full glass rounded-xl border border-white/10 pl-9 pr-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 outline-none focus:border-amber-500/50 transition-colors"
        />
      </div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
        <button
          v-for="theme in filteredThemes"
          :key="theme.id"
          :id="`theme-${theme.id}`"
          @click="selectTheme(theme.id as ThemeId)"
          @mouseenter="hoveredTheme = theme.id as ThemeId"
          @mouseleave="hoveredTheme = null"
          :class="[
            'group relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 cursor-pointer text-center',
            store.selectedTheme === theme.id
              ? 'glass-gold border-amber-500/50 shadow-lg shadow-amber-500/20 scale-105'
              : 'glass border-white/5 hover:border-white/20 hover:scale-102'
          ]"
        >
          <!-- Emoji central -->
          <span
            class="text-4xl transition-transform duration-300 group-hover:scale-110"
            :class="{ 'animate-float': store.selectedTheme === theme.id }"
          >
            {{ theme.emoji }}
          </span>

          <!-- Nombre -->
          <span
            class="font-display text-sm font-bold leading-tight transition-colors duration-200"
            :class="store.selectedTheme === theme.id ? 'text-amber-400' : 'text-gray-300'"
          >
            {{ theme.name }}
          </span>

          <!-- Indicador de selección -->
          <div
            v-if="store.selectedTheme === theme.id"
            class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-md"
          >
            <span class="text-xs text-black font-black">✓</span>
          </div>

          <!-- Glow de fondo al hover -->
          <div
            v-if="hoveredTheme === theme.id || store.selectedTheme === theme.id"
            class="absolute inset-0 rounded-2xl opacity-10 bg-gradient-to-br transition-opacity duration-300"
            :class="`bg-gradient-to-br ${theme.gradient}`"
          />
        </button>
      </div>
      <p v-if="filteredThemes.length === 0" class="mt-4 text-center text-sm text-gray-500">Sin resultados para esa búsqueda.</p>

      <!-- Descripción de la temática seleccionada y catálogo de objetos -->
      <transition name="route">
        <div v-if="selectedThemeData" class="mt-4 glass rounded-2xl p-5 border border-white/10 space-y-3">
          <div class="flex items-center gap-3">
            <span class="text-3xl">{{ selectedThemeData.emoji }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-display font-bold text-white text-base">{{ selectedThemeData.name }}</h3>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                  {{ selectedThemeData.objects.length }} objetos con iconos únicos
                </span>
              </div>
              <p class="text-xs text-gray-400 mt-0.5">{{ selectedThemeData.description }}</p>
            </div>
          </div>

          <!-- Muestra de objetos clasificados -->
          <div class="pt-2 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <!-- Ocupables -->
            <div>
              <span class="text-[11px] font-bold text-emerald-400 block mb-1">
                🪑 Objetos Ocupables (se pueden sentar/tumbar):
              </span>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="obj in selectedThemeData.objects.filter(o => o.occupiable)"
                  :key="obj.id"
                  class="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium inline-flex items-center gap-1"
                >
                  <span class="font-emoji">{{ obj.emoji }}</span>
                  <span>{{ obj.name }}</span>
                </span>
              </div>
            </div>

            <!-- Fijos / No ocupables -->
            <div>
              <span class="text-[11px] font-bold text-amber-400 block mb-1">
                ⛔ Objetos Fijos (pistas de adyacencia):
              </span>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="obj in selectedThemeData.objects.filter(o => !o.occupiable)"
                  :key="obj.id"
                  class="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 inline-flex items-center gap-1"
                >
                  <span class="font-emoji">{{ obj.emoji }}</span>
                  <span>{{ obj.name }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </section>

    <!-- ===== SECCIÓN: DIFICULTAD ===== -->
    <section class="w-full max-w-5xl mb-10 animate-fade-up" style="animation-delay: 0.2s">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
          <Wand2 class="w-4 h-4 text-rose-400" />
        </div>
        <h2 class="font-display text-xl font-bold text-white">Nivel de dificultad</h2>
        <div class="flex-1 h-px bg-gradient-to-r from-rose-500/30 to-transparent" />
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          v-for="diff in DIFFICULTY_LIST"
          :key="diff.id"
          :id="`difficulty-${diff.id}`"
          @click="selectDifficulty(diff.id as DifficultyId)"
          :class="[
            'group relative flex flex-col items-start gap-3 p-5 rounded-2xl border transition-all duration-300 cursor-pointer text-left',
            store.selectedDifficulty === diff.id
              ? 'scale-105'
              : 'glass border-white/5 hover:border-white/20 hover:scale-102'
          ]"
          :style="store.selectedDifficulty === diff.id
            ? `background: rgba(0,0,0,0.5); border-color: ${diff.color}50; box-shadow: 0 0 20px ${diff.color}30`
            : ''"
        >
          <!-- Emoji + nombre -->
          <div class="flex items-center gap-2">
            <span class="text-2xl">{{ diff.emoji }}</span>
            <span
              class="font-display text-base font-bold"
              :style="store.selectedDifficulty === diff.id ? `color: ${diff.color}` : ''"
              :class="store.selectedDifficulty !== diff.id ? 'text-gray-200' : ''"
            >
              {{ diff.name }}
            </span>
          </div>

          <!-- Descripción -->
          <p class="text-xs text-gray-400 leading-relaxed">{{ diff.description }}</p>

          <!-- Stats -->
          <div class="flex flex-wrap gap-2 mt-auto">
            <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
              <span class="font-mono">{{ diff.gridSize }}×{{ diff.gridSize }}</span>
            </span>
            <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
              <Users class="w-3 h-3" />
              {{ diff.numCharacters }}
            </span>
            <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
              <Layers class="w-3 h-3" />
              {{ diff.numZones }}
            </span>
          </div>

          <!-- Indicador de selección -->
          <div
            v-if="store.selectedDifficulty === diff.id"
            class="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
            :style="`background: ${diff.color}`"
          >
            <span class="text-xs text-black font-black">✓</span>
          </div>
        </button>
      </div>
    </section>

    <!-- ===== RESUMEN + BOTÓN GENERAR ===== -->
    <section class="w-full max-w-5xl animate-fade-up" style="animation-delay: 0.3s">
      <div class="glass-gold rounded-3xl p-6 lg:p-8 flex flex-col lg:flex-row items-center gap-6 border-glow-gold">

        <!-- Resumen de configuración -->
        <div class="flex-1 grid grid-cols-3 gap-4">
          <div class="text-center">
            <div class="text-3xl mb-1">{{ selectedThemeData?.emoji }}</div>
            <p class="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Temática</p>
            <p class="font-display font-bold text-sm text-white">{{ selectedThemeData?.name }}</p>
          </div>
          <div class="text-center border-x border-white/10">
            <div class="text-3xl mb-1">{{ selectedDifficultyData?.emoji }}</div>
            <p class="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Dificultad</p>
            <p class="font-display font-bold text-sm text-white">{{ selectedDifficultyData?.name }}</p>
          </div>
          <div class="text-center">
            <div class="text-3xl mb-1 font-mono font-black text-amber-400">
              {{ selectedDifficultyData?.gridSize }}×{{ selectedDifficultyData?.gridSize }}
            </div>
            <p class="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Grid</p>
            <p class="font-display font-bold text-sm text-white">{{ selectedDifficultyData?.numCharacters }} personajes</p>
          </div>
        </div>

        <!-- Botón generar -->
        <div class="flex flex-col items-center gap-3">
          <button
            id="btn-generate"
            @click="startGeneration"
            class="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-display font-black text-lg text-black bg-gradient-to-r from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 overflow-hidden"
          >
            <!-- Shimmer interno -->
            <div class="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Wand2 class="w-5 h-5 relative z-10" />
            <span class="relative z-10">¡Generar Puzzle!</span>
            <ChevronRight class="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
          </button>
          <p class="text-xs text-gray-600 flex items-center gap-1">
            <Clock class="w-3 h-3" />
            Generación en ~3 segundos
          </p>
        </div>
      </div>
    </section>

    <!-- ===== HISTORIAL ===== -->
    <section
      v-if="store.puzzleHistory.length > 0"
      class="w-full max-w-5xl mt-10 animate-fade-up"
    >
      <div class="flex items-center gap-3 mb-4">
        <h2 class="font-display text-base font-bold text-gray-500">Puzzles anteriores</h2>
        <div class="flex-1 h-px bg-white/5" />
      </div>
      <div class="flex gap-3 overflow-x-auto pb-2">
        <button
          v-for="past in store.puzzleHistory.slice(0, 5)"
          :key="past.id"
          @click="store.loadFromHistory(past.id); router.push({ name: 'puzzle' })"
          class="flex-none glass rounded-xl p-3 border border-white/5 hover:border-white/20 transition-all duration-200 text-left"
        >
          <p class="font-display text-sm font-bold text-white truncate w-32">{{ past.title }}</p>
          <p class="text-xs text-gray-500 mt-0.5">{{ past.gridSize }}×{{ past.gridSize }} · {{ past.characters.length }} personajes</p>
        </button>
      </div>
    </section>

    <!-- ===== MODAL DE AYUDA ===== -->
    <transition name="fade">
      <div
        v-if="showHelp"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        @click.self="closeHelp"
      >
        <div class="glass-gold rounded-2xl max-w-lg w-full p-6 border-glow-gold animate-scale-in max-h-[85vh] overflow-y-auto">
          <div class="flex items-start justify-between gap-3 mb-4">
            <h2 class="font-display text-xl font-black text-white">Cómo jugar</h2>
            <button
              @click="closeHelp"
              aria-label="Cerrar ayuda"
              class="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          <ol class="space-y-3 text-sm text-gray-300">
            <li class="flex gap-2.5">
              <span class="flex-none w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center justify-center">1</span>
              <p><strong class="text-white">Un sospechoso por fila y por columna.</strong> Como en el sudoku: si dos fichas comparten fila o columna, verás un aviso rojo.</p>
            </li>
            <li class="flex gap-2.5">
              <span class="flex-none w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center justify-center">2</span>
              <p><strong class="text-white">Lee los testimonios.</strong> Cada pista describe dónde estaba alguien: junto a un objeto, en una zona o al este/oeste de otro. Algunos llevan 🎩 👓 👁️ y las pistas los mencionan («al este de Marta, que llevaba gafas»).</p>
            </li>
            <li class="flex gap-2.5">
              <span class="flex-none w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center justify-center">3</span>
              <p><strong class="text-white">Fíjate en el suelo.</strong> Lo verde se puede ocupar (camas, sillas, hamacas); lo gris son objetos fijos que solo sirven de referencia.</p>
            </li>
            <li class="flex gap-2.5">
              <span class="flex-none w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center justify-center">4</span>
              <p><strong class="text-white">El tesoro está en la última casilla.</strong> Cuando las 23 fichas estén bien colocadas, solo quedará una fila y una columna libres: su cruce esconde el tesoro.</p>
            </li>
            <li class="flex gap-2.5">
              <span class="flex-none w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center justify-center">5</span>
              <p><strong class="text-white">Pide ayuda si te atascas.</strong> Tienes 3 pistas que colocan una ficha y el botón Comprobar, que cuenta aciertos sin revelar cuáles.</p>
            </li>
          </ol>
          <button
            @click="closeHelp"
            class="mt-6 w-full py-3 rounded-xl font-display font-black text-sm bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            ¡A investigar!
          </button>
        </div>
      </div>
    </transition>

    <!-- ===== FOOTER ===== -->
    <footer class="mt-16 text-center text-gray-600 text-xs">
      <p>Murdoku Creator — Generador de puzzles con IA</p>
      <!-- Aviso legal: desarrollo con fines educativos -->
      <p class="mt-1">Proyecto desarrollado solo con fines educativos y de aprendizaje.</p>
      <p class="mt-1">
        Inspirado en <a href="https://murdoku.com" target="_blank" class="text-amber-600 hover:text-amber-400 transition-colors">murdoku.com</a> de Manuel Garand
      </p>
    </footer>

  </main>
</template>
