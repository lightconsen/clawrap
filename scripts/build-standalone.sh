#!/bin/bash

# Build OpenClaw as a standalone binary using pkg
# WARNING: This is experimental. OpenClaw has complex dependencies that may not bundle cleanly with pkg.
# Recommended approach: Use bundled Node.js instead (npm run download-node)
#
# Known issues:
# - Native modules (sharp, sqlite3) require platform-specific binaries
# - Dynamic requires may fail at runtime
# - ESM modules with import.meta cause parse errors

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/../build/standalone"
OUTPUT_DIR="${SCRIPT_DIR}/../resources/bin"

echo "=============================================="
echo "Building OpenClaw standalone binary (pkg)"
echo "WARNING: Experimental - may not work with"
echo "         complex npm packages like OpenClaw"
echo "=============================================="
echo ""
echo "Recommended alternative: npm run download-node"
echo ""

# Clean and create directories
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"
mkdir -p "${OUTPUT_DIR}"

# Create package structure
cd "${BUILD_DIR}"

# Initialize package
cat > package.json << 'EOF'
{
  "name": "openclaw-standalone",
  "version": "2026.3.24",
  "description": "OpenClaw standalone binary",
  "main": "index.js",
  "bin": "index.js",
  "pkg": {
    "scripts": [
      "node_modules/openclaw/**/*.js",
      "node_modules/openclaw/**/*.mjs"
    ],
    "assets": [
      "node_modules/openclaw/**/*",
      "node_modules/@openclaw/**/*"
    ],
    "targets": [
      "node18-linux-x64",
      "node18-macos-x64",
      "node18-macos-arm64",
      "node18-win-x64"
    ],
    "outputPath": "binaries"
  }
}
EOF

# Create entry point
cat > index.js << 'EOF'
#!/usr/bin/env node

// OpenClaw standalone entry point
const path = require('path');
const fs = require('fs');

// Set up environment for standalone
process.env.OPENCLAW_STANDALONE = 'true';

// Find the actual openclaw module
const openclawPath = require.resolve('openclaw');

// Require and run openclaw
require('openclaw');
EOF

# Install dependencies
echo "Installing OpenClaw..."
npm install openclaw@latest

# Install pkg if not available
if ! command -v pkg &> /dev/null; then
    echo "Installing pkg..."
    npm install -g pkg
fi

# Build binaries
echo "Building binaries for all platforms..."
echo "Note: This may produce warnings for complex dependencies"
echo ""

# Try to build - continue on error to handle partial success
set +e
pkg . --compress GZip 2>&1
PKG_EXIT=$?
set -e

if [ $PKG_EXIT -ne 0 ]; then
    echo ""
    echo "=============================================="
    echo "pkg build failed or had errors"
    echo "=============================================="
    echo ""
    echo "This is expected for complex packages like OpenClaw."
    echo ""
    echo "Recommended alternative:"
    echo "  npm run download-node    # Download bundled Node.js"
    echo "  npm run build            # Build Electron app"
    echo ""
    echo "The bundled Node.js approach is more reliable."
    echo ""
    exit 1
fi

# Check if binaries were created
if [ ! -d "binaries" ] || [ -z "$(ls -A binaries 2>/dev/null)" ]; then
    echo ""
    echo "=============================================="
    echo "No binaries were created"
    echo "=============================================="
    echo ""
    echo "The pkg build did not produce any output binaries."
    echo "This may be due to bundling issues with OpenClaw's dependencies."
    echo ""
    echo "Recommended alternative:"
    echo "  npm run download-node    # Download bundled Node.js"
    echo "  npm run build            # Build Electron app"
    echo ""
    exit 1
fi

# Rename binaries with platform suffixes
cd binaries

for file in *; do
    case "$file" in
        *linux*)
            mv "$file" "openclaw-linux-x64"
            ;;
        *macos*)
            if [[ "$file" == *arm64* ]] || [[ "$file" == *aarch64* ]]; then
                mv "$file" "openclaw-darwin-arm64"
            else
                mv "$file" "openclaw-darwin-x64"
            fi
            ;;
        *win*)
            mv "$file" "openclaw-win-x64.exe"
            ;;
    esac
done

# Copy to resources/bin
cp -r . "${OUTPUT_DIR}"

echo ""
echo "========================================"
echo "Build complete! Binaries:"
echo ""
ls -lh "${OUTPUT_DIR}"
echo ""
echo "These binaries can be used without Node.js installed!"
echo "They include the Node.js runtime + OpenClaw bundled together."
