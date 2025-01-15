<template>
  <div class="flex items-center gap-2 mr-3">
    <div class="opacity-90 flex items-center gap-2 text-zinc-300">
      OBS Studio:
      <div v-if="connected" class="bg-green-500 h-2.5 w-2.5 rounded-full" />
      <div v-else class="bg-red-500 h-2.5 w-2.5 rounded-full" />
      <a href="#" @click.prevent="openSettings" target="_blank" class="text-zinc-300/30 hover:text-zinc-100">
        <i class="fas fa-gear" />
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const connected = ref(false)

const onClosed = async () => {
  connected.value = false
}

const onOpened = async () => {
  connected.value = true
}

const openSettings = () => {
  window.pushRoute('/dashboard/desktop-settings')
}

// reconnect handler
setInterval(async () => {
  const connected = await electron.obs.connected()
  if (!connected) await electron.obs.connect()
}, 5000)

onMounted(async () => {
  electron.obs.on('ConnectionOpened', onOpened)
  electron.obs.on('ConnectionClosed', onClosed)
  connected.value = await electron.obs.connected()

  try {
    await electron.obs.connect()
  } catch (e) {}
})

onUnmounted(async () => {
  electron.obs.off('ConnectionOpened', onOpened)
  electron.obs.off('ConnectionClosed', onClosed)
})
</script>