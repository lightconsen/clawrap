# Build Resources

This directory contains resources for the Electron build:

- `icon.icns` - macOS icon
- `icon.ico` - Windows icon
- `icon.png` - Linux icon (512x512 recommended)

## Icon Generation

To generate icons from a source image, you can use:

### macOS (icns)
```bash
# Create iconset
mkdir MyIcon.iconset
sips -z 16 16     icon.png --out MyIcon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out MyIcon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out MyIcon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out MyIcon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out MyIcon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out MyIcon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out MyIcon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out MyIcon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out MyIcon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out MyIcon.iconset/icon_512x512@2x.png

# Convert to icns
iconutil -c icns MyIcon.iconset -o icon.icns
rm -rf MyIcon.iconset
```

### Windows (ico)
Use an online converter or ImageMagick:
```bash
convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

Place the generated files in this directory before building.
