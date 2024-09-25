import { machineId } from 'node-machine-id'

export function useDevice() {

    const getDeviceId = async (): Promise<string> => {
        return await machineId()
    }

    return {
        getDeviceId,
    }
}