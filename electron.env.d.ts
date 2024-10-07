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

        type SoftwareName = 'obs-studio' | 'obs-own3d-desktop-connector';

        interface Software {
            installed: boolean;
            name: SoftwareName;
            paths?: {
                binary: string;
                plugins?: string;
            };
        }

        interface InstallProgress {
            status: 'downloading' | 'installing';
            progress: number;
            status_code?: number;
        }

        type RequestBatchOptions = {
            /**
             * The mode of execution obs-websocket will run the batch in
             */
            executionType?: RequestBatchExecutionType;
            /**
             * Whether obs-websocket should stop executing the batch if one request fails
             */
            haltOnFailure?: boolean;
        };

        declare enum RequestBatchExecutionType {
            None = -1,
            SerialRealtime = 0,
            SerialFrame = 1,
            Parallel = 2
        }

        type RequestBatchRequest<T = keyof unknown> = T extends keyof unknown ? unknown[T] extends never ? {
            requestType: T;
            requestId?: string;
        } : {
            requestType: T;
            requestId?: string;
            requestData: unknown[T];
        } : never;

        type ResponseMessage<T = keyof unknown> = T extends keyof unknown ? {
            requestType: T;
            requestId: string;
            requestStatus: {
                result: true;
                code: number;
            } | {
                result: false;
                code: number;
                comment: string;
            };
            responseData: unknown[T];
        } : never;

        namespace desktop {
            function closeWindow(): void

            function minimizeWindow(): void

            function maximizeWindow(): void

            function quit(): void

            function authenticate(authorization: Authorization): void

            function getDeviceId(): Promise<string>
        }

        /**
         * Beta API to interact with software packages
         */
        namespace software {
            /**
             * Get the status of a software package
             */
            function get(name: SoftwareName): Promise<Software>

            /**
             * Install a software package (requires admin privileges)
             * Throws an error if the software is not installable
             */
            function install(
                name: SoftwareName,
                progressCallback: (progress: InstallProgress) => void,
            ): Promise<Software>
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
