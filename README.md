# Clawrap

An Electron wrapper for OpenClaw's web terminal with automatic installation, cross-platform installers, and simplified user onboarding.

## Features

- **Automatic OpenClaw Installation**: The app automatically installs OpenClaw via npm if not present
- **Auto-Starting Gateway**: The gateway starts automatically when you open the app
- **First-Run Setup**: Simple wizard to configure your AI model and API key
- **Multi-Model Support**: Pre-configured with popular international and China models
  - Claude (Anthropic)
  - GPT-4o (OpenAI)
  - Gemini (Google)
  - DeepSeek
  - Qwen (Alibaba)
  - Hunyuan (Tencent)
  - ERNIE (Baidu)
  - Doubao (ByteDance)
  - Custom models

## Prerequisites

- **Node.js 22+** (or Node 24 recommended) - OpenClaw requires Node.js to run
- **npm** - Comes with Node.js

The Electron wrapper will check for OpenClaw installation and install it automatically if needed.

## Project Structure

```
clawrap/
├── src/
│   ├── main/              # Electron main process
│   ├── preload/           # Preload scripts
│   ├── renderer/          # UI (install, setup wizard, terminal)
│   └── shared/            # Shared types
├── resources/
│   └── default-config.yaml
├── package.json
├── tsconfig.json
└── electron-builder.json
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

   On first run, the app will:
   1. Check if OpenClaw is installed globally
   2. Install OpenClaw if not found (`npm install -g openclaw@latest`)
   3. Show the first-run setup wizard
   4. Start the OpenClaw gateway
   5. Open the terminal window

### Building

Build for all platforms:
```bash
npm run build
```

Build for specific platforms:
```bash
npm run build:mac     # macOS (DMG + ZIP)
npm run build:win     # Windows (NSIS installer + Portable)
npm run build:linux   # Linux (AppImage + DEB + RPM)
```

Output will be in the `release/` directory.

## How It Works

### OpenClaw Installation

Unlike typical Electron apps that bundle a binary, Clawrap:

1. **Checks** if `openclaw` is installed globally via npm
2. **Installs** automatically using `npm install -g openclaw@latest` if not found
3. **Runs** the gateway using `openclaw gateway --port 18789`

This approach:
- Keeps the Electron app small (~10MB instead of ~100MB)
- Allows OpenClaw to be updated independently
- Works with the existing OpenClaw distribution model

### Gateway Lifecycle

The Electron app manages the OpenClaw gateway:

1. **Start**: Spawns `openclaw gateway` as a subprocess
2. **Port**: Uses default port 18789
3. **Health**: Monitors gateway status
4. **Stop**: Gracefully shuts down on app quit

## Configuration

On first run, the app creates a configuration file:

- **macOS**: `~/Library/Application Support/OpenClaw/config.yaml`
- **Windows**: `%APPDATA%/OpenClaw/config.yaml`
- **Linux**: `~/.config/OpenClaw/config.yaml`

### Default Configuration

The app comes with sensible defaults:
- Pre-selected skills (plan, TDD, review tools)
- Pre-selected tools (Read, Write, Edit, Bash, etc.)
- Bypass channel settings
- Empty model configuration (user must set up on first run)

## Packaging & Distribution

### macOS

- **DMG**: Drag-and-drop installer
- **ZIP**: For auto-updater
- Supports both Intel (x64) and Apple Silicon (arm64)

### Windows

- **NSIS Installer**: Standard Windows installer
- **Portable**: Single executable, no installation required

### Linux

- **AppImage**: Universal Linux package
- **DEB**: For Debian/Ubuntu
- **RPM**: For RHEL/Fedora

## First-Run Flow

When a user opens the app for the first time:

1. **Check Installation**: App checks if OpenClaw is installed
2. **Install** (if needed): Shows installation progress
3. **Setup Wizard**: Model selection + API key configuration
4. **Launch**: Gateway starts and terminal opens

## Development Notes

### Adding New Models

Edit `src/shared/types.ts` to add new preset models:

```typescript
export const PRESET_MODELS: ModelConfig[] = [
  // Add your model here
  { id: "my-model", name: "My Model (Provider)", provider: "provider" },
  // ...
];
```

### Manual OpenClaw Installation

If automatic installation fails, users can install manually:

```bash
npm install -g openclaw@latest
```

Then restart the Electron app.

## Troubleshooting

### Installation Issues

If OpenClaw fails to install automatically:

1. Ensure Node.js 22+ is installed: `node --version`
2. Try manual installation: `npm install -g openclaw@latest`
3. Check npm permissions (may need `sudo` on macOS/Linux)

### Gateway Won't Start

1. Check if port 18789 is available
2. Run `openclaw doctor` in terminal to diagnose
3. Check logs in the Electron app (View → Toggle Developer Tools)

## License

MIT

## Contributing

Contributions welcome! Please follow the existing code style.

## Resources

- [OpenClaw Documentation](https://docs.openclaw.ai)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
