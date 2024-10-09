export {} // Make this a module

declare global {
    // This allows TypeScript to pick our custom API
    namespace electron {
        // here we define the API that we copy later to @own3d/electron-types
    }
}
