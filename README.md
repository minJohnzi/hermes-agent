<p align="center">
  <img src="assets/banner.png" alt="Hermes Agent" width="100%">
</p>

# Hermes Agent · 中文维护分支

基于 [NousResearch/Hermes Agent](https://github.com/NousResearch/hermes-agent) 的个人维护分支，在保留上游 Agent、CLI、Gateway 与桌面应用能力的基础上，扩展桌面定时任务通知和外观设置。

**本仓库由 minJohnzi 独立维护，非 Nous Research 官方发行版。** Hermes 原项目及其核心能力归功于 Nous Research 与上游贡献者。

[本分支特性](#本分支特性) · [源码启动](#源码启动) · [维护与验证记录](docs/FORK.md) · [English / upstream overview](README_EN.md) · [官方文档](https://hermes-agent.nousresearch.com/docs/)

## Hermes 能做什么

- 在 CLI、桌面应用和消息平台中使用同一个 Agent，调用工具、执行任务并保留会话。
- 使用记忆、技能和历史会话检索，积累可复用的工作方式。
- 通过 Gateway 连接消息平台，运行 Cron 定时任务。
- 配置不同模型提供商，以及本地或远程执行环境。

这些是继承自上游的能力；完整说明见 [上游英文概览](README_EN.md) 和 [上游中文译本](README.zh-CN.md)。

## 本分支特性

| 特性 | 行为 | 验证状态 |
| --- | --- | --- |
| Cron 桌面通知 | 观察任务运行状态变化，按通知设置显示提醒 | 已实现，自动测试通过；Windows 系统弹窗手工验收待完成 |
| 通知点击定位 | 恢复所属 Connection / Profile，打开 Cron 页面并定位任务 | 已补跨环境定位测试 |
| 通知生命周期 | 首次连接及重连建立基线，避免历史结果重放；按运行身份去重 | 已补边界测试 |
| 壁纸与外观 | 自定义背景及透明度设置，支持 JPG、PNG、WebP 导入 | 已实现；壁纸资产边界测试通过 |
| 壁纸资产管理 | 文件签名校验、16 MiB 上限、原子落盘、旧资产清理和显式清除 | 已实现；Windows 打包验证通过 |

功能加固基线：[`831f452cf9`](https://github.com/minJohnzi/hermes-agent/commit/831f452cf9)。上述验证不代表所有平台和全部 CI 均已通过，详细边界见 [维护说明](docs/FORK.md)。

### 关于定时任务提醒

桌面提醒依赖桌面应用运行、连接有效并观察到任务状态变化。Gateway 执行任务、`deliver = origin` 投送以及桌面通知是不同环节。

首次连接或重连不会补发旧结果。桌面退出、系统勿扰、通知权限和一次性任务消失等情况都可能影响提醒；请以 Cron 运行记录核对执行结果。通知点击定位不等于把完整报告主动发送到聊天窗口。

## 源码启动

要使用本分支特性，请明确克隆本仓库。官方一键安装脚本、官网安装包及上游 Releases 面向官方版本，不能保证包含本分支改动。

以下是独立源码开发环境。准备 Git、uv、Python 3.11，以及满足 [桌面 package.json](apps/desktop/package.json) 要求的 Node.js / npm；仓库 CI 使用 Node.js 26 和 npm 12。首次安装需要联网下载依赖。虚拟环境放在源码目录之外。

### Windows PowerShell

```powershell
git clone https://github.com/minJohnzi/hermes-agent.git
cd hermes-agent
uv venv ../hermes-fork-venv --python 3.11
uv pip install --python ../hermes-fork-venv/Scripts/python.exe -e ".[all,dev]"
../hermes-fork-venv/Scripts/hermes.exe setup
../hermes-fork-venv/Scripts/hermes.exe desktop
```

### Linux / macOS

```bash
git clone https://github.com/minJohnzi/hermes-agent.git
cd hermes-agent
uv venv ../hermes-fork-venv --python 3.11
uv pip install --python ../hermes-fork-venv/bin/python -e ".[all,dev]"
../hermes-fork-venv/bin/hermes setup
../hermes-fork-venv/bin/hermes desktop
```

仅使用终端时，将最后一条命令中的 `desktop` 去掉。这些步骤基于仓库入口与依赖声明整理，本次文档修改未执行全新机器安装验收。

### 桌面开发与打包

在已配置 Python 环境的仓库根目录执行：

```bash
npm ci
npm run dev --workspace apps/desktop
```

生成当前平台的未安装打包目录：

```bash
npm run pack --workspace apps/desktop
```

更多选项见 [桌面开发说明](apps/desktop/README.md)，其中的官方发布下载链接仍指向上游。

## 更新与维护

`origin` 指向个人 fork，`upstream` 指向官方仓库。同步上游后，需要复核分支特性并重新验证；代码推送、CI 通过和安装包发布分别记录。

更新前检查 `git status`；工作区干净且位于 `main` 时，可使用 `git pull --ff-only origin main`。之后按需重新安装依赖和构建桌面。使用内置更新功能前，也应核对实际安装来源。

Fork 运行器适配正在 [PR #1](https://github.com/minJohnzi/hermes-agent/pull/1) 验证，截至 2026-09-05 尚未合并，不作为已发布功能宣传。

## 文档与反馈

- [分支维护、功能边界与验证记录](docs/FORK.md)
- [Hermes Desktop 开发说明](apps/desktop/README.md)
- [代码贡献约定](AGENTS.md)
- [上游中文译本](README.zh-CN.md) · [上游英文概览](README_EN.md)
- [本仓库 Pull Requests](https://github.com/minJohnzi/hermes-agent/pulls)：提交改动时注明复现步骤、分支版本和测试结果。

本分支特有问题请先在本仓库确认；向上游反馈时，说明是否能在官方版本复现。

## 许可证与致谢

遵循仓库 [MIT License](LICENSE)，保留原有版权声明。感谢 [Nous Research](https://nousresearch.com) 与所有 Hermes Agent 贡献者。本分支维护工作不改变原项目归属，也不代表官方背书。
