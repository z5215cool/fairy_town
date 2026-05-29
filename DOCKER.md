# 童话镇多智能体系统 - Docker 部署指南

## 快速开始

### 1. 构建并启动
```bash
docker-compose up -d
```

### 2. 访问服务
- 前端：http://localhost:8080
- 后端：http://localhost:5000

### 3. 查看日志
```bash
docker-compose logs -f
```

### 4. 停止服务
```bash
docker-compose down
```

## 单独构建

### 仅构建后端
```bash
docker build -t fairy-town-backend .
docker run -p 5000:5000 --env-file backend/config/.env fairy-town-backend
```

### 仅启动前端
```bash
docker run -p 8080:80 -v $(pwd)/frontend:/usr/share/nginx/html nginx:alpine
```

## 环境变量

在 `backend/config/.env` 中配置 API 密钥：
```env
QWEN_API_KEY=your-api-key
DEEPSEEK_API_KEY=your-api-key
DOUBAO_API_KEY=your-api-key
```

## 数据持久化

如需持久化数据，可添加 volume 映射：
```yaml
volumes:
  - ./data:/app/data
```
