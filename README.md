# NeatGit

A modern, beautiful, cross-platform Git client built with Electron, React and TypeScript.

## Installation

### macOS

1. Download the latest release from the [releases page](https://github.com/lihail/neat-git/releases).
   - **macOS (Apple Silicon: M1/M2/M3, etc.)**: Choose the file ending in `-arm64-mac.dmg`
   - **macOS (Intel)**: Choose the file ending in `-x64-mac.dmg`

2. Open the `.dmg` file and drag NeatGit to your Applications folder.

3. Since NeatGit is not a certified Apple application, macOS will block the app from opening the first time. To resolve this, use one of the following options (you only need to do this once):
   - **Option 1:** Right-click the app → click **Open** → click **Open** in the confirmation dialog.

   - **Option 2:** Run the following command in Terminal:
     ```sh
     xattr -cr /Applications/NeatGit.app
     ```

### Windows

The app was tested on Windows 10 64 bit, and might or might not work on other versions of Windows.

1. Download the latest release from the [releases page](https://github.com/lihail/neat-git/releases). Choose the file ending in `.exe`.

2. Open the `.exe` file and install.

## Local Development

### Requirements

- git
- Node.js

### Getting Started

```sh
git clone https://github.com/lihail/neat-git.git
cd neat-git
npm install
npm start
```

Running `npm start` will open the app in Electron with hot reload enabled, allowing you to see changes instantly as you develop (unless they are in the electron backend, which requires an app restart).

### Creating a Release

1. If the icon was changed (`public/icon.svg`), run the following command. Otherwise, skip this step:

```sh
npm run generate-icons
```

2. Build the app:

```sh
# Build for your current platform
npm run electron:build

# Build for specific platforms
npm run electron:build:mac     # macOS (both Intel and ARM64)
npm run electron:build:win     # Windows
```

The built applications will be available in the `release` directory.

**Note:** Building for a specific platform typically requires running the build **on that platform** (e.g., build macOS apps on a Mac, Windows apps on Windows).

3. Create a git tag (where `<version>` is, for example, v1.0.0):

```sh
git tag <version>
git push origin <version>
```

4. Create a release the [releases page](https://github.com/lihail/neat-git/releases) and upload the built applications to that page.

## Issues and Bugs

Please submit any issue or bug reports on the [issues page](https://github.com/lihail/neat-git/issues).

## License

NeatGit is licensed under the [MIT](https://github.com/lihail/neat-git/blob/main/LICENSE.TXT) license.
