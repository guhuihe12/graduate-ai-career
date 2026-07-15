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

3. 启动本地 API

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

## 腾讯云 EdgeOne Pages 部署

这个项目已经支持 EdgeOne Pages Functions，不需要单独部署后端服务器。

EdgeOne Pages 会把这些接口部署成云函数：

```text
/api/health
/api/polish-resume-line
/api/recommend-jobs
```

### 在 EdgeOne Pages 填环境变量

只需要填模型相关变量：

```bash
AI_API_KEY=你的模型密钥
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
```

如果你用其他 OpenAI 兼容模型，就换成对应的 `AI_BASE_URL` 和 `AI_MODEL`。

上线到 EdgeOne Pages 时，`VITE_API_BASE_URL` 可以不填。前端会自动调用同一个域名下的 `/api`。

### EdgeOne Pages 构建配置

从 GitHub 导入仓库后，确认配置如下：

```bash
Framework: Vite
Build Command: npm run build
Output Directory: dist
Root Directory: ./
```

部署成功后，别人打开 EdgeOne Pages 给你的网址就可以使用网站。

### API 测试

部署完成后打开：

```text
https://你的域名/api/health
```

如果看到类似内容，说明云函数和环境变量正常：

```json
{"ok":true,"model":"deepseek-chat"}
```

## Vercel 部署

项目也保留了 Vercel Functions 入口。如果你要部署到 Vercel，同样只需要填：

```bash
AI_API_KEY=你的模型密钥
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
```

## 常用命令

```bash
npm run dev
npm run api
npm run build
npm run lint
```
