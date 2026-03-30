# 故障排除

**语言 / Language**: [English](troubleshooting.md) | [中文](#故障排除)

常见问题及解决方案。

## 安装问题

### OpenClaw 无法自动安装

**症状**: 应用程序在安装步骤显示错误。

**解决方案**:

1. **验证 Node.js 安装**

```bash
node --version
```

应显示 v22 或更高版本。否则，请从 [nodejs.org](https://nodejs.org) 安装。

2. **尝试手动安装**

```bash
npm install -g openclaw@latest
```

3. **检查 npm 权限（macOS/Linux）**

如果出现权限错误：

```bash
sudo npm install -g openclaw@latest
```

4. **重启应用程序**

手动安装后，退出并重新打开 Clawrap。

---

## 网关问题

### 网关无法启动

**症状**: 应用程序卡在"正在启动网关..."或显示错误。

**解决方案**:

1. **检查端口 18789 是否可用**

```bash
lsof -i :18789
```

如果有其他进程正在使用，请退出该进程或在设置中更改端口。

2. **运行 OpenClaw doctor**

```bash
openclaw doctor
```

这会诊断常见的 OpenClaw 问题。

3. **检查日志**

在 Clawrap 中：查看 → 切换开发者工具

在控制台标签中查找错误。

---

## 模型问题

### API 密钥不起作用

**症状**: 输入 API 密钥后出现认证错误。

**解决方案**:

1. **验证 API 密钥是否正确** - 检查是否有空格或缺失字符

2. **检查账户余额** - 某些提供商需要预付款

3. **验证模型已启用** - 某些模型需要在提供商控制面板中明确启用

4. **尝试不同的模型** - 确定是密钥问题还是模型问题

---

## 构建问题（开发者）

### 构建期间出现 TypeScript 错误

**症状**: `pnpm run build` 失败并显示 TypeScript 错误。

**解决方案**:

1. **清理并重新构建**

```bash
pnpm run clean
pnpm install
pnpm run build
```

2. **检查 Node.js 版本**

```bash
node --version
```

应为 v22 或更高版本。

3. **清除 npm 缓存**

```bash
npm cache clean --force
```

---

## macOS 特定问题

### "无法打开应用程序"错误

**解决方案**: 右键（或按住 Control 点击）应用程序并选择"打开"，而不是双击。

### Gatekeeper 阻止应用程序

**解决方案**: 前往系统偏好设置 → 安全性与隐私 → 通用，在已阻止的应用程序消息旁点击"允许"。

---

## Windows 特定问题

### SmartScreen 警告

**解决方案**: 点击"更多信息"，然后选择"仍要运行"以继续安装。

---

## Linux 特定问题

### AppImage 无法运行

**解决方案**: 将文件设为可执行：

```bash
chmod +x Clawrap-*.AppImage
./Clawrap-*.AppImage
```

### 缺少依赖（DEB/RPM）

**解决方案**: 安装所需的库：

```bash
# Debian/Ubuntu
sudo apt-get install -y libgtk-3-0 libnss3 libxss1

# RHEL/Fedora
sudo dnf install -y gtk3 nss libXScrnSaver
```

---

## 获取更多帮助

如果这里没有列出您的问题：

1. **查看 OpenClaw 文档**: [docs.openclaw.ai](https://docs.openclaw.ai)
2. **报告问题**: [GitHub Issues](https://github.com/lightconsen/clawrap/issues)
3. **在报告中包含**:
   - 操作系统和版本
   - Clawrap 版本
   - 重现步骤
   - 错误消息或截图
