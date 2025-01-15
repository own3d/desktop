// maybe a slick way to auto-start the companion app when any streaming software is started
import { exec, ExecException } from 'child_process'
import {Settings} from "./schema"
import log from 'electron-log/main'

export class AppLaunchWatcher {
    private apps: string[]
    private callbackCalled: boolean
    private settings: Settings

    constructor(settings: Settings) {
        this.apps = ['obs', 'Streamlabs', 'XSplit']
        this.callbackCalled = false
        this.settings = settings
    }

    checkObs(callback: () => void) {
        const command = process.platform === 'win32' ? 'tasklist' : 'ps aux'
        exec(command, (err: ExecException | null, stdout: string) => {
            if (err) {
                log.error(err)
                return
            }
            // check if one of the apps is running
            // if so, emit the callback once
            // reset if none of the apps are running
            if (this.apps.some(app => stdout.includes(app))) {
                if (!this.callbackCalled) {
                    this.callbackCalled = true
                    callback()
                }
            } else {
                this.callbackCalled = false
            }
        })
    }

    watch(callback: () => void) {
        if (this.settings.launch_with_obs) {
            log.log('launch with obs')
            setInterval(() => this.checkObs(callback), 1000)
        } else {
            log.log('Not launching with obs')
        }
    }
}