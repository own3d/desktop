type Constructor<T> = new (...args: any[]) => T;

interface Container {
    get<T>(classType: Constructor<T> | string): T;

    bind<T>(classType: Constructor<T> | string, instance: T): T;
}

const services: Map<Constructor<any> | string, any> = new Map()

export function useContainer(): Container {
    const get = <T>(classType: Constructor<T> | string): T => {
        const service = services.get(classType)

        if (!service) {
            const name = typeof classType === 'string' ? classType : classType.name
            throw new Error(`Service ${name} has not been registered.`)
        }

        return service
    }

    const bind = <T>(classType: Constructor<T> | string, instance: T): T => {
        if (services.has(classType)) {
            const name = typeof classType === 'string' ? classType : classType.name
            throw new Error(`Service ${name} is already registered.`)
        }
        services.set(classType, instance)

        return instance
    }

    return {
        get,
        bind,
    }
}