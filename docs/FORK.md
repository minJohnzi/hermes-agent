# Fork 维护与验证记录

本文件记录 `minJohnzi/hermes-agent` 的维护范围。入口见 [中文 README](../README.md)。状态快照日期：2026-09-05。

## 来源与版本

| 项目 | 记录 |
| --- | --- |
| 上游 | [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) |
| 已核对的上游基线 | `f58fcc8118d9`，不是对“官方最新版本”的永久声明 |
| 通知与壁纸加固 | `831f452cf9`，已进入个人分支 main |
| CI 适配 | [PR #1](https://github.com/minJohnzi/hermes-agent/pull/1)，尚未合并；提交 `175e9932a9`、`08b9f6cb3b` |

## 桌面特性与边界

### Cron 通知

桌面端根据任务状态快照观察运行变化。通知身份包含连接、Profile、任务 ID 和运行时间；点击后恢复所属连接与 Profile，再打开 Cron 页面定位任务。

首次连接及重连后的首份刷新快照只建立基线，不重放历史结果。该机制需要运行中的桌面观察端，不能保证桌面关闭时投送；一次性任务从列表消失也可能使快照观察错过事件。`deliver = origin` 的 Gateway 投送语义不因此改变。

源码：[通知桥接](../apps/desktop/src/components/cron-notification-bridge.tsx)、[点击目标](../apps/desktop/src/app/cron/notification-target.ts)。

### 壁纸资产

导入使用文件签名校验，接受 JPG、PNG、WebP，大小不超过 16 MiB。图片先写入临时文件，再原子改名；成功后清理旧托管资产。提供显式清除接口，导入失败保留原设置。文件签名校验不等于完整图像解码或安全扫描。

源码：[壁纸文件管理](../apps/desktop/electron/wallpaper-files.ts)。

## 已有验证证据

以下为 `831f452cf9` 功能修复时的本地验证记录，不是 PR #1 的云端 CI 结果。

| 验证 | 记录 |
| --- | --- |
| 桌面定向测试 | 6 个测试文件，66 项通过 |
| 后端 Profile 相关测试 | 1 项通过 |
| 桌面 TypeScript 检查 | 通过 |
| 修改文件 lint | 通过；之后自动格式工作流仍产生格式调整 |
| Windows unpacked pack | 通过，不等同于签名安装包发布 |
| Windows 系统通知中心、点击与勿扰手工验收 | 待完成 |

关联测试：[通知桥接](../apps/desktop/src/components/cron-notification-bridge.test.tsx)、[通知目标](../apps/desktop/src/app/cron/notification-target.test.ts)、[壁纸文件](../apps/desktop/electron/wallpaper-files.test.ts)。

## GitHub 自动化修复记录

1. 自动格式工作流在创建 PR 时失败，日志明确提示 Actions 不允许创建或批准 PR。
2. 经维护者批准，开启 Actions 创建和批准 PR 的设置，默认工作流权限仍保持 `read`；已创建 PR #1。
3. 开启仓库 `allow_auto_merge`。仓库设置开启不代表 PR 已启用自动合并或已经合并。
4. PR 工作流曾处于 `action_required`，经批准启动。
5. JS/TS 和 Nix 任务等待官方的大型运行器；PR #1 加入 fork 的 `ubuntu-latest` 回退，并确认这两类任务获得运行器。
6. 全量 CI 随后暴露 Python、Rust、Windows 同类配置，`08b9f6cb3b` 扩展标准运行器回退。完整 CI 仍待验证，不能标记为通过。

`trusted-automation` 是工作流使用的 Environment 名称，其 Deployments 记录不表示桌面程序已经部署到用户电脑。

## 同步上游的原则

- 核对远端与工作区状态，在独立分支审阅上游变更，保留原作者和许可证。
- 合并冲突后重点复核通知生命周期、Profile 归属和壁纸接口。
- 特性实现、自动测试、平台手工验收和发布状态分别记录。
- 默认 README 维护本分支信息；`README_EN.md` 保留上游英文概览，其他语言文件保留为上游参考。同步 README 时人工整合，不直接覆盖本分支首页。
- 新特性在 README 给出入口，详细设计与验证写入仓库文档，避免公开读者依赖维护者的本地知识库。
