const { utils: { fromBuildIdentifier } } = require('@electron-forge/core');

module.exports = {
  buildIdentifier: process.env.IS_BETA ? 'beta' : 'prod',
  packagerConfig: {
    appBundleId: fromBuildIdentifier({ beta: 'tv.own3d.desktop-beta', prod: 'tv.own3d.desktop' }),
    icon: 'images/icon'
  },
  rebuildConfig: {},
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'own3d',
          name: 'desktop'
        },
        prerelease: true
      }
    }
  ],
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        iconUrl: 'https://assets.cdn.own3d.tv/production/desktop/images/icon.ico',
        setupIcon: 'images/icon.ico',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          icon: 'images/icon.png'
        }
      }
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
};
