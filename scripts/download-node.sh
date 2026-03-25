#!/bin/bash

# Download Node.js binaries for bundling with Electron app
# This script downloads Node.js LTS for all platforms

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_DIR="$(dirname "$SCRIPT_DIR")/resources/node"

# Node.js LTS version
NODE_VERSION="22.11.0"

echo "Downloading Node.js ${NODE_VERSION} binaries..."
echo "Destination: ${NODE_DIR}"
echo ""

# Create directories
mkdir -p "${NODE_DIR}/darwin-arm64"
mkdir -p "${NODE_DIR}/darwin-x64"
mkdir -p "${NODE_DIR}/win-x64"
mkdir -p "${NODE_DIR}/linux-x64"

# Download function
download_node() {
    local platform=$1
    local arch=$2
    local dest_dir=$3
    local ext=$4

    local filename="node-v${NODE_VERSION}-${platform}-${arch}.${ext}"
    local url="https://nodejs.org/dist/v${NODE_VERSION}/${filename}"

    echo "Downloading ${platform}-${arch}..."

    cd "${dest_dir}"

    if command -v curl &> /dev/null; then
        curl -L -o "${filename}" "${url}"
    elif command -v wget &> /dev/null; then
        wget -O "${filename}" "${url}"
    else
        echo "Error: curl or wget required"
        exit 1
    fi

    # Extract
    if [ "${ext}" = "tar.gz" ]; then
        tar -xzf "${filename}" --strip-components=1
    else
        # Windows zip
        unzip -q "${filename}"
        mv "node-v${NODE_VERSION}-${platform}-${arch}"/* .
        rm -rf "node-v${NODE_VERSION}-${platform}-${arch}"
    fi

    # Clean up archive
    rm -f "${filename}"

    echo "  ✓ ${platform}-${arch} done"
}

# macOS ARM64 (Apple Silicon)
if [ ! -f "${NODE_DIR}/darwin-arm64/bin/node" ]; then
    download_node "darwin" "arm64" "${NODE_DIR}/darwin-arm64" "tar.gz"
else
    echo "  ✓ darwin-arm64 already exists"
fi

# macOS x64 (Intel)
if [ ! -f "${NODE_DIR}/darwin-x64/bin/node" ]; then
    download_node "darwin" "x64" "${NODE_DIR}/darwin-x64" "tar.gz"
else
    echo "  ✓ darwin-x64 already exists"
fi

# Windows x64
if [ ! -f "${NODE_DIR}/win-x64/node.exe" ]; then
    download_node "win" "x64" "${NODE_DIR}/win-x64" "zip"
else
    echo "  ✓ win-x64 already exists"
fi

# Linux x64
if [ ! -f "${NODE_DIR}/linux-x64/bin/node" ]; then
    download_node "linux" "x64" "${NODE_DIR}/linux-x64" "tar.gz"
else
    echo "  ✓ linux-x64 already exists"
fi

echo ""
echo "Node.js binaries downloaded successfully!"
echo ""
echo "Total sizes:"
du -sh "${NODE_DIR}"/* 2>/dev/null || true
