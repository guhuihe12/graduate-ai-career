# OfferPilot 应届生 AI 求职助手

一个面向应届生的网站，包含两个功能：

- 优化简历内容：选择模板、填写个人信息、一句话生成简历经历、导出 Word 简历。
- 推荐公司官网：填写学校、专业、目标岗位、城市和技能，推荐具体公司官网并分析匹配度。

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 创建 `.env`

复制 `.env.example` 为 `.env`，然后填入你的模型配置。

```bash
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
API_PORT=8787
API_HOST=127.0.0.1
CORS_ORIGIN=http://127.0.0.1:5173,http://localhost:5173
VITE_API_BASE_URL=http://127.0.0.1:8787
```

3. 启动后端 API

```bash
npm run api
```

4. 另开一个终端启动前端

```bash
npm run dev
```

本地访问：

```text
http://127.0.0.1:5173/
```

## 让别人访问

不能直接把 `127.0.0.1` 发给别人。正式给别人用，需要部署前端和后端。

推荐方式：

- 前端：Vercel 或 Netlify
- 后端：Render、Railway、Fly.io 或自己的云服务器

### 前端环境变量

在前端部署平台填写：

```bash
VITE_API_BASE_URL=https://你的后端域名
```

例如：

```bash
VITE_API_BASE_URL=https://offerpilot-api.onrender.com
```

### 后端环境变量

在后端部署平台填写：

```bash
AI_API_KEY=你的模型密钥
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
API_HOST=0.0.0.0
CORS_ORIGIN=https://你的前端域名
```

如果后端平台自动提供 `PORT`，不用手动填 `API_PORT`。

例如：

```bash
CORS_ORIGIN=https://offerpilot.vercel.app
```

如果有多个前端域名，用逗号隔开：

```bash
CORS_ORIGIN=https://offerpilot.vercel.app,https://offerpilot.netlify.app
```

## 常用命令

```bash
npm run dev
npm run api
npm run build
npm run lint
```

