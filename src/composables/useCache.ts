import path from 'path'
import { getAppData } from '../helpers'
import fs from 'fs'
import axios from 'axios'

export function useCache() {
    const cacheAsset = async (url: string): Promise<{ path: string }> => {
        const assetFolder = path.join(getAppData(), 'own3d', 'assets')
        if (!fs.existsSync(assetFolder)) {
            fs.mkdirSync(assetFolder, {recursive: true})
        }

        console.log('Caching asset:', url)

        const {data, headers} = await axios.get(url, {
            responseType: 'stream',
            headers: {
                'Accept': 'application/octet-stream',
            }
        })

        if (!headers['x-cache-filename']) {
            throw new Error('x-cache-filename header not found')
        }

        const finalPath = path.join(assetFolder, headers['x-cache-filename'])

        if (fs.existsSync(finalPath)) {
            return {
                path: finalPath,
            }
        }

        data.pipe(fs.createWriteStream(finalPath))

        await new Promise((resolve, reject) => {
            data.on('end', resolve)
            data.on('error', reject)
        })

        return {
            path: finalPath,
        }
    }

    return {
        cacheAsset,
    }
}