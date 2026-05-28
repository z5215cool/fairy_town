"""
童话镇多智能体系统 - nanobanana图片生成器

职责：
- 调用nanobanana API生成地图背景图片
- 调用nanobanana API生成角色人物图片（透明底）
- 处理异步任务轮询获取结果
"""

import requests
import json
import time
import os
from typing import Dict, Any, Optional, List
from datetime import datetime

# 默认配置
NANOBANANA_API_URL = "https://open.mxapi.org/api/v2/nano-pro"
NANOBANANA_SYNC_URL = "https://open.mxapi.org/images/gemini3pro"
NANOBANANA_BALANCE_URL = "https://open.mxapi.org/api/v1/points/balance"


class NanobananaImageGenerator:
    """
    nanobanana图片生成器
    
    功能：
    1. 生成地图背景图片
    2. 生成角色人物图片（支持透明底）
    3. 支持同步和异步两种模式
    """
    
    def __init__(self, api_key: str):
        """
        初始化图片生成器
        
        参数：
        - api_key: nanobanana API密钥
        """
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def get_balance(self) -> Dict[str, Any]:
        """
        查询账户余额
        
        返回：
        - 包含余额信息的字典
        """
        try:
            response = requests.get(NANOBANANA_BALANCE_URL, headers=self.headers)
            response.raise_for_status()
            return {"success": True, **response.json()}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def generate_image_sync(self, prompt: str, image_size: str = "2K", 
                          aspect_ratio: str = "16:9", 
                          reference_images: List[str] = None) -> Dict[str, Any]:
        """
        同步生成图片（使用gemini3pro接口）
        
        参数：
        - prompt: 图片生成提示词
        - image_size: 图片大小，可选 1K、2K、4K
        - aspect_ratio: 宽高比，可选 1:1、3:4、4:3、9:16、16:9
        - reference_images: 参考图URL列表（最多14张）
        
        返回：
        - 包含图片URL的字典
        """
        payload = {
            "prompt": prompt,
            "stream": False,
            "image_size": image_size,
            "aspect_ratio": aspect_ratio
        }
        
        if reference_images:
            payload["reference_images"] = reference_images[:14]  # 最多14张
        
        try:
            response = requests.post(NANOBANANA_SYNC_URL, 
                                   headers=self.headers, 
                                   data=json.dumps(payload))
            response.raise_for_status()
            
            result = response.json()
            
            if "image_url" in result or "url" in result:
                image_url = result.get("image_url") or result.get("url")
                return {
                    "success": True,
                    "image_url": image_url,
                    "prompt": prompt,
                    "image_size": image_size,
                    "aspect_ratio": aspect_ratio
                }
            else:
                return {"success": False, "error": "未返回图片URL", "response": result}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def generate_image_async(self, prompt: str, image_size: str = "2K", 
                           aspect_ratio: str = "16:9", 
                           reference_images: List[str] = None) -> Dict[str, Any]:
        """
        异步生成图片（使用nano-pro接口）
        
        参数：
        - prompt: 图片生成提示词
        - image_size: 图片大小，可选 1K、2K、4K
        - aspect_ratio: 宽高比，可选 1:1、3:4、4:3、9:16、16:9
        - reference_images: 参考图URL列表（最多14张）
        
        返回：
        - 包含task_id的字典，用于后续轮询
        """
        payload = {
            "prompt": prompt,
            "stream": False,
            "image_size": image_size,
            "aspect_ratio": aspect_ratio
        }
        
        if reference_images:
            payload["reference_images"] = reference_images[:14]  # 最多14张
        
        try:
            response = requests.post(NANOBANANA_API_URL, 
                                   headers=self.headers, 
                                   data=json.dumps(payload))
            response.raise_for_status()
            
            result = response.json()
            
            if "task_id" in result:
                return {
                    "success": True,
                    "task_id": result["task_id"],
                    "prompt": prompt,
                    "message": "任务已提交，请轮询获取结果"
                }
            else:
                return {"success": False, "error": "未返回task_id", "response": result}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def check_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        轮询查询异步任务状态
        
        参数：
        - task_id: 任务ID
        
        返回：
        - 任务状态和结果
        """
        try:
            # 假设查询接口是GET /api/v2/nano-pro/{task_id}
            # 如果实际接口不同，需要根据文档调整
            check_url = f"{NANOBANANA_API_URL}/{task_id}"
            response = requests.get(check_url, headers=self.headers)
            response.raise_for_status()
            
            result = response.json()
            
            # 假设返回状态字段
            status = result.get("status", "unknown")
            
            if status == "completed" or status == "success":
                image_url = result.get("image_url") or result.get("url")
                return {
                    "success": True,
                    "status": "completed",
                    "image_url": image_url,
                    "task_id": task_id
                }
            elif status == "failed" or status == "error":
                return {
                    "success": False,
                    "status": "failed",
                    "error": result.get("error", "未知错误"),
                    "task_id": task_id
                }
            else:
                return {
                    "success": True,
                    "status": "pending",
                    "progress": result.get("progress", 0),
                    "task_id": task_id
                }
                
        except Exception as e:
            return {"success": False, "error": str(e), "task_id": task_id}
    
    def generate_and_wait(self, prompt: str, image_size: str = "2K", 
                         aspect_ratio: str = "16:9", 
                         reference_images: List[str] = None,
                         timeout: int = 300) -> Dict[str, Any]:
        """
        生成图片并等待结果（异步方式但阻塞等待）
        
        参数：
        - prompt: 图片生成提示词
        - image_size: 图片大小
        - aspect_ratio: 宽高比
        - reference_images: 参考图列表
        - timeout: 超时时间（秒）
        
        返回：
        - 包含图片URL的字典
        """
        # 提交异步任务
        task_result = self.generate_image_async(prompt, image_size, aspect_ratio, reference_images)
        
        if not task_result["success"]:
            return task_result
        
        task_id = task_result["task_id"]
        start_time = time.time()
        
        # 轮询等待结果
        while time.time() - start_time < timeout:
            status_result = self.check_task_status(task_id)
            
            if not status_result["success"]:
                return status_result
            
            status = status_result["status"]
            
            if status == "completed":
                return status_result
            elif status == "failed":
                return {"success": False, "error": status_result.get("error", "任务失败")}
            
            # 等待2秒后继续轮询
            time.sleep(2)
        
        return {"success": False, "error": "超时"}
    
    def generate_map_image(self, prompt: str, image_size: str = "2K", 
                         aspect_ratio: str = "16:9") -> Dict[str, Any]:
        """
        生成地图背景图片（使用同步接口）
        
        参数：
        - prompt: 地图提示词
        - image_size: 图片大小
        - aspect_ratio: 宽高比
        
        返回：
        - 包含图片URL的字典
        """
        return self.generate_image_sync(prompt, image_size, aspect_ratio)
    
    def generate_character_image(self, prompt: str, image_size: str = "2K", 
                               aspect_ratio: str = "3:4") -> Dict[str, Any]:
        """
        生成角色人物图片（透明底，使用同步接口）
        
        参数：
        - prompt: 角色提示词（应包含transparent background）
        - image_size: 图片大小
        - aspect_ratio: 宽高比（默认3:4适合人物肖像）
        
        返回：
        - 包含图片URL的字典
        """
        return self.generate_image_sync(prompt, image_size, aspect_ratio)


# ==================== 便捷函数 ====================

def create_image_generator(api_key: str) -> NanobananaImageGenerator:
    """创建图片生成器实例"""
    return NanobananaImageGenerator(api_key)


def generate_map_image(api_key: str, prompt: str, image_size: str = "2K", 
                      aspect_ratio: str = "16:9") -> Dict[str, Any]:
    """便捷函数：生成地图图片"""
    generator = NanobananaImageGenerator(api_key)
    return generator.generate_map_image(prompt, image_size, aspect_ratio)


def generate_character_image(api_key: str, prompt: str, image_size: str = "2K", 
                            aspect_ratio: str = "3:4") -> Dict[str, Any]:
    """便捷函数：生成角色图片"""
    generator = NanobananaImageGenerator(api_key)
    return generator.generate_character_image(prompt, image_size, aspect_ratio)
