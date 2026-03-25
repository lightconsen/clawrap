# OpenClaw Desktop - Implementation Plan

## Overview
Create an Electron wrapper for OpenClaw's web terminal with bundled gateway, cross-platform installers, and simplified user onboarding.

## Project Structure
```
openclaw-desktop/
├── package.json
├── electron-builder.json
├── tsconfig.json
├── src/
│   ├── main/
│   │   ├── index.ts              # Main process entry
│   │   ├── gateway-manager.ts    # Gateway lifecycle management
│   │   ├── config-manager.ts     # Config file management
│   │   └── auto-updater.ts       # Auto-update logic
│   ├── preload/
│   │   └── index.ts              # Preload script for IPC
│   ├── renderer/
│   │   ├── index.html
│   │   ├── setup/
│   │   │   ├── index.html        # First-run setup wizard
│   │   │   ├── setup.css
│   │   │   └── setup.ts          # Model selection & API key
│   │   └── terminal/
│   │       └── ...               # OpenClaw web terminal embed
│   └── shared/
│       ├── types.ts
│       └── constants.ts
├── resources/
│   ├── gateway/                  # Bundled OpenClaw gateway binary
│   │   ├── openclaw-gateway-darwin
│   │   ├── openclaw-gateway-win.exe
│   │   └── openclaw-gateway-linux
│   └── default-config.yaml       # Default configuration
└── build-scripts/
    ├── download-gateway.sh       # Download gateway binaries
    └── prepare-resources.js
```

## Phase 1: Project Setup & Foundation

### 1.1 Initialize Project
- Create package.json with Electron + TypeScript
- Install dependencies: electron, electron-builder, typescript, @types/node
- Configure TypeScript compiler options
- Set up development scripts (dev, build, package)

### 1.2 Build Configuration
- Configure electron-builder for all platforms
- Set up macOS signing (if certificates available)
- Configure Windows installer (NSIS)
- Configure Linux packages (AppImage, deb, rpm)
- Set up build scripts for automated packaging

## Phase 2: Gateway Integration

### 2.1 Gateway Binary Management
- Create download-gateway.sh script to fetch latest OpenClaw gateway binaries
- Store binaries in resources/gateway/
- Implement version checking for gateway updates
- Add binary verification (checksums)

### 2.2 Gateway Lifecycle Manager
- Implement gateway process spawn/kill
- Handle gateway startup errors
- Monitor gateway health (HTTP health check)
- Port allocation (find available port)
- Gateway log capture for debugging
- Graceful shutdown on app quit

## Phase 3: Configuration System

### 3.1 Default Config Design
```yaml
# default-config.yaml
version: "1.0"
settings:
  gateway:
    port: 0  # Auto-assign
    host: "127.0.0.1"

  skills:
    enabled:
      - "everything-claude-code:plan"
      - "everything-claude-code:tdd"
      - "everything-claude-code:e2e"
      - "everything-claude-code:python-review"
      - "everything-claude-code:go-review"

  tools:
    enabled:
      - "Read"
      - "Write"
      - "Edit"
      - "Bash"
      - "Grep"
      - "Glob"
      - "Task"

  bypass_channels:
    - type: "claude_code"
      enabled: true

  model: null  # User must configure on first run
```

### 3.2 Config Manager
- Config location:
  - macOS: `~/Library/Application Support/OpenClaw/config.yaml`
  - Windows: `%APPDATA%/OpenClaw/config.yaml`
  - Linux: `~/.config/OpenClaw/config.yaml`
- Copy default config on first run
- Config validation schema
- Runtime config updates via IPC

## Phase 4: Setup Wizard (First Run)

### 4.1 UI Design
- Clean, minimal setup window
- Step 1: Welcome / Introduction
- Step 2: Model Selection (dropdown + custom input)
- Step 3: API Key Input (masked, with validation)
- Step 4: Confirmation & Launch

### 4.2 Model Selection Options
```typescript
const PRESET_MODELS = [
  // International Models
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5 (Anthropic)", provider: "anthropic" },
  { id: "claude-opus-4-5", name: "Claude Opus 4.5 (Anthropic)", provider: "anthropic" },
  { id: "gpt-4o", name: "GPT-4o (OpenAI)", provider: "openai" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini (OpenAI)", provider: "openai" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Google)", provider: "google" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Google)", provider: "google" },

  // China Models
  { id: "deepseek-chat", name: "DeepSeek-V3 (DeepSeek)", provider: "deepseek" },
  { id: "deepseek-reasoner", name: "DeepSeek-R1 (DeepSeek)", provider: "deepseek" },
  { id: "qwen-max", name: "Qwen Max (Alibaba)", provider: "alibaba" },
  { id: "qwen-plus", name: "Qwen Plus (Alibaba)", provider: "alibaba" },
  { id: "hunyuan-standard", name: "Hunyuan Standard (Tencent)", provider: "tencent" },
  { id: "hunyuan-pro", name: "Hunyuan Pro (Tencent)", provider: "tencent" },
  { id: "ernie-4.0", name: "ERNIE 4.0 (Baidu)", provider: "baidu" },
  { id: "doubao-pro", name: "Doubao Pro (ByteDance)", provider: "bytedance" },
  { id: "custom", name: "Custom Model (Other)", provider: "custom" }
];
```

### 4.3 API Key Validation
- Basic format validation per provider
- Optional: Test API call to validate key
- Secure storage using electron-safe-storage

## Phase 5: Main Application Window

### 5.1 Terminal Window
- Load OpenClaw web terminal in iframe or BrowserView
- Pass gateway port to terminal via query params
- Handle IPC between main and renderer for:
  - Config changes
  - Gateway status
  - Menu actions

### 5.2 Menu & Shortcuts
- Application menu (File, Edit, View, Help)
- Keyboard shortcuts for common actions
- Tray icon for background operation
- Window state persistence

## Phase 6: Packaging & Distribution

### 6.1 Installer Requirements

**macOS:**
- DMG for distribution
- Zip for auto-updater
- Notarization (if Apple Developer account)
- Universal binary (Intel + Apple Silicon)

**Windows:**
- NSIS installer (.exe)
- MSI alternative for enterprise
- Sign with code signing certificate

**Linux:**
- AppImage (universal)
- .deb for Debian/Ubuntu
- .rpm for RHEL/Fedora
- tar.gz for manual install

### 6.2 Auto-Updater
- Integrate electron-updater
- Check for updates on startup
- Silent background updates where supported
- Release notes display

## Implementation Steps

### Step 1: Basic Electron App (2 hours)
- [ ] Initialize npm project
- [ ] Install Electron + TypeScript
- [ ] Create main process entry
- [ ] Create basic window
- [ ] Add dev scripts

### Step 2: Gateway Integration (3 hours)
- [ ] Download gateway binaries
- [ ] Implement gateway manager
- [ ] Add health checking
- [ ] Handle graceful shutdown

### Step 3: Config System (2 hours)
- [ ] Create default config
- [ ] Implement config manager
- [ ] Config file I/O
- [ ] IPC for config updates

### Step 4: Setup Wizard (4 hours)
- [ ] Create setup window HTML/CSS
- [ ] Implement model selection UI
- [ ] API key input with validation
- [ ] First-run detection logic
- [ ] Save config after setup

### Step 5: Terminal Integration (3 hours)
- [ ] Embed OpenClaw web terminal
- [ ] Gateway port injection
- [ ] IPC bridge setup
- [ ] Error handling

### Step 6: Packaging (3 hours)
- [ ] Configure electron-builder
- [ ] Test macOS build
- [ ] Test Windows build
- [ ] Test Linux build
- [ ] Create build scripts

### Step 7: Polish (2 hours)
- [ ] App icons for all platforms
- [ ] Menu implementation
- [ ] Tray icon
- [ ] Auto-updater
- [ ] Logging

## Dependencies

```json
{
  "dependencies": {
    "electron": "^30.0.0",
    "electron-updater": "^6.1.0",
    "electron-log": "^5.0.0",
    "js-yaml": "^4.1.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/js-yaml": "^4.0.0",
    "electron-builder": "^24.0.0",
    "typescript": "^5.3.0"
  }
}
```

## Risks

1. **HIGH**: OpenClaw gateway binary size (~100MB per platform) - will increase installer size
2. **MEDIUM**: Gateway port conflicts - need dynamic port allocation
3. **MEDIUM**: Code signing certificates required for smooth macOS/Windows installs
4. **LOW**: Auto-updater complexity on Linux

## Success Criteria

- [ ] Single installer per platform that includes gateway
- [ ] Gateway starts automatically with desktop app
- [ ] First-run wizard for model/API key configuration
- [ ] OpenClaw terminal accessible after setup
- [ ] All preset models work when configured correctly
- [ ] Works offline after initial setup
