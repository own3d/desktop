import { default as OBSWebSocket, EventSubscription } from 'obs-websocket-js'

(async () => {
    console.log('Creating transition...')
    const obs = new OBSWebSocket()
    await obs.connect(`ws://localhost:4455`, '133700', {
        rpcVersion: 1,
        eventSubscriptions: EventSubscription.All | EventSubscription.InputVolumeMeters,
    })

    /**
     * transitionKinds: [
     *     'cut_transition',
     *     'fade_transition',
     *     'swipe_transition',
     *     'slide_transition',
     *     'obs_stinger_transition',
     *     'fade_to_color_transition',
     *     'wipe_transition'
     *   ]
     */

    // obs_stinger_transition
    console.log(
        await obs.call('CreateInput', {
            sceneName: 'Scene',
            inputKind: 'obs_stinger_transition',
            sceneItemEnabled: true,
            inputName: 'Stinger2',
        })
    )

    // await obs.call('CallVendorRequest', {
    //     vendorName: 'OWN3D',
    //     requestType: 'CreateSceneTransition',
    //     requestData: {
    //         sceneTransitionName: 'Stinger2',
    //         sceneTransitionType: 'Stinger',
    //         sceneTransitionSettings: {
    //             transitionPoint: 1500,
    //             video: 'C:\\Users\\Ghost\\Downloads\\glitchpro-transition.webm',
    //         },
    //     }
    // })

    console.log('Transition created')
})()