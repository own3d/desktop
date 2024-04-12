/* eslint-disable @typescript-eslint/no-unused-vars */
import path from 'path'
import { shell } from 'electron'
import { exec } from 'child_process'

const base = MAIN_WINDOW_VITE_DEV_SERVER_URL ? ['..', '..'] : ['..', '..', '..']
const inputBridgePath = path.join(__dirname, ...base, 'bin', 'InputBridge', 'InputBridge.exe')

function execHandler(err: Error | null, stdout: string, _stderr: string) {
    if (err) {
        console.error(err)
        return
    }
    console.log(stdout)
}

/**
 * Allow list of inputs to be sent to the Input.exe
 */
const inputs: string[] = [
    'BROWSER_BACK',
    'BROWSER_FORWARD',
    'BROWSER_REFRESH',
    'BROWSER_STOP',
    'BROWSER_SEARCH',
    'BROWSER_FAVORITES',
    'BROWSER_HOME',
    'VOLUME_MUTE',
    'VOLUME_DOWN',
    'VOLUME_UP',
    'MEDIA_NEXT_TRACK',
    'MEDIA_PREV_TRACK',
    'MEDIA_STOP',
    'MEDIA_PLAY_PAUSE',
    'LAUNCH_MAIL',
    'LAUNCH_MEDIA_SELECT',
    'LAUNCH_APP1',
    'LAUNCH_APP2',
]

export interface Button {
    name: string
    trigger: {
        type: 'open' | 'input'
        url?: string
        key?: string
    }
}

/**
 * This action is called when a button is invoked
 *
 * { trigger: { type: 'open', url: 'https://own3d.tv' } },
 * { trigger: { type: 'input', key: 'MEDIA_PLAY_PAUSE' }}
 * { trigger: { type: 'input', key: 'MEDIA_NEXT_TRACK' }}
 * { trigger: { type: 'input', key: 'MEDIA_PREV_TRACK' }}
 * { trigger: { type: 'input', key: 'MEDIA_STOP' }}
 *
 */
export function useButton(button: Button) {
    const {name, trigger} = button

    if (trigger.type === 'open') {
        shell.openExternal(trigger.url, {
            activate: true,
        }).then(r => console.log(r))
    } else if (trigger.type === 'input') {
        const {key} = trigger

        if (inputs.includes(key)) {
            exec(`"${inputBridgePath}" ${key}`, execHandler)
        } else {
            console.error(`Invalid input key: ${key}`)
        }
    } else {
        console.error(`Invalid trigger type: ${trigger.type}`)
    }
}