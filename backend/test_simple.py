import requests
import json

# 请替换为你的真实 API Key
API_KEY = "sk-smZ1ZDsOqBAYcM2YG_vbNw"
BASE_URL = "https://xplt.sdu.edu.cn:4000/v1"  # 注意末尾的 /v1

url = f"{BASE_URL}/chat/completions"
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}
payload = {
    "model": "SDU-AI/DeepSeek-V4-Flash",  # 使用你 .env 中的模型名
    "messages": [{"role": "user", "content": "请简单回复：你好"}],
    "max_tokens": 50
}

print(f"正在请求: {url}")
try:
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    print(f"状态码: {response.status_code}")
    print(f"响应内容: {response.text}")
except Exception as e:
    print(f"请求失败: {e}")