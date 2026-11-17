# 游戏设计学习图谱

[打开学习网站](https://passwordis42.github.io/game-design-atlas/)

28 周 PC 游戏设计课程，包含交互知识图谱、逐周练习和验收、四个完整项目、八类玩法实验。每个项目都练习访谈、试玩和证据分析。AI 学习工坊以学习者自己的草案为起点，提供追问、证据检查和已授权规则的实现规格。游戏项目中的具体协作方法见 [AI 开发守则](AI-DEVELOPMENT.md)。

## 使用方式

GitHub Pages 从 `main` 分支的 `/docs` 目录提供静态课程。前端使用 HTML、CSS、SVG 和原生 JavaScript。在线版可浏览课程和记录进度。使用模型 API 时，按下面的步骤打开本地站点。

学习进度和草案保存在当前浏览器的站点存储中。GitHub Pages 与本地站点、不同浏览器和设备各自保存记录。可用页面底部的「导出学习记录」和「导入」迁移数据。

## 本地启动与 AI 服务

需要 **Node.js 22.9 或更新版本**。在仓库根目录运行以下命令，然后访问 [本地学习网站](http://127.0.0.1:4173/)。

```powershell
Copy-Item .env.example .env
npm start
```

课程浏览与学习记录可直接使用。要启用模型，打开 `.env` 并填写所选服务的密钥，然后重启本地站点。可同时配置多家，页面每次只调用你选择的一家。模型名称和 Qwen 地区配置见 [`.env.example`](.env.example)。

| 服务 | 密钥环境变量 |
| --- | --- |
| OpenAI | `OPENAI_API_KEY` |
| Claude | `ANTHROPIC_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| Qwen | `DASHSCOPE_API_KEY` |

API 密钥保存在本地 `.env`，该文件已加入 Git 忽略列表。点击提交时，提问和评审模式向所选服务发送课程信息、草案、理由和证据或假设。委托实现模式只发送课程信息和你逐条确认的规则原文。本地助手在处理请求后不保存其内容。提交前请去除玩家身份信息。

如果希望从公开网页连接本地助手，可在 `.env` 把 `TRUSTED_SITE_ORIGIN` 设为 `https://passwordis42.github.io`，重启后点击网页上的「连接本地助手」。浏览器若未开放本地访问，直接在本地地址使用全部功能。

## 复用到下一份学习计划

1. 复制 [`docs`](docs) 目录和本地服务。把课程写进 [`docs/data/curriculum.js`](docs/data/curriculum.js)。
2. `phases` 定义阶段，`weeks` 定义周次、知识点、练习、验收、证据提示和资料，`prerequisites` 以 `[先修周次, 后续周次]` 表示依赖。换课程时同步调整站点名称、学习进度标识、周次校验和图谱布局。
3. 发布前核对全部节点、资料地址、移动端布局和进度迁移。保持各项目的验收可观察，并要求学习者先记录自己的选择和依据。

## 前端设计参考

本项目独立实现了图谱和周计划界面。交互路线参考 [Roadmap.sh](https://github.com/nilbuild/developer-roadmap)，节点和边的交互参考 [AntV G6](https://github.com/antvis/G6)，目录与内容页结构参考 [VitePress](https://github.com/vuejs/vitepress)。
