# NeatGit

A modern, beautiful Git client built with Electron, React, and TypeScript.

## Features

- Clean and intuitive user interface
- Multi-repository support with tabs
- Easy branch management
- Visual diff viewer
- File staging and committing
- Real-time repository status updates
- Drag-and-drop tab reordering

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd neat-git

# Install dependencies
npm install

# Start the development server
npm start
```

## Running as a Desktop App (Electron)

This project can also be run as a desktop application using Electron.

**Development Mode:**
```sh
# Run the app in Electron development mode (with hot reload)
npm run electron:dev
```

**Build for Production:**
```sh
# Build for your current platform
npm run electron:build

# Build for specific platforms
npm run electron:build:win    # Windows
npm run electron:build:mac     # macOS
npm run electron:build:linux   # Linux
```

The built applications will be in the `release` directory.

## License

MIT
