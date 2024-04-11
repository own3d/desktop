import { exec, ExecFileException } from 'child_process'
import {VerifiedGame} from "./schema"
import axios, { AxiosResponse } from 'axios'

export class GameWatcher {
    private interval: ReturnType<typeof setInterval>
    private runningGames: Array<VerifiedGame>

    constructor() {
        this.interval = null
        this.runningGames = []
    }

    async watch(callback: (verifiedGames: Array<VerifiedGame>) => void) {
        const response: AxiosResponse<{
            data: Array<VerifiedGame>
        }> = await axios.get('https://api.own3d.pro/v1/verified-games')

        response.data.data.push({
            id: 100,
            name: 'Lethal Company',
            publisher: 'Zeekerss',
            notes: null,
            supported: true,
            requires_optimization: false,
            executables: ['Lethal Company.exe'],
            image_url: 'https://assets.cdn.own3d.tv/production/pro/verified-games/co5ive.png'
        })
        response.data.data.push({
            id: 101,
            name: 'PhpStorm',
            publisher: 'JetBrains',
            notes: null,
            supported: true,
            requires_optimization: false,
            executables: ['phpstorm64.exe'],
            image_url: 'https://assets.cdn.own3d.tv/production/pro/verified-games/jetbrains.png'
        })

        clearInterval(this.interval)
        this.interval = setInterval(() => this.handle(response.data.data, callback), 2500)

        return response.data.data
    }

    exit() {
        clearInterval(this.interval)
    }

    /**
     * Check if any of the verified games are running
     */
    handle(verifiedGames: Array<VerifiedGame>, callback: (verifiedGames: Array<VerifiedGame>) => void) {
        exec('tasklist', (err: ExecFileException | null, stdout: string) => {
            if (err) {
                console.error(err)
                return
            }

            this.runningGames = verifiedGames.filter(
                (verifiedGame: VerifiedGame) => verifiedGame.executables.filter(
                    x => stdout.includes(x)
                ).length > 0
            )

            callback(this.runningGames)
        })
    }

    /**
     * List of running games
     */
    getGames(): Array<VerifiedGame> {
        return this.runningGames
    }
}