import defu from 'defu'
import { platform } from 'node:process'
import * as fs from 'fs'
import { Own3dCredentials, Settings } from './schema'

const defaults: Settings = {
    version: '1.1.0',
    credentials: null,
    launch_with_obs: true,
    developer_mode: false,
    overlay_disabled: false,
    overlay_muted: false,
    hotkeys: {
        exit: 'CommandOrControl+Shift+O',
    },
    display: null,
    room: null,
}

export class SettingsRepository {
    private settings: Settings | null
    private readonly path: string
    private readonly listeners: Array<(settings: Settings) => void>
    private readonly directory: string

    constructor() {
        this.listeners = []
        this.settings = defaults
        this.directory = this.appdata('/own3d')

        if (!fs.existsSync(this.directory)) {
            console.log('Creating directory', this.directory)
            fs.mkdirSync(this.directory)
        }

        this.path = `${this.directory}/desktop-overlay.json`
    }

    async restore(): Promise<Settings> {
        // load settings from path
        // using node's fs module if file does not exist, create it with defaults
        // if file exists, load it into this.settings

        try {
            const data = await fs.promises.readFile(this.path, {encoding: 'utf-8'})

            if (data) {
                const settings = JSON.parse(data) as Settings

                if (settings.version !== defaults.version) {
                    console.log('Settings version mismatch, resetting to defaults')
                    this.settings = defaults
                } else {
                    this.settings = defu(settings, defaults)
                }
            } else {
                this.settings = defaults
            }
        } catch (e) {
            this.settings = defaults
        }

        await this.save()

        return this.settings
    }

    async save(): Promise<void> {
        // call all listeners with the current settings
        this.listeners.forEach(
            (listener: (settings: Settings) => void) => listener(this.settings),
        )

        const pretty = JSON.stringify(this.settings, null, 2)

        await fs.promises.writeFile(this.path, pretty, {encoding: 'utf-8'})
    }

    appdata(path: string): string {
        if (process.env.APPDATA) {
            return process.env.APPDATA + path
        }

        if (platform === 'darwin') {
            return process.env.HOME + '/Library/Preferences' + path
        }

        return process.env.HOME + '/.local/share' + path
    }

    getSettings(): Settings {
        return this.settings
    }

    watch(callback: (settings: Settings) => void) {
        // add callback to list of listeners
        this.listeners.push(callback)
    }

    setCredentials(credentials: Own3dCredentials) {
        this.settings.credentials = credentials
    }

    setRoom(room: string) {
        this.settings.room = room
    }

    async commitSettings(settings: Settings): Promise<void> {
        this.settings = defu(settings, this.settings)
        // defu will not remove a key if it is set to null, so we need to do that manually
        const keys = Object.keys(settings)
        for (const key of keys) {
            // @ts-ignore
            if (settings[key] === null && this.settings[key]) this.settings[key] = null
        }
        await this.save()
    }

    async logout(): Promise<void> {
        this.settings.credentials = null
        this.settings.room = null
        await this.save()
    }
}