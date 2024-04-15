<template>
  <div class="flex items-center gap-2 mr-3">
    <button @click="connect">
      <i class="fa-light fa-fw fa-link"></i>
    </button>
    <div class="opacity-90 flex items-center gap-2 text-zinc-300">
      OBS Studio:
      <div v-if="connected" class="bg-green-500 h-2.5 w-2.5 rounded-full"/>
      <div v-else class="bg-red-500 h-2.5 w-2.5 rounded-full"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const connected = ref(false)

setInterval(async () => {
  connected.value = await electron.obs.connected();
}, 1000)

const connect = async () => {
  try {
    await electron.obs.connect()
  } catch (e) {
    new Notification("Unable to connect to OBS Studio", {
      body: e.message
    })
  }
}
</script>