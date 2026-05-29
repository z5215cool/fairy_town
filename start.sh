#!/bin/bash

# 启动前端 HTTP 服务器
cd /app/frontend
python -m http.server 8080 &
FRONTEND_PID=$!
echo "前端服务器已启动 (PID: $FRONTEND_PID)"

# 启动后端 Flask 服务器
cd /app/backend
python run.py &
BACKEND_PID=$!
echo "后端服务器已启动 (PID: $BACKEND_PID)"

# 等待任一进程退出
wait -n
echo "服务已停止"
exit 0
