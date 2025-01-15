import fs from 'fs'
import axios, { AxiosResponse } from 'axios'
import { spawn } from 'child_process'
import log from 'electron-log/main';

export type SoftwareName = 'obs-studio' | 'obs-own3d-desktop-connector';

export interface Software {
    installed: boolean;
    name: SoftwareName;
    paths?: {
        binary: string;
        plugins?: string;
    };
}

export interface InstallProgress {
    status: 'downloading' | 'installing';
    progress: number;
    status_code?: number;
}

export function useSoftware() {
    const get = async (name: SoftwareName): Promise<Software> => {
        switch (name) {
            case 'obs-studio':
                return isObsStudioInstalled()
            case 'obs-own3d-desktop-connector':
                const {installed, paths} = await get('obs-studio')
                if (!installed) {
                    return new Promise((resolve) => resolve({
                        installed: false,
                        name: 'obs-own3d-desktop-connector',
                    }))
                }
                return isObsOwn3dDesktopConnectorInstalled(paths)
            default:
                throw new Error('Unknown software name')
        }
    }

    const pathExists = async (path: string): Promise<boolean> => {
        try {
            await fs.promises.access(path)
            return true
        } catch (error) {
            return false
        }
    }

    const isObsStudioInstalled = async (): Promise<Software> => {
        const wellKnownPaths = [
            {
                binary: 'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe',
                plugins: 'C:\\Program Files\\obs-studio\\obs-plugins\\64bit',
            },
            {
                binary: 'C:\\Program Files\\obs-studio\\bin\\32bit\\obs32.exe',
                plugins: 'C:\\Program Files\\obs-studio\\obs-plugins\\32bit',
            },
        ]

        for (const paths of wellKnownPaths) {
            if (await pathExists(paths.binary) && await pathExists(paths.plugins)) {
                return {
                    installed: true,
                    name: 'obs-studio',
                    paths: paths,
                }
            }
        }

        return {
            installed: false,
            name: 'obs-studio',
        }
    }

    const isObsOwn3dDesktopConnectorInstalled = async (obsPaths: Record<string, string>): Promise<Software> => {
        // check if obs-own3d-pro-connector.dll exists in the obs-plugins directory
        const own3dPluginPath = `${obsPaths.plugins}\\obs-own3d-pro-connector.dll`
        if (await pathExists(own3dPluginPath)) {
            return {
                installed: true,
                name: 'obs-own3d-desktop-connector',
                paths: {
                    binary: own3dPluginPath,
                },
            }
        }

        return {
            installed: false,
            name: 'obs-own3d-desktop-connector',
        }
    }

    const install = async (
        name: SoftwareName,
        progressCallback: (progress: InstallProgress) => void,
    ): Promise<Software> => {
        const repository = 'https://own3d-desktop-assets.b-cdn.net/software'
        const {data} = await axios.get(`${repository}/software.json`) as AxiosResponse<{
            name: string;
            version: string;
            files: {
                file: string;
                args?: string[];
                platform: string;
            }[]
        }[]>

        log.log(data)
        const software = data.find((software) => software.name === name)
        const platform = 'windows'

        if (!software) {
            throw new Error('Software not found')
        }

        const file = software.files.find((file) => file.platform === platform)

        if (!file) {
            throw new Error('File not found')
        }

        const downloadUrl = `${repository}/${software.name}/${software.version}/${platform}/${file.file}`

        const response = await axios.get(downloadUrl, {
            responseType: 'stream',
        }) as AxiosResponse<NodeJS.ReadableStream>

        // download the executable and report the progress
        let downloaded = 0
        const total = Number(response.headers['content-length'])
        response.data.on('data', (chunk: Buffer) => {
            downloaded += chunk.length
            progressCallback({
                status: 'downloading',
                progress: downloaded / total,
            })
        })

        const path = `C:\\Users\\Ghost\\Downloads\\${file.file}`
        const writer = fs.createWriteStream(path)
        response.data.pipe(writer)

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve)
            writer.on('error', reject)
        })

        // report that the installation is starting
        progressCallback({
            status: 'installing',
            progress: 0,
        })

        // run the executable
        const command = `runas /user:Administrator "${path}"`;
        const child = spawn(command, file.args, {
            //windowsHide: true,
        })

        // wait for the installation to finish
        await new Promise((resolve) => {
            child.on('exit', resolve)
            child.on('error', resolve)
        })

        progressCallback({
            status: 'installing',
            progress: 1,
            status_code: child.exitCode,
        })

        // check if the software was installed successfully
        return get(name)

    }

    return {
        get,
        install
    }
}