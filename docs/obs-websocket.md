# OBS Websocket

Consult the official
[OBS Websocket documentation](https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md)
for more information.

## OWN3D Vendor Events

These are events that can be interpreted by the OWN3D Desktop app. Technically, they are just Vendor Requests that are
intercepted by the OWN3D Desktop app and then internally processed.

### CreateSceneTransition

Creates a new scene transition in OBS.

```ts
await electron.obs.call('CallVendorRequest', {
    vendorName: 'OWN3D',
    requestType: 'CreateSceneTransition',
    requestData: {
        id: "obs_stinger_transition",
        name: "Stinger 2",
        settings: {
            path: "https://api.own3d.pro/v1/asset-files/{uuid}/download",
            transition_point: 123
        },
    },
})
```