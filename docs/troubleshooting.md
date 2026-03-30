# Troubleshooting

Common issues and solutions.

## Installation Issues

### OpenClaw Fails to Install Automatically

**Symptoms**: The app shows an error during the installation step.

**Solutions**:

1. **Verify Node.js installation**

```bash
node --version
```

Should show v22 or higher. If not, install from [nodejs.org](https://nodejs.org).

2. **Try manual installation**

```bash
npm install -g openclaw@latest
```

3. **Check npm permissions (macOS/Linux)**

If you see permission errors:

```bash
sudo npm install -g openclaw@latest
```

4. **Restart the app**

After manual installation, quit and reopen Clawrap.

---

## Gateway Issues

### Gateway Won't Start

**Symptoms**: The app hangs on "Starting gateway..." or shows an error.

**Solutions**:

1. **Check if port 18789 is available**

```bash
lsof -i :18789
```

If another process is using it, quit that process or change the port in settings.

2. **Run OpenClaw doctor**

```bash
openclaw doctor
```

This diagnoses common OpenClaw issues.

3. **Check the logs**

In Clawrap: View → Toggle Developer Tools

Look for errors in the Console tab.

---

## Model Issues

### API Key Not Working

**Symptoms**: You enter an API key but get authentication errors.

**Solutions**:

1. **Verify the API key is correct** - Check for extra spaces or missing characters

2. **Check your account balance** - Some providers require prepayment

3. **Verify the model is enabled** - Some models need to be explicitly enabled in the provider's dashboard

4. **Try a different model** - Isolate whether it's a key or model issue

---

## Build Issues (Developers)

### TypeScript Errors During Build

**Symptoms**: `pnpm run build` fails with TypeScript errors.

**Solutions**:

1. **Clean and rebuild**

```bash
pnpm run clean
pnpm install
pnpm run build
```

2. **Check Node.js version**

```bash
node --version
```

Should be v22 or higher.

3. **Clear npm cache**

```bash
npm cache clean --force
```

---

## macOS-Specific Issues

### "App can't be opened" Error

**Solution**: Right-click (or Control-click) the app and select "Open" instead of double-clicking.

### Gatekeeper Blocking the App

**Solution**: Go to System Preferences → Security & Privacy → General, and click "Allow" next to the blocked app message.

---

## Windows-Specific Issues

### SmartScreen Warning

**Solution**: Click "More info" then "Run anyway" to proceed with installation.

---

## Linux-Specific Issues

### AppImage Won't Run

**Solution**: Make the file executable:

```bash
chmod +x Clawrap-*.AppImage
./Clawrap-*.AppImage
```

### Missing Dependencies (DEB/RPM)

**Solution**: Install required libraries:

```bash
# Debian/Ubuntu
sudo apt-get install -y libgtk-3-0 libnss3 libxss1

# RHEL/Fedora
sudo dnf install -y gtk3 nss libXScrnSaver
```

---

## Getting More Help

If your issue isn't listed here:

1. **Check OpenClaw documentation**: [docs.openclaw.ai](https://docs.openclaw.ai)
2. **Report an issue**: [GitHub Issues](https://github.com/lightconsen/clawrap/issues)
3. **Include in your report**:
   - Operating system and version
   - Clawrap version
   - Steps to reproduce
   - Error messages or screenshots
