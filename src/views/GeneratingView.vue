<script setup lang="ts">
/**
 * Vista de generación: muestra animación de progreso mientras se crea el puzzle.
 * Lanza la generación automáticamente al montarse.
 */
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Sparkles } from 'lucide-vue-next'
import { usePuzzleStore } from '@/stores/puzzle'
import { getTheme, getDifficulty } from '@/data/themes'
import { GAME_MODES } from '@/types/puzzle'

const router = useRouter()
const store = usePuzzleStore()

const theme = getTheme(store.selectedTheme)
const difficulty = getDifficulty(store.selectedDifficulty)
const modeInfo = GAME_MODES[store.selectedMode] ?? GAME_MODES.treasure

// Pasos de generación para mostrar en la UI
const steps = [
  { label: 'Diseñando el mapa', emoji: '🗺️', at: 0 },
  { label: 'Creando personajes', emoji: '🧑', at: 25 },
  { label: 'Distribuyendo objetos', emoji: '📦', at: 50 },
  { label: 'Redactando pistas', emoji: '📜', at: 75 },
  { label: '¡Puzzle listo!', emoji: '✨', at: 95 },
]

// Calcular el paso activo basado en el progreso
function activeStep(progress: number): number {
  for (let i = steps.length - 1; i >= 0; i--) {
    if (progress >= steps[i].at) return i
  }
  return 0
}

onMounted(async () => {
  const success = await store.generate()
  if (success) {
    // Pequeña pausa para que el usuario vea el 100%
    await new Promise(r => setTimeout(r, 600))
    router.push({ name: 'puzzle' })
  } else {
    router.push({ name: 'home' })
  }
})
</script>

<template>
  <main class="min-h-screen flex flex-col items-center justify-center px-4 py-12">
    <div class="w-full max-w-lg text-center">

      <!-- Icono animado de la temática -->
      <div class="relative inline-flex items-center justify-center mb-8">
        <!-- Anillo giratorio exterior -->
        <div class="absolute w-36 h-36 rounded-full border-2 border-dashed border-amber-500/30 animate-spin-slow" />
        <!-- Anillo interior con pulso -->
        <div class="absolute w-28 h-28 rounded-full border border-violet-500/40 animate-ping opacity-30" />
        <!-- Emoji central flotante -->
        <div class="w-24 h-24 rounded-3xl bg-gradient-to-br from-dark-700 to-dark-800 border border-amber-500/30 flex items-center justify-center shadow-2xl animate-float">
          <span class="text-5xl">{{ theme.emoji }}</span>
        </div>
        <!-- Partículas decorativas -->
        <Sparkles class="absolute -top-2 -right-2 w-6 h-6 text-amber-400 animate-glow-pulse" />
        <div class="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-violet-500 animate-bounce" />
        <div class="absolute top-0 left-0 w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
      </div>

      <!-- Título -->
      <h1 class="font-display text-3xl font-black text-white mb-2">
        Creando tu puzzle
      </h1>
      <p class="text-gray-400 mb-1">
        <span class="text-amber-400">{{ modeInfo.emoji }} {{ modeInfo.name }}</span> ·
        <span class="text-amber-400">{{ theme.name }}</span> ·
        <span class="text-gray-300">{{ difficulty.name }}</span> ·
        <span class="font-mono text-sm">{{ difficulty.gridSize }}×{{ difficulty.gridSize }}</span>
      </p>
      <p class="text-sm text-gray-600 mb-10">{{ store.statusMessage }}</p>

      <!-- Barra de progreso -->
      <div class="relative w-full h-3 bg-dark-700 rounded-full overflow-hidden border border-white/5 mb-8">
        <!-- Track animado de fondo -->
        <div class="absolute inset-0 shimmer opacity-30" />
        <!-- Progreso actual -->
        <div
          class="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
          :style="{
            width: `${store.progress}%`,
            background: 'linear-gradient(90deg, #8B5CF6, #FFD54A, #F59E0B)',
          }"
        />
      </div>

      <!-- Porcentaje -->
      <div class="flex items-center justify-between text-sm mb-8">
        <span class="text-gray-500">Generando...</span>
        <span class="font-mono font-bold text-amber-400">{{ Math.round(store.progress) }}%</span>
      </div>

      <!-- Pasos de generación -->
      <div class="space-y-3">
        <div
          v-for="(step, idx) in steps"
          :key="idx"
          class="flex items-center gap-3 p-3 rounded-xl transition-all duration-500"
          :class="[
            activeStep(store.progress) === idx
              ? 'glass-gold border border-amber-500/30 scale-105'
              : activeStep(store.progress) > idx
              ? 'opacity-50'
              : 'opacity-20'
          ]"
        >
          <!-- Icono estado -->
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center flex-none"
            :class="[
              activeStep(store.progress) > idx
                ? 'bg-green-500/20 border border-green-500/40'
                : activeStep(store.progress) === idx
                ? 'bg-amber-500/20 border border-amber-500/40'
                : 'bg-white/5 border border-white/10'
            ]"
          >
            <span v-if="activeStep(store.progress) > idx" class="text-green-400 text-sm">✓</span>
            <span v-else class="text-sm">{{ step.emoji }}</span>
          </div>

          <!-- Texto -->
          <div class="flex-1 text-left">
            <p
              class="text-sm font-medium transition-colors"
              :class="activeStep(store.progress) === idx ? 'text-amber-400' : 'text-gray-400'"
            >
              {{ step.label }}
            </p>
          </div>

          <!-- Puntos de carga si está activo -->
          <div
            v-if="activeStep(store.progress) === idx"
            class="flex gap-1"
          >
            <span
              v-for="i in 3" :key="i"
              class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
              :style="{ animationDelay: `${(i - 1) * 0.15}s` }"
            />
          </div>
        </div>
      </div>

    </div>
  </main>
</template>
