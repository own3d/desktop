import defu from 'defu'
import { platform } from 'node:process'
import * as fs from 'fs'
import { Oauth2Token, Own3dCredentials, Settings } from './schema'
import axios from 'axios'

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
    obs: {
        url: 'auto',
        password: 'auto',
    }
}

export class SettingsRepository {
    private settings: Settings | null
    private session_domain: string
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

        this.path = `${this.directory}/desktop.json`
    }

    async restore(checkCredentials: false): Promise<Settings> {
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

        if (checkCredentials) {
            if (this.settings.credentials) {
                await this.setCredentialsFromToken(this.settings.credentials)
            } else {
                console.log('No credentials found')
            }
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

    setSessionDomain(hostname: string) {
        this.session_domain = hostname
    }

    async setCredentials(credentials: Own3dCredentials) {
        this.settings.credentials = credentials
    }

    async setCredentialsFromToken(oauth2Token: Oauth2Token) {
        const {access_token, token_type} = oauth2Token
        try {
            const {data} = await axios.get('https://id.stream.tv/api/users', {
                headers: {
                    Authorization: `${token_type} ${access_token}`,
                },
            })
            await this.setCredentials({
                ...oauth2Token,
                user: data,
            })
        } catch (e) {
            console.error('User data request failed', e)
            this.settings.credentials = null
        } finally {
            await this.save()
        }
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

    async checkCredentials(): Promise<boolean> {
        return !!this.settings.credentials
    }

    async logout(): Promise<void> {
        this.settings.credentials = null
        this.settings.room = null
        await this.save()
    }
}