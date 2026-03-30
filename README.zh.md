<p align="center">
  <img src="build/icon.png" alt="Clawrap Logo" width="120" height="120" style="float: left; margin-right: 20px;">
  <h1 style="display: inline-block; vertical-align: middle;">Clawrap</h1>
</p>

<p align="center">
  <a href="https://github.com/lightconsen/clawrap/actions/workflows/build.yml"><img src="https://github.com/lightconsen/clawrap/actions/workflows/build.yml/badge.svg" alt="构建状态"></a>
  <a href="https://github.com/lightconsen/clawrap/releases/latest"><img src="https://img.shields.io/github/v/release/lightconsen/clawrap" alt="最新版本"></a>
  <a href="https://github.com/lightconsen/clawrap/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="许可证"></a>
</p>

<p align="center">
  <strong>🌏 Read this in <a href="README.md">English</a></strong>
</p>

---

## 开启 OpenClaw 的最简单方式

Clawrap 是一款桌面应用程序，让 OpenClaw 的安装和使用变得简单无比。无需终端，无需配置文件，无需烦恼。

## 为什么选择 Clawrap？

OpenClaw 功能强大，但设置需要命令行知识。Clawrap 改变了这一点：

| 不使用 Clawrap | 使用 Clawrap |
|-----------------|--------------|
| 手动安装 Node.js | 按需引导设置 |
| 运行 `npm install -g openclaw` | 一键安装 |
| 编辑 YAML 配置文件 | 可视化设置面板 |
| 通过终端启动网关 | 启动时自动运行 |
| 手动配置模型 | 预配置模型，开箱即用 |

## 您将获得

- **一键安装 OpenClaw** - 应用程序为您完成所有安装
- **可视化设置向导** - 几分钟内配置好您的 AI 模型
- **自动启动网关** - 无需管理后台进程
- **跨平台支持** - 适用于 macOS、Windows 和 Linux
- **多模型支持** - Claude、GPT-4o、Gemini、DeepSeek、通义千问等

## 安装步骤

### 第一步：下载

从 [发布页面](https://github.com/lightconsen/clawrap/releases) 获取适用于您操作系统的安装程序。

- **macOS**: 下载 `.dmg` 文件
- **Windows**: 下载 `.exe` 安装程序
- **Linux**: 下载 `.AppImage` 或 `.deb` 文件

### 第二步：安装

- **macOS**: 打开 DMG 文件，将 Clawrap 拖到应用程序文件夹
- **Windows**: 运行安装程序并按照提示操作
- **Linux**: 将 AppImage 设为可执行并运行

### 第三步：首次运行

首次打开 Clawrap 时：

1. **等待安装** - 应用程序自动安装 OpenClaw（约 30 秒）
2. **选择 AI 模型** - 从流行模型中选择，如 Claude、GPT-4o 或 Gemini
3. **输入 API 密钥** - 从您的模型提供商处获取（应用程序内提供链接）
4. **开始使用** - 完成了！终端打开，即可开始使用

## 支持的 AI 模型

Clawrap 预配置了最受欢迎的 AI 提供商：

| 提供商 | 模型 | 获取 API 密钥 |
|----------|--------|-------------|
| Anthropic | Claude | [anthropic.com](https://www.anthropic.com) |
| OpenAI | GPT-4o, GPT-3.5 | [platform.openai.com](https://platform.openai.com) |
| Google | Gemini | [makersuite.google.com](https://makersuite.google.com) |
| DeepSeek | DeepSeek Coder | [platform.deepseek.com](https://platform.deepseek.com) |
| 阿里巴巴 | 通义千问 (Qwen) | [dashscope.aliyun.com](https://dashscope.aliyun.com) |
| 腾讯 | 混元 (Hunyuan) | [cloud.tencent.com](https://cloud.tencent.com) |
| 百度 | 文心一言 (ERNIE) | [cloud.baidu.com](https://cloud.baidu.com) |
| 字节跳动 | 豆包 (Doubao) | [www.volcengine.com](https://www.volcengine.com) |

如果您的提供商未列出，也可以添加自定义模型。

## 需要帮助？

- **安装指南**: 查看 [docs/install.md](docs/install.md)
- **故障排除**: 查看 [docs/troubleshooting.cn.md](docs/troubleshooting.cn.md)
- **OpenClaw 文档**: [docs.openclaw.ai](https://docs.openclaw.ai)

## 系统要求

- **Node.js 22 或更高版本**（如需要，应用程序将指导您完成安装）
- **操作系统**: macOS 10.13+、Windows 10+ 或任何现代 Linux 发行版
- **互联网连接**: 访问 AI 模型所需

---

*开发者须知：查看 [docs/](docs/) 了解开发设置、构建说明和技术文档。*

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)。
