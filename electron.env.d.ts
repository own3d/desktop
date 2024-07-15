import { RequestBatchOptions, RequestBatchRequest, ResponseMessage } from 'obs-websocket-js'

export {} // Make this a module

declare global {
    // This allows TypeScript to pick our custom API
    namespace electron {
        interface Authorization {
            data: unknown
            locale: string
            token: string
        }

        interface Display {
            id: string
            label: string
            bounds: {
                x: number
                y: number
                width: number
                height: number
            },
            workArea: {
                x: number
                y: number
                width: number
                height: number
            },
            size: {
                width: number
                height: number
            }
            workAreaSize: {
                width: number
                height: number
            }
            scaleFactor: number
            rotation: number
        }

        interface Settings {
            version?: string // version of the settings schema (diff will force a reset)
            credentials?: Own3dCredentials | null
            launch_with_obs?: boolean
            developer_mode?: boolean
            overlay_disabled?: boolean
            overlay_muted?: boolean
            hotkeys?: {
                exit: string
            }
            display?: Display | null
            room?: string | null
        }

        interface VerifiedGame {
            id: number
            name: string
            publisher: string | null
            notes: string | null
            supported: boolean
            requires_optimization: boolean
            executables: Array<string>
            image_url: string | null
        }

        namespace desktop {
            function closeWindow(): void

            function minimizeWindow(): void

            function maximizeWindow(): void

            function quit(): void

            function authenticate(authorization: Authorization): void

            function getDeviceId(): Promise<string>
        }

        function getSettings(): Promise<Settings>

        function toggleOverlay(): Promise<void>

        function toggleOverlayAudio(): Promise<void>

        function clearCache(): Promise<void>

        function commitSettings(settings: Settings): Promise<void>

        function getGames(): Promise<Array<VerifiedGame>>

        function getDisplays(): Promise<Array<Display>>

        function requestDisplayUpdate(): Promise<void>

        namespace obs {
            function connected(): Promise<boolean>

            function connect(url?: string, password?: string, identificationParams?: {}): Promise<any>

            function disconnect(): Promise<void>

            function call(requestType: string, requestData?: object): Promise<any>

            function callBatch(requests: RequestBatchRequest[], options?: RequestBatchOptions): Promise<ResponseMessage[]>

            function on(event: string, handler: Function): void

            function once(event: string, handler: Function): void

            function off(event: string, handler: Function): void

            function addListener(event: string, handler: Function): void

            function removeListener(event: string, handler: Function): void
        }
    }
}
