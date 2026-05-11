# 小医陪 - 老人就诊陪伴微信小程序

## 项目简介

**小医陪**是一款面向老年人及其子女的健康管理微信小程序，基于微信云开发（CloudBase）构建。核心场景是：老人去医院就诊时录音，系统通过语音转写 + AI 生成就诊摘要（诊断、用药、复诊建议等），子女端可实时查看就诊报告，实现子女远程关怀老人健康。

## 核心功能

### 双角色设计

- **子女端**：查看家中老人列表、浏览就诊记录（未读红点提醒）、查看报告详情、手动添加就诊记录
- **老人端**：查看今日用药/复诊提醒、录音记录就诊、查看历史就诊记录、语音播报就诊摘要、推送设置

### 核心链路

```
录音完成 → 上传云存储 → uploadAudio(创建记录) → callXunfei(语音转写) → callClaude(AI摘要) → 子女端查看
```

## 项目架构

```
xiaoyiban/
├── miniprogram/              # 小程序前端
│   ├── app.js                # 全局初始化、登录状态管理
│   ├── app.json              # 页面路由、自定义 tabBar 配置
│   ├── custom-tab-bar/       # 自定义底部导航栏（按角色显示不同 Tab）
│   └── pages/
│       ├── login/            # 登录页（微信一键登录 + 手机号登录，角色选择）
│       ├── home/             # 子女端首页（老人列表 + 未读数红点）
│       ├── list/             # 子女端就诊记录列表（按老人筛选、未读标记）
│       ├── child/
│       │   ├── detail/       # 子女端就诊详情（自动标记已读、显示报告摘要）
│       │   └── add/          # 子女端手动添加就诊记录
│       ├── index/            # 老人端首页「今日提醒」（用药/复诊提醒、健康贴士）
│       ├── record/           # 老人端录音页（录音→上传→全链路云函数调用）
│       ├── history/          # 老人端历史就诊记录
│       ├── detail/           # 老人端就诊详情（语音播报功能）
│       └── settings/         # 老人端设置（推送开关、绑定设备）
├── cloudfunctions/           # 云函数
│   ├── login/                # 用户登录，获取 openid，创建/查找用户及家庭记录
│   ├── uploadAudio/          # 创建就诊记录（录音上传后调用）
│   ├── callXunfei/           # 语音转写（模拟讯飞服务，回填转写文本）
│   ├── callClaude/           # AI 生成就诊摘要（模拟大模型，生成诊断/用药/医嘱）
│   ├── sendNotify/           # 就诊报告生成后推送微信订阅消息通知子女
│   ├── quickstartFunctions/  # 云开发模板自带工具函数集
│   └── markRead/             # 标记已读（目录存在但未实现，前端直接操作数据库）
├── cloudbaserc.json          # CloudBase 配置
├── project.config.json       # 小程序项目配置
└── package.json              # 项目依赖
```

## 自定义 TabBar

通过自定义 TabBar 实现按角色切换导航：

| 角色 | Tab 列表 |
|------|---------|
| 子女端 | 首页 \| 就诊记录 |
| 老人端 | 今日提醒 \| 录音 \| 历史记录 \| 设置 |

## 数据库集合

| 集合名 | 用途 |
|--------|------|
| `users` | 用户表（openid、familyId） |
| `families` | 家庭表 |
| `elders` | 老人信息表（姓名、年龄、病史、过敏史） |
| `records` | 就诊记录表（核心，包含转写文本、AI 摘要、诊断、用药等） |
| `reminders` | 提醒表（用药/复诊提醒） |
| `family_bindings` | 家庭绑定关系表 |
| `system_config` | 系统配置（通知模板 ID 等） |
| `notify_logs` | 通知发送日志 |
| `reports` | 报告表 |
| `sales` | quickstartFunctions 示例集合 |

## 云函数说明

| 云函数 | 功能 | 涉及集合 |
|--------|------|---------|
| `login` | 获取 openid，查找或创建用户及家庭记录 | `users`, `families` |
| `uploadAudio` | 接收音频 fileID，创建就诊记录 | `records` |
| `callXunfei` | 语音转写，回填 transcript 和 duration | `records` |
| `callClaude` | AI 生成就诊摘要（诊断/用药/复诊/医嘱） | `elders`, `records` |
| `sendNotify` | 推送微信订阅消息通知子女 | `reports`, `family_bindings`, `system_config`, `notify_logs` |
| `quickstartFunctions` | 模板自带工具函数 | `sales` |

## 登录与状态管理

- 登录时选择角色（elder/child），调用 `login` 云函数获取 openid 和 familyId
- 全局状态保存在 `app.globalData`（`isLoggedIn`, `openid`, `familyId`, `elderId`, `role`）
- 同步持久化到 `wx.Storage`
- 小程序启动时 `onLaunch` 自动从缓存恢复登录态

## 开发状态说明

- 语音转写（callXunfei）和 AI 摘要（callClaude）**目前使用模拟数据**，可在 `system_config` 集合配置真实密钥后接入讯飞 WebSocket API 和大模型 API
- `markRead` 云函数未实现，标记已读功能由前端直接操作数据库完成
- `sendNotify` 通知推送已实现完整逻辑，需在小程序后台配置订阅消息模板
- 绑定子女设备功能（settings 页面）尚未上线

## 本地开发

1. 使用微信开发者工具打开项目根目录
2. 确认 `project.config.json` 中 `appid` 已配置
3. 在云开发控制台创建上述数据库集合
4. 部署云函数后即可调试

## 参考文档

- [微信小程序云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [腾讯云开发 CloudBase](https://tcb.cloud.tencent.com/)
