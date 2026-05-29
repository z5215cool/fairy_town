# 童话镇多智能体系统 - Dockerfile

FROM python:3.10-slim

WORKDIR /app

# 安装依赖
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ ./backend/

# 复制前端代码
COPY frontend/ ./frontend/

# 复制启动脚本
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# 暴露端口
EXPOSE 5000 8080

# 启动命令
CMD ["/app/start.sh"]
