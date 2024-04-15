<template>
  <div class="flex flex-col h-full">
    <div class="flex flex-0 title-bar bg-title-bar text-white justify-between text-sm">
      <div class="flex py-2 px-3">
        OWN3D Pro Desktop
        <span class="indicator hidden"></span>
      </div>
      <div class="flex">
        <ObsWebsocketInfobar />

        <button onclick="electron.desktop.minimizeWindow()"
                tabindex="-1"
                class="bg-title-bar hover:bg-title-bar-hover text-zinc-400 px-4">
          <i class="fa-light fa-fw fa-dash"></i>
        </button>
        <button onclick="electron.desktop.maximizeWindow()"
                tabindex="-1"
                class="bg-title-bar hover:bg-title-bar-hover text-zinc-400 px-4">
          <i class="fa-light fa-fw fa-square"></i>
        </button>
        <button onclick="electron.desktop.closeWindow()"
                tabindex="-1"
                class="bg-title-bar hover:bg-title-bar-close hover:text-zinc-200 text-zinc-400 px-4">
          <i class="fa-light fa-fw fa-xmark"></i>
        </button>
      </div>
    </div>
    <div class="flex-1 flex justify-center text-white" id="webview-loader">
      <div class="self-center">
        <i class="fa-light fa-fw fa-spinner-third fa-spin fa-4x text-zinc-500"></i>
      </div>
    </div>
    <div class="flex-1 hidden" id="webview-container"></div>
  </div>
</template>

<script setup lang="ts">
import ObsWebsocketInfobar from '../components/ObsWebsocketInfobar.vue'
</script>