import { shell } from 'electron'
import { generateRandomString, getChallengeFromVerifier } from '../helpers'
import axios from 'axios'
import { useContainer } from './useContainer'
import { SettingsRepository } from '../settings'

interface AccessTokenResponse {
    access_token: string
}

const oauth2: {
    client_id: string
    redirect_uri: string
    state: string
    oauth_code_verifier: string
    response: AccessTokenResponse | { error: string } | null
} = {
    client_id: '9d30851a-a9c7-4b05-bbb7-ffc46fd1c263',
    redirect_uri: 'https://assets.cdn.own3d.tv/production/desktop/oauth2/callback.html',
    state: null,
    oauth_code_verifier: null,
    response: null,
}

export function useOauth2() {
    const {get} = useContainer()
    const settingsRepository = get(SettingsRepository)

    const redirect = async (): Promise<AccessTokenResponse> => {
        // if we have credentials, return them
        const {credentials} = settingsRepository.getSettings()
        if (credentials) {
            return {access_token: credentials.access_token}
        }

        // generate random state
        oauth2.state = generateRandomString()
        oauth2.oauth_code_verifier = generateRandomString()

        // create oauth authorization url
        const params = new URLSearchParams({
            client_id: oauth2.client_id,
            redirect_uri: oauth2.redirect_uri,
            response_type: 'code',
            scope: 'user:read connections',
            state: btoa(JSON.stringify({state: oauth2.state, port: 41466})),
            prompt: 'none',
        })

        params.set('code_challenge', await getChallengeFromVerifier(oauth2.oauth_code_verifier))
        params.set('code_challenge_method', 'S256')

        const url = `https://id.stream.tv/oauth/authorize?${params.toString()}`
        await shell.openExternal(url)

        // wait until the user is redirected back
        return new Promise((resolve, reject) => {
            console.log('Waiting for response...')
            // wait max 10 seconds
            const interval = setInterval(() => {
                if (oauth2.response) {
                    clearInterval(interval)
                    if ('error' in oauth2.response) {
                        reject(oauth2.response.error)
                    } else {
                        resolve(oauth2.response as AccessTokenResponse)
                    }
                }
            }, 1000)
            setTimeout(() => {
                clearInterval(interval)
                reject('Timeout')
            }, 10000)
        }) as Promise<AccessTokenResponse>
    }

    const callback = async ({code, state}) => {
        const {state: originalState} = JSON.parse(atob(state))
        if (originalState !== oauth2.state) {
            console.error('Invalid state')
            oauth2.response = {error: 'Invalid state'}
            return
        }

        if (!code) {
            console.error('No code')
            oauth2.response = {error: 'No code received'}
            return
        }

        const formData = new FormData()
        formData.append('grant_type', 'authorization_code')
        formData.append('client_id', oauth2.client_id)
        formData.append('redirect_uri', oauth2.redirect_uri)
        formData.append('code_verifier', oauth2.oauth_code_verifier)
        formData.append('code', code)

        try {
            const {data} = await axios.post('https://id.stream.tv/oauth/token', formData)
            await settingsRepository.setCredentialsFromToken({
                ...data,
                expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
            })
            oauth2.state = null
            oauth2.response = {access_token: data.access_token}
        } catch (e) {
            console.error(e)
            oauth2.response = {error: 'Token exchange failed'}
        }
    }

    return {
        redirect,
        callback,
    }
}