/**
 * OWN3D ID user structure
 */
export interface Own3dProUser {
    id: string
    name: string
    avatar_url: string
}

export interface Oauth2Token {
    token_type: string
    expires_in: number
    access_token: string
    refresh_token: string | null
    expires_at: string
}

/**
 * Oauth2 credential structure including user information
 */
export interface Own3dCredentials extends Oauth2Token {
    user: Own3dProUser
}

export interface Display {
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

/**
 * File structure for user settings
 * Which is stored in %APPDATA%/own3d/desktop-overlay.json
 */
export interface Settings {
    version?: string // version of the settings schema (diff will force a reset)
    credentials?: Own3dCredentials | null
    launch_with_obs?: boolean
    developer_mode?: boolean
    overlay_disabled?: boolean
    overlay_muted?: boolean
    hotkeys?: {
        exit: string
    }
    obs?: {
        url: string
        password: string
    }
    display?: Display | null
    room?: string | null
}

export interface VerifiedGame {
    id: number
    name: string
    publisher: string | null
    notes: string | null
    supported: boolean
    requires_optimization: boolean
    executables: Array<string>
    image_url: string | null
}

export interface Authorization {
    data: {
        jwt_tokens: {
            socket: string
        }
        name: string
        id: string
    }
    locale: string
    token: string
}