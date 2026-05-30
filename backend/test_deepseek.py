# test_deepseek.py
from provider.deepseek import ask
import traceback

if __name__ == "__main__":
    try:
        print("开始测试 ask 函数...")
        resp = ask("请回复：你好", use_json=False)
        print("成功返回:", resp)
    except Exception as e:
        print("发生异常:")
        traceback.print_exc()