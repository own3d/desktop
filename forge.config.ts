import type {ForgeConfig} from '@electron-forge/shared-types';
import {MakerSquirrel} from '@electron-forge/maker-squirrel';
import {MakerZIP} from '@electron-forge/maker-zip';
import {MakerDeb} from '@electron-forge/maker-deb';
import {MakerRpm} from '@electron-forge/maker-rpm';
import {PublisherGithub} from '@electron-forge/publisher-github';
import {VitePlugin} from '@electron-forge/plugin-vite';
import {FusesPlugin} from '@electron-forge/plugin-fuses';
import {FuseV1Options, FuseVersion} from '@electron/fuses';

const config: ForgeConfig = {
    buildIdentifier: process.env.IS_BETA ? 'beta' : 'prod',
    packagerConfig: {
        appBundleId: process.env.IS_BETA ? 'pro.own3d.desktop-beta' : 'pro.own3d.desktop',
        icon: 'images/icon',
        asar: true,
        executableName: 'own3d-desktop',
        extraResource: [
            "bin"
        ]
    },
    rebuildConfig: {},
    makers: [
        new MakerSquirrel({
            iconUrl: 'https://assets.cdn.own3d.tv/production/desktop/images/icon.ico',
            setupIcon: 'images/icon.ico',
        }),
        new MakerZIP({}, ['darwin']),
        new MakerRpm({}),
        new MakerDeb({
            options: {
                icon: 'images/icon.png',
            }
        })
    ],
    plugins: [
        new VitePlugin({
            // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
            // If you are familiar with Vite configuration, it will look really familiar.
            build: [
                {
                    // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
                    entry: 'src/main.ts',
                    config: 'vite.main.config.ts',
                },
                {
                    entry: 'src/preload.ts',
                    config: 'vite.preload.config.ts',
                },
                // {
                //     entry: 'src/webview-preload.ts',
                //     config: 'vite.preload.config.ts',
                // },
            ],
            renderer: [
                {
                    name: 'main_window',
                    config: 'vite.renderer.config.ts',
                },
                {
                    name: 'fullscreen_window',
                    config: 'vite.fullscreen.config.ts',
                },
            ],
        }),
        // Fuses are used to enable/disable various Electron functionality
        // at package time, before code signing the application
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
    publishers: [
        new PublisherGithub({
            repository: {
                owner: 'own3d',
                name: 'desktop'
            },
            prerelease: true,
            generateReleaseNotes: true,
            tagPrefix: '',
        })
    ]
};

export default config;
