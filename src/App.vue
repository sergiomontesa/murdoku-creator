<script setup lang="ts">
// Componente raíz: sólo provee el shell con transición de rutas
</script>

<template>
  <!-- Fondo starfield fijo -->
  <div class="starfield" aria-hidden="true" />

  <!-- Shell de la aplicación -->
  <div class="relative min-h-screen w-full">
    <router-view v-slot="{ Component, route }">
      <transition name="route" mode="out-in">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>
  </div>
</template>
