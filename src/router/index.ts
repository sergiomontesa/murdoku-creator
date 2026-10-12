/**
 * Configuración del router de Vue Router 4.
 * Define las rutas de la aplicación Murdoku Creator.
 */
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { usePuzzleStore } from '@/stores/puzzle'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: 'Murdoku Creator - Inicio' },
  },
  {
    path: '/generating',
    name: 'generating',
    component: () => import('@/views/GeneratingView.vue'),
    meta: { title: 'Murdoku Creator - Generando...' },
    // Guardia: sólo se puede acceder si hay una generación en curso o puzzle
    beforeEnter: () => {
      const store = usePuzzleStore()
      if (store.generationStatus === 'idle') {
        return { name: 'home' }
      }
    },
  },
  {
    path: '/puzzle',
    name: 'puzzle',
    component: () => import('@/views/PuzzleView.vue'),
    meta: { title: 'Murdoku Creator - Tu Puzzle' },
    // Guardia: sólo si hay un puzzle generado
    beforeEnter: () => {
      const store = usePuzzleStore()
      if (!store.hasPuzzle) {
        return { name: 'home' }
      }
    },
  },
  {
    // Ruta 404: redirigir a inicio
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  },
})

// Actualizar el título de la página en cada navegación
router.afterEach((to) => {
  document.title = (to.meta.title as string) ?? 'Murdoku Creator'
})

export default router
