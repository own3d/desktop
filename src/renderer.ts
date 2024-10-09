import { createApp } from 'vue'
import App from './views/App.vue'

import './index.css'

createApp(App).mount('#app')

console.log('👋 This message is being logged by "renderer.ts", included via Vite')

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

    //@ts-ignore
    window.dev = () => webview.openDevTools()

    const loadstart = () => {
        indicator.innerText = 'loading...'
    }

    const loadstop = () => {
        indicator.innerText = ''
    }

    webview.addEventListener('ipc-message', event => {
        // prints "ping"
        console.log(event.channel)
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
            'id.stream.tv',
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
            console.log('redirecting to dashboard', {
                url: url,
                pathname: url.pathname,
                startsWith: url.pathname.startsWith('/dashboard/'),
            })
        }
        console.log('will-navigate', {url: url})
    })

    webview.addEventListener('dom-ready', () => {
        webview.insertCSS('html,body{user-select: none;}')
        webviewLoader.classList.add('hidden')
        webviewContainer.classList.remove('hidden')
    })

    // @ts-ignore
    window.resetWebview = async () => {
        // @ts-ignore
        const hostname = await window.electron.getHostname()
        webview.setAttribute('src', `${hostname}/dashboard/`)
        outsideWarning.classList.add('hidden')
    }
})