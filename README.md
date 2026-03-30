# Clawrap

**The easiest way to get started with OpenClaw**

Clawrap is a desktop application that makes OpenClaw simple to install and use. No terminal, no configuration files, no hassle.

## Why Clawrap?

OpenClaw is powerful but requires command-line knowledge to set up. Clawrap changes that:

| Without Clawrap | With Clawrap |
|-----------------|--------------|
| Install Node.js manually | Guided setup if needed |
| Run `npm install -g openclaw` | One-click installation |
| Edit YAML config files | Visual settings panel |
| Start gateway via terminal | Auto-starts on launch |
| Configure models manually | Pre-configured models ready to use |

## What You Get

- **One-click OpenClaw installation** - The app installs everything for you
- **Visual setup wizard** - Configure your AI model in minutes
- **Auto-starting gateway** - No need to manage background processes
- **Cross-platform** - Works on macOS, Windows, and Linux
- **Multi-model support** - Claude, GPT-4o, Gemini, DeepSeek, Qwen, and more

## Installation

### Step 1: Download

Get the installer for your operating system from the [Releases page](https://github.com/lightconsen/clawrap/releases).

- **macOS**: Download the `.dmg` file
- **Windows**: Download the `.exe` installer
- **Linux**: Download the `.AppImage` or `.deb` file

### Step 2: Install

- **macOS**: Open the DMG and drag Clawrap to Applications
- **Windows**: Run the installer and follow the prompts
- **Linux**: Make the AppImage executable and run it

### Step 3: First Run

When you open Clawrap for the first time:

1. **Wait for installation** - The app automatically installs OpenClaw (takes ~30 seconds)
2. **Choose your AI model** - Select from popular models like Claude, GPT-4o, or Gemini
3. **Enter your API key** - Get one from your model provider (links provided in the app)
4. **Start chatting** - That's it! The terminal opens and you're ready to go

## Supported AI Models

Clawrap comes pre-configured with the most popular AI providers:

| Provider | Models | Get API Key |
|----------|--------|-------------|
| Anthropic | Claude | [anthropic.com](https://www.anthropic.com) |
| OpenAI | GPT-4o, GPT-3.5 | [platform.openai.com](https://platform.openai.com) |
| Google | Gemini | [makersuite.google.com](https://makersuite.google.com) |
| DeepSeek | DeepSeek Coder | [platform.deepseek.com](https://platform.deepseek.com) |
| Alibaba | Qwen | [dashscope.aliyun.com](https://dashscope.aliyun.com) |
| Tencent | Hunyuan | [cloud.tencent.com](https://cloud.tencent.com) |
| Baidu | ERNIE | [cloud.baidu.com](https://cloud.baidu.com) |
| ByteDance | Doubao | [www.volcengine.com](https://www.volcengine.com) |

You can also add custom models if your provider isn't listed.

## Need Help?

- **Installation guide**: See [docs/install.md](docs/install.md)
- **Troubleshooting**: See [docs/troubleshooting.md](docs/troubleshooting.md)
- **OpenClaw docs**: [docs.openclaw.ai](https://docs.openclaw.ai)

## System Requirements

- **Node.js 22 or higher** (the app will guide you through installation if needed)
- **Operating System**: macOS 10.13+, Windows 10+, or any modern Linux distribution
- **Internet connection**: Required for AI model access

---

*For developers: See [docs/](docs/) for development setup, build instructions, and technical documentation.*
