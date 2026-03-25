# Building OpenClaw Desktop with Standalone Binary

This guide explains how to build OpenClaw Desktop with a bundled runtime using two approaches:
1. **Bundled Node.js** (Recommended) - Download and bundle Node.js binaries
2. **Standalone Binary with pkg** (Experimental) - Bundle using `pkg` (has limitations with complex packages)

## Overview

Instead of requiring users to have Node.js installed, you can bundle the runtime with the Electron app:

| Approach | Size | Reliability | Notes |
|----------|------|-------------|-------|
| Bundled Node.js | ~65MB | High | Downloads Node.js binaries, uses npm to install openclaw |
| Standalone Binary (pkg) | ~80MB | Limited | Experimental - complex packages like OpenClaw may not bundle cleanly |
| System Node.js | ~15MB | High | Requires Node.js 22+ to be pre-installed |

## Recommended: Bundled Node.js Approach

### Step 1: Download Node.js Binaries

```bash
# Download Node.js binaries for all platforms
npm run download-node
```

This downloads Node.js to:
```
resources/node/
├── darwin-arm64/
├── darwin-x64/
├── linux-x64/
└── win-x64/
```

### Step 2: Build Electron App

```bash
# Build for current platform (includes Node.js + auto-installs openclaw)
npm run build

# Or build for specific platforms
npm run build:mac      # Includes darwin-arm64 and darwin-x64 Node
npm run build:win      # Includes win-x64 Node
npm run build:linux    # Includes linux-x64 Node
```

### How It Works

1. **App starts** → GatewayManager detects platform
2. **Check for openclaw** → If not installed, uses bundled npm to install
3. **Run gateway** → Uses bundled Node.js to run openclaw
4. **Auto-install** → On first run, automatically installs `openclaw@latest`

## Experimental: Standalone Binary with pkg

> **Warning:** This approach has limitations. OpenClaw has complex dependencies (native modules, dynamic requires, ESM modules) that `pkg` may not bundle correctly.

### Step 1: Try Building Standalone Binary

```bash
# Attempt to build standalone binary
npm run build:openclaw
```

### Known Issues with pkg + OpenClaw

The following issues prevent `pkg` from successfully bundling OpenClaw:

1. **Native Modules** - `sharp` (image processing), `sqlite3` require platform-specific binaries
2. **Dynamic Requires** - OpenClaw uses dynamic `require()` calls that pkg cannot trace
3. **ESM Modules** - `import.meta` usage causes Babel parse errors
4. **Optional Dependencies** - Many optional deps cause resolution warnings

### If pkg Build Succeeds

If the build succeeds for your platform, the binaries will be at:
```
resources/bin/
├── openclaw-darwin-arm64
├── openclaw-darwin-x64
├── openclaw-linux-x64
└── openclaw-win-x64.exe
```

## Distribution Strategy

### Option 1: Platform-Specific Builds (Recommended)

Build separately for each platform with bundled Node.js:
- ✅ Smaller download (~65MB each)
- ✅ Faster builds
- ✅ Works reliably

```bash
npm run download-node  # Download all Node.js binaries
npm run build:mac      # Build for macOS
npm run build:win      # Build for Windows
npm run build:linux    # Build for Linux
```

### Option 2: Universal Build with All Binaries

Include Node.js binaries for all platforms in one build:
- ❌ Larger download (~260MB for all 4 platforms)
- ✅ Single artifact

## How Bundled Node.js Works

```
┌─────────────────────────────────────────┐
│         OpenClaw Desktop.app            │
│            (Electron wrapper)           │
│                   ~15MB                 │
├─────────────────────────────────────────┤
│  Resources/                             │
│  ├── node/darwin-arm64/                 │
│  │   ├── bin/node           ~40MB       │
│  │   └── bin/npm                        │
│  └── default-config.yaml                │
└─────────────────────────────────────────┘
              Total: ~55MB

On first run:
1. Detects bundled Node.js
2. Runs: npm install -g openclaw@latest
3. Caches openclaw for future runs
```

## Fallback Behavior

The GatewayManager has a fallback chain:

1. **Standalone binary** - Check `resources/bin/openclaw-{platform}`
2. **Bundled Node.js** - Use `resources/node/{platform}/bin/node`
3. **System Node.js** - Use system `node` and `npm`

If none work, the app shows an installation error.

## Verification

After building, verify the bundled Node.js works:

```bash
# macOS
./resources/node/darwin-arm64/bin/node --version

# Linux
./resources/node/linux-x64/bin/node --version

# Windows
.\resources\node\win-x64\node.exe --version
```

## Summary

| Approach | Status | Recommendation |
|----------|--------|----------------|
| Bundled Node.js | ✅ Working | **Use this** for production |
| Standalone Binary (pkg) | ⚠️ Experimental | May work for simple packages, not OpenClaw |
| System Node.js | ✅ Working | Fallback for development |

The bundled Node.js approach is the most reliable way to distribute OpenClaw Desktop without requiring users to have Node.js pre-installed.
