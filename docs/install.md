# Installation Guide

**Language / 语言**: [English](#installation-guide) | [中文](docs/install.cn.md)

This guide covers installation for both end users and developers.

## For End Users

### Quick Install

1. Download the installer from [Releases](https://github.com/lightconsen/clawrap/releases)
2. Run the installer for your platform
3. Open Clawrap and follow the setup wizard

### System Requirements

- **Node.js 22+** (Node 24 recommended)
- **npm** (comes with Node.js)
- **Operating System**: macOS 10.13+, Windows 10+, or Linux

### Verifying Node.js Installation

Before installing Clawrap, verify Node.js is installed:

```bash
node --version
```

If you see `v22.x.x` or higher, you're ready. If not, install Node.js from [nodejs.org](https://nodejs.org).

---

## For Developers

### Prerequisites

- Node.js 22+
- pnpm 9+
- Git

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/lightconsen/clawrap.git
cd clawrap
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Run in development mode**

```bash
pnpm run dev
```

On first run, the app will:
- Check if OpenClaw is installed globally
- Install OpenClaw if not found
- Show the first-run setup wizard
- Start the OpenClaw gateway
- Open the terminal window

---

## Building for Production

### Build for all platforms

```bash
pnpm run build
```

### Build for specific platforms

```bash
pnpm run build:mac     # macOS (DMG + ZIP)
pnpm run build:win     # Windows (NSIS installer + Portable)
pnpm run build:linux   # Linux (AppImage + DEB + RPM)
```

Build artifacts appear in the `release/` directory.

---

## Project Structure

```
clawrap/
├── src/
│   ├── main/              # Electron main process
│   │   └── index.ts       # Main entry point, gateway management
│   ├── preload/           # Preload scripts for IPC
│   │   └── index.ts       # Exposes API to renderer
│   ├── renderer/          # React UI components
│   │   ├── components/    # Views (Install, Setup, Terminal, Settings)
│   │   ├── store/         # App state management
│   │   ├── lib/           # Utilities
│   │   └── assets/        # Static assets
│   └── shared/            # Shared types and interfaces
├── resources/
│   └── default-config.yaml # Default OpenClaw configuration
├── scripts/               # Build and utility scripts
├── .github/workflows/     # CI/CD configuration
├── package.json
├── tsconfig.json
└── electron-builder.json
```

---

## Development Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Run in development mode |
| `pnpm run build` | Build for all platforms |
| `pnpm run build:mac` | Build for macOS |
| `pnpm run build:win` | Build for Windows |
| `pnpm run build:linux` | Build for Linux |
| `pnpm run clean` | Remove build artifacts |

---

## Architecture

### Main Process

The Electron main process (`src/main/index.ts`) manages:
- OpenClaw gateway subprocess lifecycle
- Configuration file I/O
- OAuth authentication flow
- IPC handlers for renderer communication

### Renderer Process

The React-based UI (`src/renderer/`) provides:
- Installation view (checks and installs OpenClaw)
- Setup wizard (model and API key configuration)
- Terminal view (embedded OpenClaw web terminal)
- Settings view (model management, skills, tools)

### Preload Scripts

The preload layer (`src/preload/index.ts`) exposes a secure API to the renderer via `contextBridge`.

---

## Adding New Models

Edit `src/shared/types.ts` to add preset models:

```typescript
export const PRESET_MODELS: ModelConfig[] = [
  // Add your model here
  {
    id: "my-model",
    name: "My Model (Provider)",
    provider: "provider",
    baseUrl: "https://api.example.com/v1",
  },
];
```

---

## CI/CD

GitHub Actions automatically:
- Builds installers on MAJOR or MINOR version bumps
- Runs build tests on PATCH or BUILD version bumps
- Creates GitHub releases with all installers

See `.github/workflows/build.yml` for configuration.
