"""
game_core/director.py

职责：
- 作为"导演"控制整个剧情流程
- 解析 AI 生成的动作序列
- 验证动作合法性并更新游戏状态
- 生成标准化的前端指令包
- 支持有节奏的完整剧情表演
"""
from __future__ import annotations

import logging
from typing import List, Dict, Any, Optional
from .game_state import GameState

logger = logging.getLogger(__name__)


class ActionValidator:
    """动作验证器：检查动作的合法性"""
    
    def __init__(self, game_state: GameState):
        self.game_state = game_state
    
    def validate_move(self, action: Dict[str, Any]) -> bool:
        """验证移动动作"""
        character = action.get('character', '')
        target = action.get('target', '')
        
        # 检查角色是否存在
        char_exists = any(c.get('name') == character for c in self.game_state.characters)
        if not char_exists:
            logger.warning(f"移动动作失败: 角色 '{character}' 不存在")
            return False
        
        # 检查目标位置是否有效（简单示例：非空字符串）
        if not target:
            logger.warning(f"移动动作失败: 缺少目标位置")
            return False
        
        return True
    
    def validate_speak(self, action: Dict[str, Any]) -> bool:
        """验证对话动作"""
        character = action.get('character', '')
        content = action.get('content', '')
        
        # 检查说话者是否存在
        char_exists = any(c.get('name') == character for c in self.game_state.characters)
        if not char_exists and character:
            logger.warning(f"对话动作失败: 角色 '{character}' 不存在")
            return False
        
        # 检查台词内容
        if not content:
            logger.warning(f"对话动作失败: 缺少台词内容")
            return False
        
        return True
    
    def validate_action(self, action: Dict[str, Any]) -> bool:
        """通用动作验证"""
        action_type = action.get('type', '')
        
        # 根据类型调用对应的验证方法
        validators = {
            'move': self.validate_move,
            'speak': self.validate_speak,
        }
        
        validator = validators.get(action_type)
        if validator:
            return validator(action)
        
        # 默认认为其他类型动作合法
        return True


class StateUpdater:
    """状态更新器：根据动作更新游戏状态"""
    
    def __init__(self, game_state: GameState):
        self.game_state = game_state
        self.state_changes = []
    
    def apply_move(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """应用移动动作到状态"""
        character = action.get('character', '')
        target = action.get('target', '')
        
        # 更新角色位置（这里简化处理，实际可能需要坐标系统）
        for char in self.game_state.characters:
            if char.get('name') == character:
                old_position = char.get('position', {}).copy()
                # 假设 target 是位置描述，可以转换为坐标
                char['position'] = self._target_to_position(target)
                
                change = {
                    'type': 'position_change',
                    'character': character,
                    'old_position': old_position,
                    'new_position': char['position'],
                    'target_description': target
                }
                self.state_changes.append(change)
                return change
        
        return {}
    
    def apply_meet(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """应用相遇动作"""
        character = action.get('character', '')
        target = action.get('target', '')
        
        change = {
            'type': 'encounter',
            'characters': [character, target] if target else [character],
            'description': action.get('content', f'{character}与{target}相遇')
        }
        self.state_changes.append(change)
        return change
    
    def apply_emotion(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """应用情绪变化"""
        character = action.get('character', '')
        emotion = action.get('emotion', 'neutral')
        
        for char in self.game_state.characters:
            if char.get('name') == character:
                old_emotion = char.get('emotion', 'neutral')
                char['emotion'] = emotion
                
                change = {
                    'type': 'emotion_change',
                    'character': character,
                    'old_emotion': old_emotion,
                    'new_emotion': emotion
                }
                self.state_changes.append(change)
                return change
        
        return {}
    
    def _target_to_position(self, target: str) -> Dict[str, int]:
        """将目标描述转换为坐标（简化版）"""
        # 支持中英文位置描述
        position_map = {
            # 中文描述
            '门口': {'x': 10, 'y': 50},
            '桌子': {'x': 50, 'y': 50},
            '窗户': {'x': 90, 'y': 50},
            '广场中心': {'x': 50, 'y': 50},
            '广场的中心': {'x': 50, 'y': 50},
            '森林深处': {'x': 70, 'y': 30},
            '奶奶家': {'x': 80, 'y': 60},
            '小路': {'x': 40, 'y': 40},
            '广场左边': {'x': 10, 'y': 50},
            '广场的左边': {'x': 10, 'y': 50},
            '广场最左边': {'x': 5, 'y': 50},
            '广场的最左边': {'x': 5, 'y': 50},
            '广场右边': {'x': 90, 'y': 50},
            '广场的右边': {'x': 90, 'y': 50},
            '广场最右边': {'x': 95, 'y': 50},
            '广场的最右边': {'x': 95, 'y': 50},
            '广场上方': {'x': 50, 'y': 10},
            '广场的上方': {'x': 50, 'y': 10},
            '广场下方': {'x': 50, 'y': 90},
            '广场的下方': {'x': 50, 'y': 90},
            '左边': {'x': 10, 'y': 50},
            '最左边': {'x': 5, 'y': 50},
            '右边': {'x': 90, 'y': 50},
            '最右边': {'x': 95, 'y': 50},
            '上方': {'x': 50, 'y': 10},
            '下方': {'x': 50, 'y': 90},
            '中间': {'x': 50, 'y': 50},
            '中心': {'x': 50, 'y': 50},
            # 英文描述
            'door': {'x': 10, 'y': 50},
            'table': {'x': 50, 'y': 50},
            'window': {'x': 90, 'y': 50},
            'center': {'x': 50, 'y': 50},
            'middle': {'x': 50, 'y': 50},
            'left': {'x': 10, 'y': 50},
            'right': {'x': 90, 'y': 50},
            'top': {'x': 50, 'y': 10},
            'bottom': {'x': 50, 'y': 90},
            'top-left': {'x': 10, 'y': 10},
            'top-right': {'x': 90, 'y': 10},
            'bottom-left': {'x': 10, 'y': 90},
            'bottom-right': {'x': 90, 'y': 90},
            'forest entrance': {'x': 20, 'y': 50},
            'deep forest': {'x': 70, 'y': 30},
            'grandmother house': {'x': 80, 'y': 60},
            'path': {'x': 40, 'y': 40},
        }
        position = position_map.get(target, {'x': 50, 'y': 50})
        
        # 标准化位置：禁止斜向移动，只允许 X 轴或 Y 轴单一方向
        # 如果当前位置不是标准位置（50, 50 或其他预设位置），需要调整
        return self._normalize_position(position)
    
    def _normalize_position(self, position: Dict[str, int]) -> Dict[str, int]:
        """标准化位置：确保只沿 X 轴或 Y 轴移动
        
        规则：
        1. 如果当前位置的 X 和 Y 都不是 50（中心），则调整为只改变一个轴
        2. 优先保持 Y 轴不变（水平移动），除非 Y 轴也需要改变
        """
        x = position.get('x', 50)
        y = position.get('y', 50)
        
        # 如果已经在标准位置（X 或 Y 为 50），直接返回
        if x == 50 or y == 50:
            return position
        
        # 否则，优先保持 Y 轴为 50（水平移动）
        # 这样可以确保角色先水平移动，再垂直移动
        return {'x': x, 'y': 50}
    
    def get_all_changes(self) -> List[Dict[str, Any]]:
        """获取所有状态变更"""
        return self.state_changes.copy()
    
    def reset(self):
        """重置变更记录"""
        self.state_changes.clear()


class PlotDirector:
    """
    剧情导演：核心控制器
    
    工作流程：
    1. 接收 AI 生成的原始动作序列
    2. 验证每个动作的合法性
    3. 预演状态变更
    4. 生成标准化的前端指令包
    5. 支持有节奏的完整剧情表演
    """
    
    def __init__(self, game_state: GameState):
        self.game_state = game_state
        self.validator = ActionValidator(game_state)
        self.updater = StateUpdater(game_state)
        self.turn_counter = 0
        self.map_locations = []  # 存储地图位置数据 [{name, x, y, ...}, ...]
        self.character_initial_positions = {}  # 存储角色初始位置 {character_name: {x, y}}
    
    def set_map_locations(self, locations: List[Dict[str, Any]], character_initial_positions: Dict[str, Dict[str, int]] = None):
        """
        设置地图位置数据
        
        参数：
        - locations: 地图地点列表
        - character_initial_positions: 角色初始位置字典 {角色名: {x, y}}
        """
        self.map_locations = locations
        self.character_initial_positions = character_initial_positions or {}
        logger.info(f"导演已设置地图数据: {len(locations)}个地点, {len(self.character_initial_positions)}个角色初始位置")
    
    def _find_location_position(self, target: str) -> Optional[Dict[str, int]]:
        """
        根据地点名称查找坐标
        
        参数：
        - target: 地点描述（如"奶奶家"、"森林"等）
        
        返回：
        - 坐标字典 {x, y} 或 None
        """
        if not target:
            return None
        
        target_lower = target.lower()
        
        # 0. 地点名称同义词映射
        location_aliases = {
            '小红帽家': ['小红帽家', '小红帽的住所', '小红帽的房子', '主角家', '主角的家'],
            '奶奶家': ['奶奶家', '奶奶', '外婆家', '外婆', '祖母', '奶奶的住所', '外婆的住所'],
            '森林': ['森林', '森林入口', '树林', '大森林', '森林深处'],
            '村庄': ['村庄', '村子', '村庄广场', '广场'],
        }
        
        # 检查是否为目标的关键字匹配同义词
        for standard_name, aliases in location_aliases.items():
            if target_lower in [a.lower() for a in aliases] or any(a.lower() in target_lower for a in aliases):
                # 用标准名称去匹配
                for loc in self.map_locations:
                    loc_name = loc.get('name', '').lower()
                    loc_zone = loc.get('zone', '').lower()
                    if standard_name.lower() == loc_name or standard_name.lower() == loc_zone or loc_name == standard_name.lower():
                        return {'x': loc.get('x', 50), 'y': loc.get('y', 50)}
        
        # 1. 精确匹配地点名称
        for loc in self.map_locations:
            loc_name = loc.get('name', '').lower()
            loc_zone = loc.get('zone', '').lower()
            if loc_name == target_lower or loc_zone == target_lower:
                return {'x': loc.get('x', 50), 'y': loc.get('y', 50)}
        
        # 2. 模糊匹配（地点名包含目标）
        for loc in self.map_locations:
            loc_name = loc.get('name', '').lower()
            loc_zone = loc.get('zone', '').lower()
            if target_lower in loc_name or loc_name in target_lower:
                return {'x': loc.get('x', 50), 'y': loc.get('y', 50)}
            if target_lower in loc_zone or loc_zone in target_lower:
                return {'x': loc.get('x', 50), 'y': loc.get('y', 50)}
        
        # 3. 常见地点名称映射
        common_mappings = {
            '家': ['小红帽家', '奶奶家', '主角家'],
            '森林': ['森林入口', '森林深处'],
            '村庄': ['村庄入口', '村庄广场'],
            '小红帽家': ['小红帽家'],
            '奶奶家': ['奶奶家'],
        }
        
        for key, names in common_mappings.items():
            if key in target:
                for name in names:
                    for loc in self.map_locations:
                        if loc.get('name') == name or loc.get('zone') == name:
                            return {'x': loc.get('x', 50), 'y': loc.get('y', 50)}
        
        # 4. 最后尝试：直接检查原始target是否包含"奶奶"或"小红帽"等关键词
        if '奶奶' in target:
            for loc in self.map_locations:
                loc_name = loc.get('name', '')
                if '奶奶' in loc_name or '外婆' in loc_name:
                    return {'x': loc.get('x', 50), 'y': loc.get('y', 50)}
        if '小红帽' in target:
            for loc in self.map_locations:
                loc_name = loc.get('name', '')
                if '小红帽' in loc_name:
                    return {'x': loc.get('x', 50), 'y': loc.get('y', 50)}
        
        return None
    
    def get_character_initial_position(self, character_name: str) -> Dict[str, int]:
        """
        获取角色的初始位置
        
        参数：
        - character_name: 角色名称
        
        返回：
        - 坐标字典 {x, y}
        """
        # 优先使用预设的初始位置
        if character_name in self.character_initial_positions:
            return self.character_initial_positions[character_name]
        
        # 如果没有预设，查找角色相关地点
        for loc in self.map_locations:
            name = loc.get('name', '')
            zone = loc.get('zone', '')
            # 小红帽默认在小红帽家，奶奶默认在奶奶家
            if '小红帽' in character_name and ('小红帽家' in name or '小红帽' in zone):
                return {'x': loc.get('x', 50), 'y': loc.get('y', 50)}
            if '奶奶' in character_name and ('奶奶家' in name or '奶奶' in zone):
                return {'x': loc.get('x', 50), 'y': loc.get('y', 50)}
        
        # 默认返回中心位置
        return {'x': 50, 'y': 50}
    
    def direct_turn(
        self,
        raw_actions: List[Dict[str, Any]],
        narrative: str = "",
        next_options: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        导演一个回合的剧情
        
        参数：
        - raw_actions: AI 生成的原始动作列表
        - narrative: 旁白/剧情描述
        - next_options: 后续选项列表
        
        返回：
        - 标准化的前端指令包，包含完整的表演序列
        """
        self.turn_counter += 1
        self.updater.reset()
        
        logger.info(f"开始导演第 {self.turn_counter} 回合，共 {len(raw_actions)} 个动作")
        
        # 1. 验证并过滤动作
        valid_actions = self._validate_and_filter_actions(raw_actions)
        
        # 2. 预演状态变更
        executed_actions = self._simulate_execution(valid_actions)
        
        # 3. 生成完整的表演序列（按时间顺序）
        performance_sequence = self._generate_performance_sequence(executed_actions, narrative)
        
        # 4. 提取关键信息用于兼容旧接口
        character_action = self._extract_character_action(executed_actions)
        dialogue = self._extract_dialogue(executed_actions)
        
        # 5. 构建标准化响应
        response = {
            'turn_id': self.turn_counter,
            'narrative': narrative or self._generate_narrative(executed_actions),
            'character_action': character_action,
            'dialogue': dialogue,
            'performance_sequence': performance_sequence,  # 新增：完整的表演序列
            'world_state_update': {
                'state_changes': self.updater.get_all_changes(),
                'characters': self._serialize_characters()
            },
            'next_options': next_options or self._generate_default_options(),
            'metadata': {
                'total_actions': len(raw_actions),
                'valid_actions': len(valid_actions),
                'executed_actions': len(executed_actions),
                'performance_steps': len(performance_sequence)
            }
        }
        
        logger.info(f"第 {self.turn_counter} 回合导演完成，生成 {len(performance_sequence)} 个表演步骤")
        return response
    
    def _validate_and_filter_actions(
        self, 
        actions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """验证并过滤动作"""
        valid_actions = []
        
        for i, action in enumerate(actions):
            if self.validator.validate_action(action):
                valid_actions.append(action)
            else:
                logger.warning(f"动作 {i} 验证失败，已跳过: {action}")
        
        return valid_actions
    
    def _simulate_execution(
        self, 
        actions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """模拟执行动作并更新状态"""
        executed = []
        
        for action in actions:
            action_type = action.get('type', '')
            
            # 根据类型应用状态变更
            if action_type == 'move':
                change = self.updater.apply_move(action)
                if change:
                    # 获取角色的实际位置信息
                    character_name = action.get('character', '')
                    character_position = {}
                    for char in self.game_state.characters:
                        if char.get('name') == character_name:
                            character_position = char.get('position', {})
                            break
                    
                    executed.append({
                        **action, 
                        'state_change': change,
                        'position': character_position  # 添加位置信息用于前端表演序列
                    })
            
            elif action_type == 'meet':
                change = self.updater.apply_meet(action)
                executed.append({**action, 'state_change': change})
            
            elif action_type == 'emotion':
                change = self.updater.apply_emotion(action)
                if change:
                    executed.append({**action, 'state_change': change})
            
            else:
                # 其他类型直接执行
                executed.append(action)
        
        return executed
    
    def _generate_performance_sequence(
        self, 
        executed_actions: List[Dict[str, Any]], 
        narrative: str
    ) -> List[Dict[str, Any]]:
        """
        生成完整的表演序列，按顺序排列（不带时间戳）
        前端按顺序执行，每个步骤完成后自动执行下一个
        """
        sequence = []
        
        # 步骤1: 显示旁白（如果有）
        if narrative.strip():
            sequence.append({
                'step_id': len(sequence) + 1,
                'type': 'narrative_display',
                'content': narrative,
                'duration': 2000,  # 2秒显示时间
                'target_element': 'narrative-panel'
            })
        
        # 步骤2: 按原始顺序处理角色动作和对话（保持故事时间顺序）
        for action in executed_actions:
            action_type = action.get('type', '')
            
            if action_type == 'move':
                # 处理移动动作
                character = action.get('character', '')
                target = action.get('target', '')
                position = action.get('position', {})
                
                # 优先使用地图位置数据
                map_position = self._find_location_position(target)
                if map_position:
                    position = map_position
                    logger.info(f"使用地图位置: {character} -> {target} = ({position['x']}, {position['y']})")
                
                # 移动动画通常需要时间
                move_duration = self._calculate_move_duration(action)
                
                # 如果有地图数据，根据移动距离调整时间
                if map_position and self.map_locations:
                    # 计算从当前位置到目标位置的距离
                    current_pos = self.game_state.get_character_position(character) if hasattr(self.game_state, 'get_character_position') else None
                    if current_pos:
                        distance = ((map_position['x'] - current_pos['x'])**2 + (map_position['y'] - current_pos['y'])**2)**0.5
                        # 根据距离调整动画时间（距离越远时间越长）
                        distance_factor = max(0.5, min(2.0, distance / 50))
                        move_duration = int(move_duration * distance_factor)
                
                sequence.append({
                    'step_id': len(sequence) + 1,
                    'type': 'character_move',
                    'character': character,
                    'target_position': position,
                    'target_description': target,
                    'animation': 'walk',
                    'duration': move_duration,
                    'easing': 'ease-in-out'
                })
            
            elif action_type == 'speak':
                # 处理对话动作
                speaker = action.get('character', '')
                text = action.get('content', '')
                emotion = action.get('emotion', 'neutral')
                
                # 对话显示时间基于文本长度
                text_duration = min(5000, max(2000, len(text) * 100))
                
                sequence.append({
                    'step_id': len(sequence) + 1,
                    'type': 'dialogue_display',
                    'speaker': speaker,
                    'text': text,
                    'emotion': emotion,
                    'duration': text_duration,
                    'target_element': 'dialogue-bubble'
                })
            
            elif action_type == 'meet':
                # 处理相遇事件
                characters = action.get('characters', [])
                content = action.get('content', '')
                
                # 如果没有content，自动生成
                if not content and len(characters) >= 2:
                    content = f"{characters[0]}与{characters[1]}相遇了"
                elif not content and len(characters) == 1:
                    content = f"{characters[0]}遇到了某人"
                
                sequence.append({
                    'step_id': len(sequence) + 1,
                    'type': 'narrative_display',
                    'content': content,
                    'duration': 2500,
                    'target_element': 'narrative-panel'
                })
            
            else:
                # 处理其他动作（表情变化等）
                if action_type == 'emotion':
                    character = action.get('character', '')
                    emotion = action.get('emotion', 'neutral')
                    
                    sequence.append({
                        'step_id': len(sequence) + 1,
                        'type': 'character_emotion',
                        'character': character,
                        'emotion': emotion,
                        'animation': 'expression_change',
                        'duration': 1000,
                        'target_element': f'character-{character}'
                    })
        
        # 如果没有任何动作，至少显示一个默认的叙事步骤
        if not sequence and narrative.strip():
            sequence = [{
                'step_id': 1,
                'type': 'narrative_display',
                'content': narrative,
                'duration': 3000,
                'target_element': 'narrative-panel'
            }]
        elif not sequence:
            # 完全没有内容的情况
            sequence = [{
                'step_id': 1,
                'type': 'narrative_display',
                'content': '故事继续进行...',
                'duration': 2000,
                'target_element': 'narrative-panel'
            }]
        
        return sequence
    
    def _calculate_move_duration(self, action: Dict[str, Any]) -> int:
        """
        计算移动动作的持续时间（毫秒）
        根据距离和故事情节（动作描述中的情感/速度词汇）综合计算
        """
        target = action.get('target', '')
        content = action.get('content', '')  # 获取动作描述
        emotion = action.get('emotion', '')  # 获取情绪状态

        # 基础时间（毫秒）- 进一步调慢速度
        base_duration = 5000

        # 基于距离调整
        distance_multiplier = 1.0
        if any(word in target for word in ['深处', '远处', '远方', '遥远的']):
            distance_multiplier = 1.8  # 较远距离
        elif any(word in target for word in ['附近', '旁边', '近处', '面前']):
            distance_multiplier = 0.7  # 较近距离
        elif any(word in target for word in ['角落', '边缘']):
            distance_multiplier = 0.85  # 短距离

        # 基于速度/情感词汇调整
        speed_multiplier = 1.0

        # 快速、匆忙的词汇 - 加快速度
        if any(word in content.lower() + emotion.lower() for word in
               ['快速', '飞快', '匆忙', '急匆匆', '跑', '奔', '冲', '疾速', '迅速',
                'hurried', 'quickly', 'fast', 'rush', 'dash', 'hurry', 'rapid']):
            speed_multiplier = 0.6  # 快速移动

        # 缓慢、从容的词汇 - 减慢速度
        elif any(word in content.lower() + emotion.lower() for word in
                 ['缓慢', '慢慢', '悠闲', '从容', '漫步', '踱步', '散步', '悠闲地',
                  '慢悠悠', '悠闲地', '缓步', '徐徐',
                  'slowly', 'slow', 'leisurely', 'calmly', 'stroll', 'walk']):
            speed_multiplier = 2.5  # 慢速移动，时间加倍

        # 紧张、激烈的词汇
        elif any(word in content.lower() + emotion.lower() for word in
                 ['紧张', '焦急', '焦虑', '害怕', '恐惧', '慌张',
                  'nervous', 'anxious', 'afraid', 'scared', 'panic', 'nervously']):
            speed_multiplier = 0.8  # 紧张状态下稍快

        # 沉重、沉重的步伐
        elif any(word in content.lower() + emotion.lower() for word in
                 ['沉重', '沉重地', '蹒跚', '踉跄', '疲惫',
                  'heavy', 'heavily', 'stumble', 'tired', 'exhausted']):
            speed_multiplier = 2.2  # 沉重缓慢

        # 悲伤、沮丧的词汇
        elif any(word in content.lower() + emotion.lower() for word in
                 ['悲伤', '沮丧', '失落', '拖着脚步', '垂头丧气',
                  'sad', 'depressed', 'downhearted', 'disheartened']):
            speed_multiplier = 2.0  # 悲伤时走得慢

        # 神秘、悄悄的词汇
        elif any(word in content.lower() + emotion.lower() for word in
                 ['悄悄', '偷偷', '静悄悄', '神秘', '蹑手蹑脚',
                  'quietly', 'secretly', 'sneak', 'mysterious', 'tiptoe']):
            speed_multiplier = 1.5  # 悄悄移动，稍慢

        # 计算最终时间
        final_duration = base_duration * distance_multiplier * speed_multiplier

        # 限制范围在 2000ms - 10000ms 之间
        return int(max(2000, min(10000, final_duration)))
    
    def _extract_character_action(
        self, 
        executed_actions: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """提取主要的角色动作（用于前端动画）"""
        # 优先级：move > appear > action > emotion
        priority_types = ['move', 'appear', 'action', 'emotion']
        
        for action_type in priority_types:
            for action in executed_actions:
                if action.get('type') == action_type:
                    return {
                        'name': action.get('character', ''),
                        'animation': self._map_to_animation(action),
                        'expression': action.get('emotion', 'neutral'),
                        'position': action.get('position'),
                        'target': action.get('target', '')
                    }
        
        return None
    
    def _extract_dialogue(
        self, 
        executed_actions: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """提取对话信息"""
        for action in executed_actions:
            if action.get('type') == 'speak':
                return {
                    'speaker': action.get('character', ''),
                    'text': action.get('content', ''),
                    'emotion': action.get('emotion', 'neutral')
                }
        
        return None
    
    def _map_to_animation(self, action: Dict[str, Any]) -> str:
        """将动作类型映射为前端动画标识"""
        animation_map = {
            'move': 'walk',
            'appear': 'fade_in',
            'exit_scene': 'fade_out',
            'emotion': 'expression_change',
            'action': 'generic_action'
        }
        
        action_type = action.get('type', '')
        return animation_map.get(action_type, 'none')
    
    def _generate_narrative(self, executed_actions: List[Dict[str, Any]]) -> str:
        """根据执行的动作生成旁白"""
        narratives = []
        
        for action in executed_actions:
            action_type = action.get('type', '')
            character = action.get('character', '')
            content = action.get('content', '')
            
            if action_type == 'move':
                target = action.get('target', '某处')
                narratives.append(f"{character}走向{target}。")
            elif action_type == 'speak':
                # 对话不加入旁白
                pass
            elif action_type == 'meet':
                target = action.get('target', '')
                narratives.append(f"{character}遇到了{target}。")
            elif action_type == 'narration':
                narratives.append(content)
        
        return ' '.join(narratives) if narratives else "故事继续进行..."
    
    def _generate_default_options(self) -> List[Dict[str, str]]:
        """生成默认的后续选项"""
        return [
            {'label': '继续对话', 'action_input': 'continue conversation'},
            {'label': '改变话题', 'action_input': 'change topic'},
            {'label': '离开', 'action_input': 'leave'}
        ]
    
    def _serialize_characters(self) -> List[Dict[str, Any]]:
        """序列化角色状态（用于前端同步）"""
        return [
            {
                'name': char.get('name', ''),
                'position': char.get('position', {}),
                'emotion': char.get('emotion', 'neutral'),
                'role': char.get('role', '')
            }
            for char in self.game_state.characters
        ]