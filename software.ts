import { InstallProgress, useSoftware } from './src/composables/useSoftware'

const {install} = useSoftware();

install('obs-studio', function (progress: InstallProgress) {
    console.log(progress)
})
    .then(console.log)
    .catch(console.error)