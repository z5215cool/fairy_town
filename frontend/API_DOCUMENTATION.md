# 童话镇多智能体系统 - API接口文档

## 概述

本文档描述了童话镇多智能体系统前端与后端之间的所有数据交互接口。所有接口均采用RESTful风格，使用JSON格式进行数据交换。

## 基础信息

- **基础URL**: `http://localhost:8080/api`
- **数据格式**: JSON
- **字符编码**: UTF-8
- **认证方式**: 暂无（后续可添加）

## 接口列表

### 1. 文本分析接口

#### 1.1 分析故事文本

**接口地址**: `POST /analyze-text`

**功能描述**: 接收用户输入的小说文本或剧本内容，分析并识别其中的角色、场景和剧情点。

**请求参数**:
```json
{
  "text": "string",           // 必需，故事文本内容
  "scene": "string",          // 可选，当前场景名称
  "language": "string"        // 可选，文本语言，默认"zh-CN"
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "characters": [            // 识别到的角色列表
      {
        "id": "string",        // 角色唯一标识符
        "name": "string",      // 角色名称
        "role": "string",      // 角色类型（主角/反派/配角）
        "position": {          // 初始位置
          "x": 50,           // X坐标（百分比）
          "y": 50            // Y坐标（百分比）
        },
        "emotion": "string",    // 初始情绪状态
        "confidence": 0.95      // 识别置信度（0-1）
      }
    ],
    "scene": "string",          // 识别到的场景
    "plotPoints": [            // 剧情关键点
      {
        "id": 1,
        "content": "string",    // 剧情点内容
        "importance": 0.8      // 重要性评分（0-1）
      }
    ],
    "entities": [              // 其他实体（物品、地点等）
      {
        "id": "string",
        "name": "string",
        "type": "string"
      }
    ]
  },
  "message": "string"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "文本内容不能为空"
  }
}
```

### 2. 角色状态接口

#### 2.1 获取角色状态

**接口地址**: `GET /characters/:id/state`

**功能描述**: 获取指定角色的当前状态信息。

**路径参数**:
- `id`: 角色ID（必需）

**返回数据**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "role": "string",
    "position": {
      "x": 50,
      "y": 50
    },
    "emotion": "string",        // 当前情绪
    "action": "string",        // 当前动作
    "dialogueHistory": [       // 对话历史
      {
        "speaker": "string",   // 说话者
        "content": "string",   // 对话内容
        "timestamp": "string"   // 时间戳
      }
    ],
    "relationships": [         // 角色关系
      {
        "characterId": "string",
        "type": "string",      // 关系类型
        "strength": 0.8        // 关系强度（0-1）
      }
    ],
    "lastUpdate": "string"     // 最后更新时间
  }
}
```

#### 2.2 更新角色状态

**接口地址**: `PUT /characters/:id/state`

**功能描述**: 更新指定角色的状态信息。

**路径参数**:
- `id`: 角色ID（必需）

**请求参数**:
```json
{
  "emotion": "string",        // 可选，情绪状态
  "action": "string",        // 可选，当前动作
  "position": {              // 可选，位置信息
    "x": 50,
    "y": 50
  },
  "scene": "string"          // 可选，场景名称
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "updatedFields": ["emotion", "position"],
    "timestamp": "string"
  }
}
```

### 3. 角色移动接口

#### 3.1 移动角色

**接口地址**: `POST /characters/:id/move`

**功能描述**: 控制角色在场景中移动。

**路径参数**:
- `id`: 角色ID（必需）

**请求参数**:
```json
{
  "position": {              // 必需，目标位置
    "x": 60,               // X坐标（百分比）
    "y": 55                // Y坐标（百分比）
  },
  "scene": "string",         // 可选，目标场景
  "speed": "normal",        // 可选，移动速度（slow/normal/fast）
  "path": [                // 可选，移动路径
    {"x": 55, "y": 50},
    {"x": 60, "y": 55}
  ]
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "characterId": "string",
    "fromPosition": {"x": 50, "y": 50},
    "toPosition": {"x": 60, "y": 55},
    "estimatedTime": 2000,    // 预计移动时间（毫秒）
    "path": [                 // 实际路径
      {"x": 50, "y": 50},
      {"x": 55, "y": 50},
      {"x": 60, "y": 55}
    ]
  }
}
```

### 4. 角色动作接口

#### 4.1 执行角色动作

**接口地址**: `POST /characters/:id/action`

**功能描述**: 让角色执行特定动作。

**路径参数**:
- `id`: 角色ID（必需）

**请求参数**:
```json
{
  "action": "string",         // 必需，动作类型
  "target": "string",        // 可选，动作目标（角色ID或物体ID）
  "parameters": {            // 可选，动作参数
    "intensity": 0.8,
    "duration": 3000
  }
}
```

**支持的动作类型**:
- `walk`: 走路
- `run`: 跑步
- `talk`: 说话
- `dance`: 跳舞
- `wave`: 挥手
- `sit`: 坐下
- `stand`: 站立
- `jump`: 跳跃

**返回数据**:
```json
{
  "success": true,
  "data": {
    "characterId": "string",
    "action": "string",
    "status": "executing",     // 执行状态
    "duration": 3000,         // 动作持续时间（毫秒）
    "animation": "string"      // 动画名称
  }
}
```

### 5. 对话接口

#### 5.1 发送对话

**接口地址**: `POST /dialogue/send`

**功能描述**: 发送用户或角色对话，获取智能体回复。

**请求参数**:
```json
{
  "characterId": "string",     // 必需，角色ID
  "message": "string",        // 必需，对话内容
  "speaker": "user",          // 必需，说话者类型（user/character）
  "context": {               // 可选，对话上下文
    "scene": "string",
    "recentDialogues": ["string"],
    "activeCharacters": ["string"]
  }
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "characterId": "string",
    "response": "string",      // 角色回复
    "emotion": "string",       // 回复时的情绪
    "action": "string",        // 伴随动作
    "timestamp": "string"
  }
}
```

#### 5.2 获取对话历史

**接口地址**: `GET /dialogue/history/:characterId`

**功能描述**: 获取指定角色的对话历史记录。

**路径参数**:
- `characterId`: 角色ID（必需）

**查询参数**:
- `limit`: 返回记录数量（默认20）
- `offset`: 偏移量（默认0）

**返回数据**:
```json
{
  "success": true,
  "data": {
    "dialogues": [
      {
        "id": "string",
        "speaker": "string",
        "content": "string",
        "timestamp": "string"
      }
    ],
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

### 6. 剧情预测接口

#### 6.1 生成剧情预测

**接口地址**: `POST /plot/predict`

**功能描述**: 基于当前故事内容，预测可能的剧情发展方向。

**请求参数**:
```json
{
  "text": "string",           // 必需，当前故事文本
  "characters": [            // 必需，角色列表
    {
      "id": "string",
      "name": "string",
      "role": "string"
    }
  ],
  "currentScene": "string",   // 必需，当前场景
  "plotPoints": [           // 可选，已知剧情点
    {
      "id": 1,
      "content": "string"
    }
  ],
  "options": {              // 可选，预测选项
    "count": 4,            // 生成预测数量
    "diversity": 0.8        // 多样性参数（0-1）
  }
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "id": 1,
        "title": "string",      // 预测标题
        "description": "string", // 详细描述
        "probability": 0.35,    // 可能性（0-1）
        "keyEvents": [         // 关键事件
          "string"
        ],
        "characterInvolvement": { // 角色参与度
          "characterId": 0.8
        }
      }
    ],
    "generatedAt": "string"
  }
}
```

#### 6.2 选择剧情分支

**接口地址**: `POST /plot/select`

**功能描述**: 用户选择特定的剧情发展方向。

**请求参数**:
```json
{
  "predictionId": 1,         // 必需，预测ID
  "characterId": "string",   // 可选，主要参与角色
  "customization": {          // 可选，自定义调整
    "tone": "string",
    "pace": "string"
  }
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "selectedPrediction": {
      "id": 1,
      "title": "string"
    },
    "nextSteps": [           // 后续步骤建议
      "string"
    ],
    "updatedPlot": "string"   // 更新后的剧情
  }
}
```

### 7. 场景管理接口

#### 7.1 获取场景信息

**接口地址**: `GET /scenes/:sceneName`

**功能描述**: 获取指定场景的详细信息。

**路径参数**:
- `sceneName`: 场景名称（必需）

**返回数据**:
```json
{
  "success": true,
  "data": {
    "name": "string",
    "description": "string",
    "background": "string",     // 背景图片URL
    "timeOfDay": "string",     // 时间段
    "weather": "string",        // 天气
    "objects": [               // 场景中的物体
      {
        "id": "string",
        "name": "string",
        "type": "string",
        "position": {"x": 50, "y": 50},
        "interactive": true
      }
    ],
    "exits": [               // 出口/连接的场景
      {
        "direction": "string",
        "targetScene": "string"
      }
    ]
  }
}
```

#### 7.2 切换场景

**接口地址**: `POST /scenes/switch`

**功能描述**: 切换到新的场景。

**请求参数**:
```json
{
  "fromScene": "string",      // 必需，当前场景
  "toScene": "string",        // 必需，目标场景
  "transition": "fade",       // 可选，过渡效果
  "characters": ["string"]     // 可选，移动的角色ID列表
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "sceneName": "string",
    "transition": "string",
    "duration": 1000
  }
}
```

### 8. 系统状态接口

#### 8.1 获取系统状态

**接口地址**: `GET /system/status`

**功能描述**: 获取系统运行状态。

**返回数据**:
```json
{
  "success": true,
  "data": {
    "status": "running",       // 系统状态
    "version": "1.0.0",      // 版本号
    "uptime": 3600,           // 运行时间（秒）
    "activeCharacters": 5,      // 活跃角色数
    "activeUsers": 3,          // 活跃用户数
    "memoryUsage": {           // 内存使用
      "used": 512,
      "total": 2048,
      "unit": "MB"
    },
    "lastUpdate": "string"
  }
}
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 数据格式规范

### 角色对象
```json
{
  "id": "string",              // 唯一标识符
  "name": "string",            // 角色名称
  "role": "string",            // 角色类型
  "position": {
    "x": 50,                 // X坐标（0-100）
    "y": 50                   // Y坐标（0-100）
  },
  "emotion": "string",          // 情绪状态
  "action": "string",          // 当前动作
  "confidence": 0.95           // 置信度
}
```

### 位置对象
```json
{
  "x": 50,                   // X坐标（百分比）
  "y": 50                    // Y坐标（百分比）
}
```

### 对话对象
```json
{
  "id": "string",             // 对话ID
  "speaker": "string",         // 说话者
  "content": "string",         // 内容
  "timestamp": "string"        // 时间戳（ISO 8601）
}
```

## WebSocket 接口

### 连接
```javascript
const socket = new WebSocket('ws://localhost:8080/ws');
```

### 事件类型

#### 角色状态更新
```json
{
  "type": "character_update",
  "data": {
    "characterId": "string",
    "updates": {
      "position": {"x": 50, "y": 50},
      "emotion": "happy"
    }
  }
}
```

#### 新对话
```json
{
  "type": "new_dialogue",
  "data": {
    "characterId": "string",
    "content": "string",
    "timestamp": "string"
  }
}
```

#### 场景变更
```json
{
  "type": "scene_change",
  "data": {
    "fromScene": "string",
    "toScene": "string",
    "transition": "fade"
  }
}
```

## 使用示例

### JavaScript 示例

```javascript
// 分析文本
async function analyzeText(text) {
  const response = await fetch('/api/analyze-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text,
      scene: 'fairy-town-square'
    })
  });
  
  const result = await response.json();
  return result.data;
}

// 移动角色
async function moveCharacter(characterId, x, y) {
  const response = await fetch(`/api/characters/${characterId}/move`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      position: { x, y }
    })
  });
  
  return await response.json();
}

// 生成剧情预测
async function predictPlot(text, characters) {
  const response = await fetch('/api/plot/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text,
      characters: characters,
      currentScene: 'fairy-town-square'
    })
  });
  
  const result = await response.json();
  return result.data.predictions;
}
```

## 注意事项

1. 所有时间戳均使用ISO 8601格式
2. 坐标系统使用百分比（0-100），确保在不同屏幕尺寸下的一致性
3. 所有接口返回的数据都包含`success`字段，表示请求是否成功
4. 错误响应包含`error`对象，包含错误码和错误信息
5. 建议使用WebSocket进行实时状态更新，减少轮询频率
6. 角色ID和场景ID在会话期间保持一致
7. 对话历史建议定期清理，避免数据量过大

## 版本历史

- **v1.0.0** (2024-01-15): 初始版本
  - 基础文本分析
  - 角色管理
  - 对话系统
  - 剧情预测
