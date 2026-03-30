# 安装指南

本指南涵盖终端用户和开发者的安装说明。

## 终端用户

### 快速安装

1. 从 [发布页面](https://github.com/lightconsen/clawrap/releases) 下载安装程序
2. 运行适用于您平台的安装程序
3. 打开 Clawrap 并按照设置向导操作

### 系统要求

- **Node.js 22+**（推荐 Node 24）
- **npm**（随 Node.js 一起安装）
- **操作系统**: macOS 10.13+、Windows 10+ 或 Linux

### 验证 Node.js 安装

安装 Clawrap 之前，验证 Node.js 已安装：

```bash
node --version
```

如果看到 `v22.x.x` 或更高版本，则已就绪。否则，请从 [nodejs.org](https://nodejs.org) 安装 Node.js。

---

## 开发者

### 前置要求

- Node.js 22+
- pnpm 9+
- Git

### 设置

1. **克隆仓库**

```bash
git clone https://github.com/lightconsen/clawrap.git
cd clawrap
```

2. **安装依赖**

```bash
pnpm install
```

3. **以开发模式运行**

```bash
pnpm run dev
```

首次运行时，应用程序将：
- 检查是否已全局安装 OpenClaw
- 如未找到则安装 OpenClaw
- 显示首次运行设置向导
- 启动 OpenClaw 网关
- 打开终端窗口

---

## 生产构建

### 构建所有平台

```bash
pnpm run build
```

### 构建特定平台

```bash
pnpm run build:mac     # macOS (DMG + ZIP)
pnpm run build:win     # Windows (NSIS 安装程序 + 便携版)
pnpm run build:linux   # Linux (AppImage + DEB + RPM)
```

构建产物出现在 `release/` 目录中。

---

## 项目结构

```
clawrap/
├── src/
│   ├── main/              # Electron 主进程
│   │   └── index.ts       # 主入口，网关管理
│   ├── preload/           # IPC 预加载脚本
│   │   └── index.ts       # 向渲染器暴露 API
│   ├── renderer/          # React UI 组件
│   │   ├── components/    # 视图（安装、设置、终端、设置）
│   │   ├── store/         # 应用状态管理
│   │   ├── lib/           # 工具函数
│   │   └── assets/        # 静态资源
│   └── shared/            # 共享类型和接口
├── resources/
│   └── default-config.yaml # 默认 OpenClaw 配置
├── scripts/               # 构建和工具脚本
├── .github/workflows/     # CI/CD 配置
├── package.json
├── tsconfig.json
└── electron-builder.json
```

---

## 开发脚本

| 命令 | 描述 |
|---------|-------------|
| `pnpm run dev` | 以开发模式运行 |
| `pnpm run build` | 构建所有平台 |
| `pnpm run build:mac` | 构建 macOS |
| `pnpm run build:win` | 构建 Windows |
| `pnpm run build:linux` | 构建 Linux |
| `pnpm run clean` | 清除构建产物 |

---

## 架构

### 主进程

Electron 主进程 (`src/main/index.ts`) 管理：
- OpenClaw 网关子进程生命周期
- 配置文件 I/O
- OAuth 认证流程
- 用于渲染器通信的 IPC 处理器

### 渲染器进程

基于 React 的 UI (`src/renderer/`) 提供：
- 安装视图（检查和安装 OpenClaw）
- 设置向导（模型和 API 密钥配置）
- 终端视图（嵌入式 OpenClaw Web 终端）
- 设置视图（模型管理、技能、工具）

### 预加载脚本

预加载层 (`src/preload/index.ts`) 通过 `contextBridge` 向渲染器暴露安全的 API。

---

## 添加新模型

编辑 `src/shared/types.ts` 添加预设模型：

```typescript
export const PRESET_MODELS: ModelConfig[] = [
  // 在这里添加您的模型
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

GitHub Actions 自动：
- 在 MAJOR 或 MINOR 版本 bump 时构建安装程序
- 在 PATCH 或 BUILD 版本 bump 时运行构建测试
- 创建包含所有安装程序的 GitHub 发布

配置见 `.github/workflows/build.yml`。
