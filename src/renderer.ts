import { createApp } from 'vue'
import App from './views/App.vue'

import './index.css'
import log from 'electron-log/renderer'

createApp(App).mount('#app')

log.log('👋 This message is being logged by "renderer.ts", included via Vite')

declare global {
    interface Window {
        resetWebview: () => void
        pushRoute: (to: string) => void
        dev: () => void
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // @ts-ignore
    const hostname = await window.electron.getHostname()
    const webviewLoader: HTMLElement = document.querySelector('#webview-loader')
    const outsideWarning: HTMLElement = document.querySelector('#outside-warning')
    const webviewContainer: HTMLElement = document.querySelector('#webview-container')
    const webview: Electron.WebviewTag = document.createElement('webview')
    webview.setAttribute('src', `${hostname}/dashboard/`)
    webview.setAttribute('class', 'h-full w-full')
    webview.setAttribute('allowpopups', '')
    // @ts-ignore
    webview.setAttribute('preload', `file://${await window.electron.preload()}`)
    webviewContainer.appendChild(webview)
    const indicator: HTMLElement = document.querySelector('.indicator')

    // handle control+shift+i
    document.addEventListener('keyup', (e) => {
        if (e.key === 'O' && e.ctrlKey && e.shiftKey) {
            webview.openDevTools()
        }
    })

    // @ts-ignore
    if (await window.electron.needsDevTools()) {
        webview.openDevTools()
    }

    window.dev = () => webview.openDevTools()

    const loadstart = () => {
        indicator.innerText = 'loading...'
    }

    const loadstop = () => {
        indicator.innerText = ''
    }

    webview.addEventListener('ipc-message', event => {
        // prints "ping"
        log.log(event.channel)
    })

    webview.addEventListener('did-start-loading', loadstart)
    webview.addEventListener('did-stop-loading', loadstop)

    // ensure /dashboard/ path is always on own3d.pro routes, otherwise redirect to it
    webview.addEventListener('will-navigate', (e) => {
        webviewLoader.classList.remove('hidden')
        webviewContainer.classList.add('hidden')

        const url = new URL(e.url)

        const inside = [
            'www.own3d.pro',
            'store.own3d.pro',
            'api.own3d.pro',
            'api.staging.own3d.pro',
            'id.stream.tv',
            'develop--pro-frontend.netlify.app',
            'id-canary.ingress.hel1.k8s.stream.tv',
            'localhost',
        ].includes(url.hostname)

        if (inside) {
            outsideWarning.classList.add('hidden')
        } else {
            outsideWarning.classList.remove('hidden')
        }

        if (url.hostname === hostname
            && !url.pathname.startsWith('/dashboard/')) {
            webview.loadURL(`https://${url.hostname}/dashboard/`)
            log.log('redirecting to dashboard', {
                url: url,
                pathname: url.pathname,
                startsWith: url.pathname.startsWith('/dashboard/'),
            })
        }
        log.log('will-navigate', {url: url.toString()})
    })

    webview.addEventListener('dom-ready', () => {
        webview.insertCSS('html,body{user-select: none;}')
        webviewLoader.classList.add('hidden')
        webviewContainer.classList.remove('hidden')
    })

    window.resetWebview = async () => {
        // @ts-ignore
        const hostname = await window.electron.getHostname()
        webview.setAttribute('src', `${hostname}/dashboard/`)
        outsideWarning.classList.add('hidden')
    }

    window.pushRoute = async (to) => {
        await webview.executeJavaScript(`window.pushRoute('${to}')`)
    }
})