<template>
  <div>
    <iframe
        v-show="room"
        :src="src"
        ref="iframe"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        allow="encrypted-media"
        scrolling="yes"
        frameborder="0"
    />
    <div class="iframe-container">
      <div ref="interact" id="interact"/>
      <div ref="text" id="text">
        ✨ Press Ctrl+Shift+O to exit the OWN3D overlay
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      hovered: false,
      room: false,
      settings: null,
    };
  },
  computed: {
    src() {
      const params = new URLSearchParams({
        language: "en",
        platform: "desktop",
        environment: "production",
      });

      return `https://browser-source.ext-own3d.tv/latest/effects.html?${params.toString()}#room=${this.room}`;
    },
  },
  mounted() {
    console.log('Sending Room to Source', this.room)
    // get initial games
    window.electron.onSettingsChanged(this.settingsChanged)
    window.electron.getSettings()
        .then(this.settingsChanged)
        .catch(err => console.error(err))

    this.$refs.iframe.addEventListener("load", () => {
      console.log('iframe loaded')
      this.emitVolume();
    });

    this.$refs.interact.addEventListener("mouseenter", () => {
      if (this.hovered) return;
      this.hovered = true;
      this.$refs.text.style.opacity = "70%";

      setTimeout(() => {
        this.$refs.text.style.opacity = "0";
        this.hovered = false;
      }, 2500);
    });
  },

  methods: {
    settingsChanged(settings) {
      console.log('Sending Room to Source', this.room)
      this.settings = settings;
      if (settings.room !== this.room) {
        console.log("room changed", settings.room)
        this.room = settings.room;
      }
      this.emitVolume();
    },
    // emit volume to iframe
    emitVolume() {
      this.$refs.iframe.contentWindow.postMessage({
        type: "muted",
        muted: this.settings.overlay_muted,
      }, "*");
    },
  }
}
</script>

<style>
#text {
  font-size: 40px;
  font-weight: bold;
  pointer-events: all;
  opacity: 0;
  text-align: center
}

#interact {
  width: 100%;
  height: 3px;
  background: transparent;
}

html, body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica,
  Arial, sans-serif;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

* {
  background-color: transparent;
  user-select: none;
  overflow: hidden;
}

.iframe-container {
  position: absolute;
  z-index: 20;
  width: 100%;
  height: 100%;
}

iframe {
  z-index: 10;
  position: absolute;
  width: 100%;
  height: 100%;
  border: none;
  overflow: hidden;
}
</style>