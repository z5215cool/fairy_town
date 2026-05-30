/**
 * PerformancePlayer - 完整剧情表演执行器
 * 使用状态机模式管理播放状态，实现视频播放器级别的流畅暂停/继续
 */
class PerformancePlayer {
    constructor(system) {
        this.system = system;
        this.currentSequence = null;      // 表演序列
        this.currentStepIndex = 0;        // 当前步骤索引
        this.isPlaying = false;           // 是否正在播放
        this.isPaused = false;            // 是否暂停
        this.currentStepTimeout = null;   // 当前步骤的超时ID
        this.characterElements = new Map(); // 角色元素缓存
        
        // 当前正在执行的步骤信息（用于暂停时恢复）
        this.activeStep = null;           // 当前活动步骤
        this.stepStartTime = 0;           // 当前步骤开始时间
        this.stepRemainingTime = 0;        // 当前步骤剩余时间
        
        // 移动动画相关 - 使用高精度时间追踪
        this.activeMoveAnimation = null;  // 当前活动的移动动画
        this.moveStartPosition = null;    // 移动开始位置
        this.moveTargetPosition = null;   // 移动目标位置
        this.moveStartTime = 0;           // 移动开始时间（高精度）
        this.moveDuration = 0;            // 移动持续时间
        this.moveProgress = 0;            // 当前移动进度 (0-1)
        
        // 全局时间状态
        this.globalStartTime = 0;         // 表演开始时间
        this.totalElapsedTime = 0;        // 累计已播放时间（不包含暂停时间）
        this.pauseStartTime = 0;          // 暂停开始时间
        this.totalPauseTime = 0;          // 累计暂停时间
    }

    /**
     * 开始执行表演序列
     */
    async play(sequence) {
        if (this.isPlaying) {
            this.stop();
        }

        if (!sequence || sequence.length === 0) {
            console.warn('PerformancePlayer: Empty sequence provided');
            return;
        }

        // 初始化所有状态变量
        this.currentSequence = sequence;
        this.currentStepIndex = 0;
        this.isPlaying = true;
        this.isPaused = false;
        this.activeStep = null;
        this.characterElements.clear();
        
        // 重置时间状态
        this.globalStartTime = performance.now();
        this.totalElapsedTime = 0;
        this.totalPauseTime = 0;
        this.moveProgress = 0;

        console.log(`PerformancePlayer: Starting sequence with ${sequence.length} steps`);
        
        // 开始执行第一个步骤
        await this._executeNextStep();
    }

    /**
     * 停止当前表演
     */
    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentStepIndex = 0;
        this.activeStep = null;
        
        // 清除超时
        if (this.currentStepTimeout) {
            clearTimeout(this.currentStepTimeout);
            this.currentStepTimeout = null;
        }
        
        // 停止移动动画
        this._stopMoveAnimation();
        
        // 清除角色元素缓存
        this.characterElements.clear();
        
        console.log('PerformancePlayer: Stopped current performance');
    }

    /**
     * 暂停当前表演 - 精确保存当前状态，实现视频级流畅暂停
     */
    pause() {
        if (!this.isPlaying || this.isPaused) {
            console.log('PerformancePlayer: Cannot pause - not playing or already paused');
            return;
        }

        this.isPaused = true;
        this.pauseStartTime = performance.now();
        
        // 清除当前步骤的超时
        if (this.currentStepTimeout) {
            clearTimeout(this.currentStepTimeout);
            this.currentStepTimeout = null;
        }
        
        // 精确计算当前步骤剩余时间（使用高精度时间）
        if (this.activeStep && this.stepStartTime) {
            const elapsed = performance.now() - this.stepStartTime;
            this.stepRemainingTime = Math.max(0, this.activeStep.duration - elapsed);
            console.log(`PerformancePlayer: Step remaining time: ${this.stepRemainingTime.toFixed(2)}ms`);
        }
        
        // 更新全局已播放时间
        this.totalElapsedTime = performance.now() - this.globalStartTime - this.totalPauseTime;
        
        // 暂停移动动画（精确保存当前进度）
        this._pauseMoveAnimation();
        
        // 暂停CSS动画
        this._pauseCSSAnimations();
        
        console.log(`PerformancePlayer: Paused at step ${this.currentStepIndex + 1}, elapsed: ${this.totalElapsedTime.toFixed(2)}ms`);
        this._notifyStateChange('paused');
    }

    /**
     * 继续暂停的表演 - 从暂停点精确恢复，实现视频级流畅继续
     */
    resume() {
        if (!this.isPlaying || !this.isPaused) {
            console.log('PerformancePlayer: Cannot resume - not paused');
            return;
        }

        // 更新暂停时间
        const pauseDuration = performance.now() - this.pauseStartTime;
        this.totalPauseTime += pauseDuration;
        this.isPaused = false;
        
        console.log(`PerformancePlayer: Resuming after pause of ${pauseDuration.toFixed(2)}ms`);
        
        // 恢复CSS动画
        this._resumeCSSAnimations();
        
        // 如果有活动步骤且还有剩余时间，继续执行该步骤
        if (this.activeStep && this.stepRemainingTime > 0) {
            // 重新设置步骤开始时间为当前时间
            this.stepStartTime = performance.now();
            this._continueCurrentStep();
        } else {
            // 否则执行下一个步骤
            this._executeNextStep();
        }
        
        console.log(`PerformancePlayer: Resumed at step ${this.currentStepIndex + 1}, total elapsed: ${this.totalElapsedTime.toFixed(2)}ms`);
        this._notifyStateChange('resumed');
    }

    /**
     * 执行下一个步骤
     */
    async _executeNextStep() {
        if (!this.isPlaying || this.isPaused) {
            return;
        }
        
        if (this.currentStepIndex >= this.currentSequence.length) {
            // 表演完成
            this.isPlaying = false;
            console.log('PerformancePlayer: Sequence completed');
            this._onSequenceComplete();
            return;
        }
        
        const step = this.currentSequence[this.currentStepIndex];
        this.activeStep = step;
        this.stepStartTime = Date.now();
        this.stepRemainingTime = step.duration;
        
        console.log(`PerformancePlayer: Executing step ${this.currentStepIndex + 1}/${this.currentSequence.length} - ${step.type}`);
        
        try {
            await this._executeStep(step);
        } catch (error) {
            console.error(`PerformancePlayer: Error executing step ${this.currentStepIndex + 1}:`, error);
        }
        
        // 步骤执行完成，进入下一个步骤
        if (this.isPlaying && !this.isPaused) {
            this.currentStepIndex++;
            this.activeStep = null;
            this._executeNextStep();
        }
    }

    /**
     * 继续当前步骤（恢复时使用）- 实现视频级流畅恢复
     */
    _continueCurrentStep() {
        if (!this.activeStep || !this.isPlaying || this.isPaused) {
            return;
        }
        
        console.log(`PerformancePlayer: Continuing step with ${this.stepRemainingTime.toFixed(2)}ms remaining`);
        
        // 根据步骤类型继续执行
        switch (this.activeStep.type) {
            case 'narrative_display':
                // 旁白继续显示剩余时间
                this._scheduleStepCompletion(this.stepRemainingTime);
                break;
                
            case 'character_move':
                // 继续移动动画（从暂停点精确恢复）
                this._resumeMoveAnimation();
                break;
                
            case 'dialogue_display':
                // 对话继续显示剩余时间
                this._scheduleStepCompletion(this.stepRemainingTime);
                break;
                
            case 'character_emotion':
                // 表情变化继续
                this._scheduleStepCompletion(this.stepRemainingTime);
                break;
        }
    }

    /**
     * 安排步骤完成
     */
    _scheduleStepCompletion(duration) {
        this.currentStepTimeout = setTimeout(() => {
            if (this.isPlaying && !this.isPaused) {
                this.currentStepIndex++;
                this.activeStep = null;
                this._executeNextStep();
            }
        }, duration);
    }

    /**
     * 执行单个表演步骤
     */
    async _executeStep(step) {
        switch (step.type) {
            case 'narrative_display':
                await this._displayNarrative(step);
                break;
                
            case 'character_move':
                await this._moveCharacter(step);
                break;
                
            case 'character_emotion':
                await this._changeCharacterEmotion(step);
                break;
                
            case 'dialogue_display':
                await this._displayDialogue(step);
                break;
                
            default:
                console.warn(`PerformancePlayer: Unknown step type: ${step.type}`);
                break;
        }
    }

    /**
     * 显示旁白
     */
    async _displayNarrative(step) {
        const narrativePanel = document.getElementById('narrative-panel') || 
                              this._createNarrativePanel();
        
        // 添加动画效果
        narrativePanel.style.opacity = '0';
        narrativePanel.textContent = step.content;
        narrativePanel.style.display = 'block';
        
        // 淡入效果
        await this._animateElement(narrativePanel, { opacity: 1 }, 300);
        
        // 等待显示时间（可被暂停中断）
        await this._waitWithPause(step.duration - 300);
        
        // 淡出效果（如果不是最后一个步骤且没有暂停）
        if (this.isPlaying && !this.isPaused && this.currentStepIndex < this.currentSequence.length - 1) {
            await this._animateElement(narrativePanel, { opacity: 0 }, 300);
            narrativePanel.style.display = 'none';
        }
    }

    /**
     * 移动角色（使用 requestAnimationFrame 实现可暂停的平滑移动）
     * 禁止斜向移动：将斜向移动分解为先 X 轴后 Y 轴的两个步骤
     */
    async _moveCharacter(step) {
        console.log(`PerformancePlayer: Moving character "${step.character}" to position`, step.target_position);
        
        const characterElement = this._getOrCreateCharacterElement(step.character);
        if (!characterElement) {
            console.warn(`PerformancePlayer: Character element not found for ${step.character}`);
            return;
        }

        const targetPosition = step.target_position;
        if (!targetPosition || typeof targetPosition.x !== 'number' || typeof targetPosition.y !== 'number') {
            console.warn('PerformancePlayer: Invalid target position', targetPosition);
            return;
        }

        // 获取当前位置
        const startPosition = {
            x: parseFloat(characterElement.style.left) || 50,
            y: parseFloat(characterElement.style.top) || 50
        };
        
        // 检查是否为斜向移动（X 和 Y 都发生变化）
        const isDiagonal = (startPosition.x !== targetPosition.x) && (startPosition.y !== targetPosition.y);
        
        if (isDiagonal) {
            // 将斜向移动分解为两个步骤：先水平移动，再垂直移动
            console.log(`PerformancePlayer: 检测到斜向移动，分解为水平 + 垂直两个步骤`);
            
            // 临时禁用浮动动画
            const originalAnimation = characterElement.style.animation;
            characterElement.style.animation = 'none';
            
            // 确保元素有 position 属性
            const currentPosition = window.getComputedStyle(characterElement).position;
            if (currentPosition !== 'absolute' && currentPosition !== 'fixed') {
                characterElement.style.position = 'absolute';
            }
            
            // 第一步：水平移动（X 轴）
            const intermediatePosition = { x: targetPosition.x, y: startPosition.y };
            await this._animateMove(characterElement, startPosition, intermediatePosition, step.duration / 2, step.easing);
            
            // 第二步：垂直移动（Y 轴）
            await this._animateMove(characterElement, intermediatePosition, targetPosition, step.duration / 2, step.easing);
            
            // 恢复原始动画状态
            characterElement.style.animation = originalAnimation;
            characterElement.style.transition = '';
        } else {
            // 单一方向移动，直接执行
            // 保存原始动画状态
            const originalAnimation = characterElement.style.animation;
            
            // 临时禁用浮动动画
            characterElement.style.animation = 'none';
            
            // 确保元素有 position 属性
            const currentPosition = window.getComputedStyle(characterElement).position;
            if (currentPosition !== 'absolute' && currentPosition !== 'fixed') {
                characterElement.style.position = 'absolute';
            }
            
            // 记录移动信息（用于暂停/恢复）
            this.moveStartPosition = startPosition;
            this.moveTargetPosition = targetPosition;
            this.moveStartTime = Date.now();
            this.moveDuration = step.duration;
            
            console.log(`PerformancePlayer: ${step.character} moving from (${startPosition.x}, ${startPosition.y}) to (${targetPosition.x}, ${targetPosition.y})`);
            
            // 使用 requestAnimationFrame 实现可暂停的移动
            await this._animateMove(characterElement, startPosition, targetPosition, step.duration, step.easing);
            
            // 清除过渡效果
            characterElement.style.transition = '';
        }
        
        console.log(`PerformancePlayer: ${step.character} movement completed`);
    }

    /**
     * 使用requestAnimationFrame实现可暂停的移动动画
     */
    async _animateMove(element, startPos, targetPos, duration, easing = 'ease') {
        return new Promise((resolve) => {
            let animationFrameId = null;
            let startTime = Date.now();
            
            // 保存动画ID用于暂停
            this.activeMoveAnimation = {
                animationFrameId,
                element,
                startPos,
                targetPos,
                duration,
                startTime
            };
            
            const easeFunctions = {
                'ease': t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
                'ease-in': t => t * t,
                'ease-out': t => t * (2 - t),
                'ease-in-out': t => t < 0.5 ? 4 * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
                'linear': t => t
            };
            
            const easeFn = easeFunctions[easing] || easeFunctions['ease'];
            
            const animate = () => {
                if (!this.isPlaying || this.isPaused) {
                    // 暂停时停止动画，但不resolve
                    return;
                }
                
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easeFn(progress);
                
                const currentX = startPos.x + (targetPos.x - startPos.x) * easedProgress;
                const currentY = startPos.y + (targetPos.y - startPos.y) * easedProgress;
                
                element.style.left = `${currentX}%`;
                element.style.top = `${currentY}%`;
                
                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(animate);
                    this.activeMoveAnimation.animationFrameId = animationFrameId;
                } else {
                    this.activeMoveAnimation = null;
                    resolve();
                }
            };
            
            animationFrameId = requestAnimationFrame(animate);
            this.activeMoveAnimation.animationFrameId = animationFrameId;
        });
    }

    /**
     * 暂停移动动画 - 精确保存当前进度
     */
    _pauseMoveAnimation() {
        if (this.activeMoveAnimation) {
            if (this.activeMoveAnimation.animationFrameId) {
                cancelAnimationFrame(this.activeMoveAnimation.animationFrameId);
            }
            
            // 使用高精度时间计算已过去的时间
            const elapsed = performance.now() - this.activeMoveAnimation.startTime;
            
            // 精确计算当前进度 (0-1)
            this.moveProgress = Math.min(1, elapsed / this.activeMoveAnimation.duration);
            
            // 更新剩余时间
            this.stepRemainingTime = Math.max(0, this.activeMoveAnimation.duration - elapsed);
            
            console.log(`PerformancePlayer: Move animation paused, progress: ${(this.moveProgress * 100).toFixed(1)}%, remaining: ${this.stepRemainingTime.toFixed(2)}ms`);
        }
    }

    /**
     * 恢复移动动画 - 从暂停点精确继续，实现视频级流畅恢复
     */
    _resumeMoveAnimation() {
        if (this.activeMoveAnimation && this.stepRemainingTime > 0 && this.moveProgress < 1) {
            const { element, startPos, targetPos } = this.activeMoveAnimation;
            
            // 获取当前位置（角色停在的位置）
            const currentPos = {
                x: parseFloat(element.style.left) || startPos.x,
                y: parseFloat(element.style.top) || startPos.y
            };
            
            // 重新开始动画，从当前位置到目标位置，使用剩余时间
            this.moveStartPosition = currentPos;
            this.moveStartTime = performance.now();
            this.moveDuration = this.stepRemainingTime;
            
            console.log(`PerformancePlayer: Resuming move animation from progress: ${(this.moveProgress * 100).toFixed(1)}%`);
            
            // 重新启动动画
            this._animateMove(element, currentPos, targetPos, this.stepRemainingTime);
        }
    }

    /**
     * 停止移动动画
     */
    _stopMoveAnimation() {
        if (this.activeMoveAnimation) {
            if (this.activeMoveAnimation.animationFrameId) {
                cancelAnimationFrame(this.activeMoveAnimation.animationFrameId);
            }
            this.activeMoveAnimation = null;
        }
    }

    /**
     * 暂停CSS动画
     */
    _pauseCSSAnimations() {
        document.querySelectorAll('.scene-character').forEach(element => {
            element.style.animationPlayState = 'paused';
            element.style.transition = 'none';
        });
        
        document.querySelectorAll('.dialogue-bubble').forEach(element => {
            element.style.animationPlayState = 'paused';
        });
        
        const narrativePanel = document.getElementById('narrative-panel');
        if (narrativePanel) {
            narrativePanel.style.animationPlayState = 'paused';
        }
    }

    /**
     * 恢复CSS动画
     */
    _resumeCSSAnimations() {
        document.querySelectorAll('.scene-character').forEach(element => {
            element.style.animationPlayState = 'running';
        });
        
        document.querySelectorAll('.dialogue-bubble').forEach(element => {
            element.style.animationPlayState = 'running';
        });
        
        const narrativePanel = document.getElementById('narrative-panel');
        if (narrativePanel) {
            narrativePanel.style.animationPlayState = 'running';
        }
    }

    /**
     * 改变角色表情
     */
    async _changeCharacterEmotion(step) {
        const characterElement = this._getOrCreateCharacterElement(step.character);
        if (!characterElement) {
            console.warn(`PerformancePlayer: Character element not found for ${step.character}`);
            return;
        }

        // 移除旧的表情类
        const oldEmotion = characterElement.getAttribute('data-emotion') || 'neutral';
        characterElement.classList.remove(`emotion-${oldEmotion}`);
        
        // 添加新的表情类
        characterElement.classList.add(`emotion-${step.emotion}`);
        characterElement.setAttribute('data-emotion', step.emotion);

        // 触发动画
        characterElement.style.animation = `${step.animation} ${step.duration}ms forwards`;
        
        await this._waitWithPause(step.duration);
        
        // 清除动画
        characterElement.style.animation = '';
    }

    /**
     * 显示对话
     */
    async _displayDialogue(step) {
        const bubblesContainer = document.getElementById('dialogue-bubbles');
        if (!bubblesContainer) {
            console.warn('PerformancePlayer: dialogue-bubbles container not found');
            return;
        }

        // 移除该说话者已有的气泡（如果存在）
        const existingBubble = bubblesContainer.querySelector(`[data-speaker="${step.speaker}"]`);
        if (existingBubble) {
            existingBubble.remove();
        }

        // 获取说话者的初始位置
        let leftPos = '50%';
        let topPos = '30%';
        
        if (this.system && this.system.characters) {
            const character = this.system.characters.find(c => c.name === step.speaker);
            if (character && character.position) {
                leftPos = `${character.position.x}%`;
                topPos = `${character.position.y - 15}%`;
            }
        }

        // 创建新的气泡元素
        const bubble = document.createElement('div');
        bubble.className = `dialogue-bubble emotion-${step.emotion}`;
        bubble.dataset.speaker = step.speaker;
        bubble.dataset.characterName = step.speaker;
        
        // 创建说话者标签和内容
        const speakerElement = document.createElement('div');
        speakerElement.className = 'bubble-speaker';
        speakerElement.textContent = step.speaker;
        
        const contentElement = document.createElement('div');
        contentElement.className = 'bubble-content';
        contentElement.textContent = step.text;
        
        bubble.appendChild(speakerElement);
        bubble.appendChild(contentElement);

        // 设置气泡初始位置
        bubble.style.left = leftPos;
        bubble.style.top = topPos;
        bubble.style.position = 'absolute';
        
        bubblesContainer.appendChild(bubble);

        // 淡入动画
        bubble.style.opacity = '0';
        bubble.style.transform = 'translateY(10px)';
        
        await this._animateElement(bubble, { 
            opacity: 1, 
            transform: 'translateY(0)' 
        }, 300);

        // 开始跟随人物移动的动画循环
        const moveBubbleWithCharacter = () => {
            if (!this.isPlaying || this.isPaused) {
                return;
            }

            const character = this.system && this.system.characters 
                ? this.system.characters.find(c => c.name === step.speaker)
                : null;
            
            if (character && character.position) {
                const targetLeft = `${character.position.x}%`;
                const targetTop = `${character.position.y - 15}%`;
                
                bubble.style.left = targetLeft;
                bubble.style.top = targetTop;
            }

            if (this.isPlaying && !this.isPaused) {
                requestAnimationFrame(moveBubbleWithCharacter);
            }
        };

        // 启动跟随动画循环
        moveBubbleWithCharacter();

        // 等待对话显示时间（可被暂停中断）
        await this._waitWithPause(step.duration - 300);

        // 淡出动画（如果没有暂停）
        if (this.isPlaying && !this.isPaused) {
            await this._animateElement(bubble, { 
                opacity: 0, 
                transform: 'translateY(-10px)' 
            }, 300);
            
            bubble.remove();
        }
    }

    /**
     * 可暂停的等待 - 使用高精度时间，实现视频级精确等待
     */
    _waitWithPause(ms) {
        return new Promise((resolve) => {
            const startTime = performance.now();
            let elapsed = 0;
            let lastPauseTime = 0;
            let accumulatedPauseTime = 0;
            
            const checkPause = () => {
                if (!this.isPlaying) {
                    // 停止播放
                    resolve();
                    return;
                }
                
                if (this.isPaused) {
                    // 记录暂停开始时间
                    if (!lastPauseTime) {
                        lastPauseTime = performance.now();
                    }
                    // 暂停中，使用requestAnimationFrame提高响应速度
                    requestAnimationFrame(checkPause);
                    return;
                }
                
                // 如果刚从暂停恢复，计算暂停时长并累加
                if (lastPauseTime) {
                    accumulatedPauseTime += performance.now() - lastPauseTime;
                    lastPauseTime = 0;
                }
                
                // 使用高精度时间计算已流逝时间（减去暂停时间）
                elapsed = performance.now() - startTime - accumulatedPauseTime;
                
                if (elapsed >= ms) {
                    resolve();
                } else {
                    setTimeout(checkPause, 50);
                }
            };
            
            checkPause();
        });
    }

    /**
     * 获取或创建角色元素
     */
    _getOrCreateCharacterElement(characterName) {
        if (this.characterElements.has(characterName)) {
            return this.characterElements.get(characterName);
        }

        let element = null;
        
        // 尝试从系统角色列表找到对应的ID
        if (this.system && this.system.characters) {
            const character = this.system.characters.find(c => c.name === characterName);
            if (character && character.id) {
                const sceneCanvas = document.getElementById('scene-canvas');
                if (sceneCanvas) {
                    element = sceneCanvas.querySelector(`[data-character-id="${character.id}"]`);
                } else {
                    element = document.querySelector(`[data-character-id="${character.id}"]`);
                }
            }
        }
        
        // 如果方法1失败，直接查找角色元素
        if (!element) {
            const charactersContainer = document.getElementById('characters-container');
            if (charactersContainer) {
                const allCharacters = charactersContainer.querySelectorAll('.scene-character');
                for (let char of allCharacters) {
                    const nameTag = char.querySelector('.character-name-tag');
                    if (nameTag && nameTag.textContent === characterName) {
                        element = char;
                        break;
                    }
                }
            }
        }
        
        // 创建新的角色元素（后备方案）
        if (!element) {
            element = document.createElement('div');
            element.className = 'scene-character';
            element.setAttribute('data-character', characterName);
            
            element.innerHTML = `
                <div class="character-body">
                    <span class="icon icon-user-circle"></span>
                </div>
                <div class="character-name-tag">${characterName}</div>
            `;
            
            element.style.position = 'absolute';
            element.style.left = '50%';
            element.style.top = '50%';
            element.style.transform = 'translate(-50%, -50%)';
            
            const charactersContainer = document.getElementById('characters-container') || 
                                      document.getElementById('scene-canvas') || 
                                      document.body;
            charactersContainer.appendChild(element);
        }

        this.characterElements.set(characterName, element);
        return element;
    }

    /**
     * 创建旁白面板
     */
    _createNarrativePanel() {
        let panel = document.createElement('div');
        panel.id = 'narrative-panel';
        panel.className = 'narrative-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            max-width: 80%;
            text-align: center;
            font-size: 16px;
            z-index: 1000;
            display: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(panel);
        return panel;
    }

    /**
     * 元素动画工具
     */
    async _animateElement(element, styles, duration) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const initialStyles = {};
            
            Object.keys(styles).forEach(prop => {
                initialStyles[prop] = element.style[prop] || getComputedStyle(element)[prop];
            });
            
            const animate = () => {
                if (!this.isPlaying || this.isPaused) {
                    // 暂停时停止动画，但不resolve（保持当前状态）
                    return;
                }
                
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                Object.keys(styles).forEach(prop => {
                    const from = parseFloat(initialStyles[prop]);
                    const to = parseFloat(styles[prop]);
                    if (!isNaN(from) && !isNaN(to)) {
                        element.style[prop] = from + (to - from) * progress;
                    } else {
                        element.style[prop] = styles[prop];
                    }
                });
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            animate();
        });
    }

    /**
     * 通知状态变化
     */
    _notifyStateChange(state) {
        if (typeof this.onStateChange === 'function') {
            this.onStateChange(state);
        }
    }

    /**
     * 序列表演完成回调
     */
    _onSequenceComplete() {
        if (typeof this.onComplete === 'function') {
            this.onComplete();
        }
    }
}