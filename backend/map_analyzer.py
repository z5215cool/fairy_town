"""
童话镇多智能体系统 - 地图分析器

职责：
- 使用AI分析故事文本，提取地点信息
- 为每个地点分配合理的坐标位置
- 生成结构化的地图数据（地点名称、坐标、描述等）
"""

import json
import re
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class MapAnalyzer:
    """
    地图分析器：使用AI分析故事并生成地图地点信息
    """
    
    def __init__(self, ai_provider=None):
        """
        初始化地图分析器
        
        参数：
        - ai_provider: AI服务提供者（DeepSeek/Qwen/Doubao）
        """
        self.ai_provider = ai_provider
        
        # 预设的场景布局模板（基于不同场景类型）
        self.scene_layouts = {
            '森林': {
                'default_positions': [
                    {'zone': '入口', 'x': 10, 'y': 50},
                    {'zone': '深处', 'x': 90, 'y': 50},
                    {'zone': '小溪', 'x': 50, 'y': 30},
                    {'zone': '空地', 'x': 50, 'y': 70},
                    {'zone': '山洞', 'x': 80, 'y': 20},
                    {'zone': '树屋', 'x': 20, 'y': 30},
                ],
                'center_zone': '空地',
                'entry_zone': '入口'
            },
            '村庄': {
                'default_positions': [
                    {'zone': '村口', 'x': 10, 'y': 50},
                    {'zone': '广场', 'x': 50, 'y': 50},
                    {'zone': '教堂', 'x': 70, 'y': 30},
                    {'zone': '酒馆', 'x': 30, 'y': 70},
                    {'zone': '铁匠铺', 'x': 80, 'y': 70},
                    {'zone': '村长家', 'x': 60, 'y': 60},
                ],
                'center_zone': '广场',
                'entry_zone': '村口'
            },
            '城堡': {
                'default_positions': [
                    {'zone': '大门', 'x': 10, 'y': 50},
                    {'zone': '庭院', 'x': 35, 'y': 50},
                    {'zone': '主殿', 'x': 60, 'y': 50},
                    {'zone': '花园', 'x': 50, 'y': 25},
                    {'zone': '塔楼', 'x': 80, 'y': 30},
                    {'zone': '地牢', 'x': 80, 'y': 75},
                ],
                'center_zone': '庭院',
                'entry_zone': '大门'
            },
            '童话镇': {
                'default_positions': [
                    {'zone': '入口', 'x': 10, 'y': 50},
                    {'zone': '广场', 'x': 50, 'y': 50},
                    {'zone': '小红帽家', 'x': 25, 'y': 30},
                    {'zone': '奶奶家', 'x': 75, 'y': 70},
                    {'zone': '森林入口', 'x': 85, 'y': 30},
                    {'zone': '市集', 'x': 30, 'y': 70},
                    {'zone': '教堂', 'x': 70, 'y': 25},
                ],
                'center_zone': '广场',
                'entry_zone': '入口'
            }
        }
        
        # 常见地点关键词映射
        self.location_keywords = {
            '小红帽家': ['小红帽', '小红', '主角家', '主角的家'],
            '奶奶家': ['奶奶', '外婆', '祖母', '老人家'],
            '森林': ['森林', '树林', ' woods', 'forest'],
            '村庄': ['村庄', '村子', 'village', 'town'],
            '城堡': ['城堡', '宫殿', 'castle', 'palace'],
            '广场': ['广场', 'square', 'center'],
            '小溪': ['小溪', '河流', '小河', 'stream', 'river'],
            '山洞': ['山洞', '洞穴', 'cave'],
            '教堂': ['教堂', '教会', 'church'],
            '酒馆': ['酒馆', '客栈', 'inn', 'tavern'],
            '市集': ['市集', '市场', 'market'],
            '道路': ['道路', '小路', 'path', 'road'],
            '桥': ['桥', 'bridge'],
            '花园': ['花园', 'garden'],
            '塔楼': ['塔楼', 'tower'],
            '墓地': ['墓地', 'graveyard', 'cemetery']
        }
    
    def analyze_locations_with_ai(self, story_text: str) -> List[Dict[str, Any]]:
        """
        使用AI分析故事文本，提取地点信息
        
        参数：
        - story_text: 故事文本
        
        返回：
        - 地点列表，包含名称、描述、重要性等
        """
        if not self.ai_provider:
            logger.warning("未配置AI提供者，使用默认地点分析")
            return self._analyze_locations_simple(story_text)
        
        # 构建AI提示词
        prompt = f"""
请分析以下童话故事文本，提取其中出现的所有地点信息：

故事文本：
{story_text}

请按照以下JSON格式输出分析结果：
{{
    "locations": [
        {{
            "name": "地点名称",
            "description": "地点描述或特征",
            "importance": "high/medium/low",
            "relations": ["相关地点1", "相关地点2"]
        }}
    ]
}}

注意事项：
1. 只提取故事中明确提到的地点
2. importance根据地点在故事中的重要程度判断
3. relations列出与该地点有直接关联的其他地点
4. 如果故事中没有提到具体地点，返回空数组
"""
        
        try:
            # 调用AI
            result = self.ai_provider.run(prompt, [], {"max_tokens": 1024, "temperature": 0.3})
            
            if result.get("success") and result.get("text"):
                try:
                    # 尝试解析JSON
                    data = json.loads(result["text"])
                    return data.get("locations", [])
                except json.JSONDecodeError:
                    # 如果JSON解析失败，尝试提取文本中的地点
                    logger.warning("AI返回格式不是有效的JSON，使用备用解析")
                    return self._parse_ai_text_response(result["text"])
            else:
                logger.warning("AI调用失败，使用默认分析")
                return self._analyze_locations_simple(story_text)
        except Exception as e:
            logger.error(f"AI分析地点失败: {e}")
            return self._analyze_locations_simple(story_text)
    
    def _analyze_locations_simple(self, story_text: str) -> List[Dict[str, Any]]:
        """
        简单的地点分析（不使用AI）
        
        参数：
        - story_text: 故事文本
        
        返回：
        - 地点列表
        """
        locations = []
        
        for location_name, keywords in self.location_keywords.items():
            for keyword in keywords:
                if keyword.lower() in story_text.lower():
                    # 检查是否已添加
                    if not any(loc['name'] == location_name for loc in locations):
                        locations.append({
                            'name': location_name,
                            'description': self._get_location_description(location_name),
                            'importance': self._estimate_importance(story_text, location_name),
                            'relations': []
                        })
                    break
        
        # 提取文本中可能存在的其他地点
        location_patterns = [
            r'(?:在|来到|前往|离开)\s*([\u4e00-\u9fa5]{2,6})',
            r'([\u4e00-\u9fa5]{2,6})(?:家|屋|店|庙|宫|殿|楼|阁|园|亭)'
        ]
        
        for pattern in location_patterns:
            matches = re.findall(pattern, story_text)
            for match in matches:
                if match and not any(loc['name'] == match for loc in locations):
                    locations.append({
                        'name': match,
                        'description': f"故事中提到的{match}",
                        'importance': 'medium',
                        'relations': []
                    })
        
        return locations
    
    def _parse_ai_text_response(self, text: str) -> List[Dict[str, Any]]:
        """
        解析AI返回的文本响应（当JSON格式无效时）
        
        参数：
        - text: AI返回的文本
        
        返回：
        - 地点列表
        """
        locations = []
        
        # 尝试提取以数字开头的地点列表
        lines = text.strip().split('\n')
        for line in lines:
            # 匹配类似 "1. 小红帽家 - 小红帽的住所" 的格式
            match = re.match(r'\d+\.\s*([^\-\n]+?)(?:\s*-\s*(.+))?$', line.strip())
            if match:
                name = match.group(1).strip()
                description = match.group(2).strip() if match.group(2) else ""
                locations.append({
                    'name': name,
                    'description': description,
                    'importance': 'medium',
                    'relations': []
                })
        
        return locations
    
    def _get_location_description(self, location_name: str) -> str:
        """获取地点的默认描述"""
        descriptions = {
            '小红帽家': '小红帽居住的房子，故事的起点',
            '奶奶家': '小红帽的奶奶居住的小屋，位于森林深处',
            '森林': '茂密的森林，充满神秘和危险',
            '村庄': '童话镇的村庄，居民们的家园',
            '城堡': '宏伟的城堡，可能是王宫或贵族住所',
            '广场': '村庄或城堡的中心广场',
            '小溪': '清澈的小溪，可能是重要的地标',
            '山洞': '神秘的山洞，可能隐藏着秘密',
            '教堂': '村庄的教堂，人们祈祷和集会的地方',
            '酒馆': '旅行者休息和交流的地方',
            '市集': '热闹的市场，买卖商品的地方'
        }
        return descriptions.get(location_name, f"故事中的{location_name}")
    
    def _estimate_importance(self, text: str, location_name: str) -> str:
        """
        估算地点的重要性
        
        参数：
        - text: 故事文本
        - location_name: 地点名称
        
        返回：
        - high/medium/low
        """
        count = text.lower().count(location_name.lower())
        if count >= 3:
            return 'high'
        elif count >= 1:
            return 'medium'
        else:
            return 'low'
    
    def assign_positions_to_locations(self, locations: List[Dict[str, Any]], 
                                      scene_type: str = '童话镇') -> List[Dict[str, Any]]:
        """
        为地点分配坐标位置
        
        参数：
        - locations: 地点列表（包含名称等信息）
        - scene_type: 场景类型（森林/村庄/城堡/童话镇）
        
        返回：
        - 带坐标的地点列表
        """
        layout = self.scene_layouts.get(scene_type, self.scene_layouts['童话镇'])
        default_positions = layout['default_positions']
        
        result = []
        used_positions = set()
        
        # 地点名称同义词映射
        location_aliases = {
            '小红帽家': ['小红帽家', '小红帽的住所', '小红帽的房子', '主角家', '主角的家'],
            '奶奶家': ['奶奶家', '奶奶的住所', '奶奶的房子', '外婆家', '外婆的住所', '祖母家', '老人家的房子'],
            '森林': ['森林', '森林入口', '树林', '大森林'],
            '村庄': ['村庄', '村子', '村庄广场', '广场'],
        }
        
        for loc in locations:
            location_name = loc.get('name', '')
            if not location_name:
                continue
            
            # 首先尝试匹配预设位置
            assigned = False
            for pos in default_positions:
                pos_zone = pos['zone']
                
                # 检查地点名称是否匹配预设区域
                if location_name in pos_zone or pos_zone in location_name:
                    result.append({
                        **loc,
                        'x': pos['x'],
                        'y': pos['y'],
                        'zone': pos['zone']
                    })
                    used_positions.add(f"{pos['x']},{pos['y']}")
                    assigned = True
                    logger.info(f"地点 '{location_name}' 匹配到预设位置 '{pos_zone}' ({pos['x']}, {pos['y']})")
                    break
                
                # 检查同义词映射
                for standard_name, aliases in location_aliases.items():
                    if location_name in aliases or any(alias in location_name for alias in aliases):
                        if pos_zone == standard_name or standard_name in pos_zone:
                            result.append({
                                **loc,
                                'x': pos['x'],
                                'y': pos['y'],
                                'zone': pos['zone']
                            })
                            used_positions.add(f"{pos['x']},{pos['y']}")
                            assigned = True
                            logger.info(f"地点 '{location_name}' 通过同义词匹配到预设位置 '{pos_zone}' ({pos['x']}, {pos['y']})")
                            break
                if assigned:
                    break
            
            if not assigned:
                # 如果没有预设位置，智能分配一个合理的位置
                position = self._find_available_position(loc, used_positions, layout)
                result.append({
                    **loc,
                    'x': position['x'],
                    'y': position['y'],
                    'zone': location_name
                })
                used_positions.add(f"{position['x']},{position['y']}")
                logger.info(f"地点 '{location_name}' 分配到新位置 ({position['x']}, {position['y']})")
        
        return result
    
    def _find_available_position(self, location: Dict[str, Any], 
                                 used_positions: set, layout: Dict[str, Any]) -> Dict[str, int]:
        """
        为未预设的地点找到一个合适的位置
        
        参数：
        - location: 地点信息
        - used_positions: 已使用的位置集合
        - layout: 场景布局信息
        
        返回：
        - 坐标 {'x': int, 'y': int}
        """
        importance = location.get('importance', 'medium')
        
        # 根据重要性决定位置优先级
        if importance == 'high':
            # 重要地点放在中心区域附近
            center_x, center_y = 50, 50
            candidates = [
                (center_x, center_y),
                (center_x - 15, center_y),
                (center_x + 15, center_y),
                (center_x, center_y - 15),
                (center_x, center_y + 15)
            ]
        elif importance == 'medium':
            # 中等重要性放在中间区域
            candidates = [
                (25, 35), (75, 35), (25, 65), (75, 65),
                (35, 25), (65, 25), (35, 75), (65, 75)
            ]
        else:
            # 次要地点放在边缘
            candidates = [
                (15, 20), (85, 20), (15, 80), (85, 80),
                (20, 15), (80, 15), (20, 85), (80, 85)
            ]
        
        # 找到第一个未使用的位置
        for x, y in candidates:
            if f"{x},{y}" not in used_positions:
                return {'x': x, 'y': y}
        
        # 如果所有候选位置都被占用，随机选择一个边缘位置
        import random
        while True:
            x = random.randint(10, 90)
            y = random.randint(10, 90)
            if f"{x},{y}" not in used_positions:
                return {'x': x, 'y': y}
    
    def generate_map_data(self, story_text: str, scene_type: str = '童话镇') -> Dict[str, Any]:
        """
        生成完整的地图数据
        
        参数：
        - story_text: 故事文本
        - scene_type: 场景类型
        
        返回：
        - 完整的地图数据，包含地点列表和场景信息
        """
        # 分析地点
        locations = self.analyze_locations_with_ai(story_text)
        
        # 分配位置
        locations_with_positions = self.assign_positions_to_locations(locations, scene_type)
        
        # 获取场景布局信息
        layout = self.scene_layouts.get(scene_type, self.scene_layouts['童话镇'])
        
        return {
            'scene_type': scene_type,
            'center_zone': layout.get('center_zone'),
            'entry_zone': layout.get('entry_zone'),
            'total_locations': len(locations_with_positions),
            'locations': locations_with_positions,
            'map_size': {
                'width': 100,
                'height': 100,
                'unit': 'percentage'
            }
        }


# ==================== 便捷函数 ====================

def analyze_story_locations(story_text: str, scene_type: str = '童话镇', 
                            ai_provider=None) -> Dict[str, Any]:
    """
    便捷函数：分析故事地点并生成地图数据
    
    参数：
    - story_text: 故事文本
    - scene_type: 场景类型
    - ai_provider: AI提供者（可选）
    
    返回：
    - 地图数据
    """
    analyzer = MapAnalyzer(ai_provider)
    return analyzer.generate_map_data(story_text, scene_type)