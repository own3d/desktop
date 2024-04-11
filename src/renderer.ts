/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';

console.log('👋 This message is being logged by "renderer.ts", included via Vite');

document.addEventListener('DOMContentLoaded', async () => {
    const webviewLoader: HTMLElement = document.querySelector('#webview-loader')
    const webviewContainer: HTMLElement = document.querySelector('#webview-container')
    // @ts-ignore
    const preload = `file://${await window.electron.preloadPath()}`;
    // <webview src="https://www.own3d.pro/dashboard/"
    //                  class="h-full w-full"
    //                  allowpopups></webview>

    const webview: Electron.WebviewTag = document.createElement('webview')
    webview.setAttribute('src', 'https://www.own3d.pro/dashboard/')
    webview.setAttribute('class', 'h-full w-full')
    webview.setAttribute('allowpopups', '')
    webview.setAttribute('preload', preload);
    webviewContainer.appendChild(webview);
    const indicator: HTMLElement = document.querySelector('.indicator')

    // handle control+shift+i
    document.addEventListener('keyup', (e) => {
        if (e.key === 'O' && e.ctrlKey && e.shiftKey) {
            webview.openDevTools()
        }
    })

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
        if (['https://www.own3d.pro'].includes(url.hostname)
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
})