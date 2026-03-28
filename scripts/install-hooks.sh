#!/bin/bash
# Install git hooks for clawrap
# This script copies hooks from .git-hooks to .git/hooks

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_SRC="$SCRIPT_DIR/.git-hooks"
HOOKS_DEST="$SCRIPT_DIR/.git/hooks"

if [ ! -d "$HOOKS_SRC" ]; then
    echo "Error: .git-hooks directory not found"
    exit 1
fi

# Create .git/hooks if it doesn't exist
mkdir -p "$HOOKS_DEST"

# Copy and make executable
cp "$HOOKS_SRC/post-merge" "$HOOKS_DEST/post-merge"
chmod +x "$HOOKS_DEST/post-merge"

echo "Git hooks installed successfully!"
echo "  - post-merge: Ensures package.json version is bumped on main branch merges"
