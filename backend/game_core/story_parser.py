# game_core/story_parser.py
import json
from typing import List, Dict
from provider.deepseek import ask


def split_into_episodes(full_story: str, num_episodes: int = 5) -> List[str]:
    """将完整故事分成若干情节段落"""
    prompt = f"""
    将以下故事分成 {num_episodes} 段，每段是一个完整的小情节（1-3句话）。
    只返回段落列表，用 <SEP> 分隔。
    故事：{full_story}
    """
    resp = ask(prompt, use_json=False)  # 这里不用 JSON，因为要解析普通文本
    episodes = [e.strip() for e in resp.split("<SEP>") if e.strip()]
    # 如果分段失败，回退按句号简单分割
    if len(episodes) < 2:
        sentences = full_story.replace("。", "。\n").split("\n")
        chunk_size = max(1, len(sentences) // num_episodes)
        episodes = ['。'.join(sentences[i:i+chunk_size]) for i in range(0, len(sentences), chunk_size)]
    return episodes


def extract_locations_and_initial_positions(full_story: str) -> Dict:
    """
    返回格式：
    {
      "locations": ["小红帽家", "奶奶家", "森林"],
      "initial_positions": {"小红帽": "小红帽家", "奶奶": "奶奶家", "大灰狼": "森林"}
    }
    """
    prompt = f"""
    从以下故事中提取：
    1. 所有出现的地点名称（如“家”、“森林”、“奶奶家”、“路边”）；
    2. 每个主要角色在故事最开始时的位置。
    返回 JSON 格式，不要有其他内容。
    故事：{full_story}
    """
    resp = ask(prompt, use_json=True)
    try:
        data = json.loads(resp)
    except json.JSONDecodeError:
        # 回退：手动构造
        data = {"locations": [], "initial_positions": {}}
    return data


def generate_actions_for_episode(
    episode_text: str,
    current_positions: Dict[str, str],   # 角色名 -> 地点名
    all_locations: List[str],
    character_names: List[str]
) -> Dict:
    """
    调用大模型生成本段的动作序列（符合 PlotDirector 接受的 raw_actions 格式）
    返回示例：
    {
      "narrative": "小红帽走出家门...",
      "actions": [
        {"type": "move", "character": "小红帽", "target": "森林小路"},
        {"type": "speak", "character": "小红帽", "content": "今天天气真好！"}
      ]
    }
    """
    prompt = f"""
你是一个童话故事的导演。根据当前情节和角色位置，生成本段的故事演出。

【已知地点】{all_locations}
【当前角色位置】{current_positions}
【本段情节】{episode_text}

请生成：
1. 一段旁白（narrative）
2. 一系列动作（actions），每个动作包含 type（move/speak/emotion），
   - move 动作需要 character 和 target（必须是已知地点之一）
   - speak 动作需要 character 和 content
   - emotion 动作需要 character 和 emotion（可选：happy/sad/angry/surprised）

返回 JSON 格式：
{{
  "narrative": "...",
  "actions": [
    {{"type": "move", "character": "角色名", "target": "地点名"}},
    {{"type": "speak", "character": "角色名", "content": "台词"}}
  ]
}}

注意：所有角色移动必须符合故事逻辑，不要瞬间跳跃不相关的地点。
"""
    resp = ask(prompt, use_json=True)
    try:
        return json.loads(resp)
    except json.JSONDecodeError:
        # 返回空结构避免崩溃
        return {"narrative": episode_text, "actions": []}

