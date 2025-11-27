# NeatGit

A modern, beautiful Git client built with Electron, React, and TypeScript.

## Installation & Usage

Download the latest release for your operating system from the [releases page](https://github.com/lihail/neat-git/releases).

**Available versions:**
- **Mac (Apple Silicon)**: Download the file ending in `-arm64.dmg` for M1/M2/M3/M4 Macs
- **Mac (Intel)**: Download the other `.dmg` file for Intel-based Macs

After downloading, open the `.dmg` file and drag NeatGit to your Applications folder.

## Local Development

### Requirements

- Git
- Node.js

### Getting Started

```sh
git clone https://github.com/lihail/neat-git.git
cd neat-git
npm install
npm start
```

Running `npm start` will open the app in Electron with hot reload enabled, allowing you to see changes instantly as you develop.

### Creating a Release

To build the app for distribution:

```sh
# Build for your current platform
npm run electron:build

# Build for specific platforms
npm run electron:build:mac     # macOS (both Intel and ARM64)
npm run electron:build:win     # Windows
```

The built applications will be available in the `release` directory.

**Note:** Building for a specific platform typically requires running the build on that platform (e.g., build macOS apps on a Mac, Windows apps on Windows).
