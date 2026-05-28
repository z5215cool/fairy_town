// 童话镇多智能体系统 - 前端实现

class FairyTownSystem {
    constructor() {
        this.characters = [];
        this.selectedCharacter = null;
        this.currentScene = 'fairy-town-square';
        this.settings = {
            theme: 'fairy',
            animation: true,
            sound: false,
            autosave: true
        };
        this.dialogueState = {
            isPaused: false,
            speed: 1000,
            pendingResponses: []
        };
        this.apiEndpoints = {
            analyzeText: '/api/analyze-text',
            getCharacterState: '/api/characters/:id/state',
            updateCharacterState: '/api/characters/:id/state',
            predictPlot: '/api/plot/predict',
            sendDialogue: '/api/dialogue/send',
            // 图片提示词生成
            generateMapPrompt: '/api/image-prompts/generate-map',
            generateCharacterPrompt: '/api/image-prompts/generate-character',
            generateAllPrompts: '/api/image-prompts/generate-all',
            // 图片生成
            generateMapImage: '/api/images/generate-map',
            generateCharacterImage: '/api/images/generate-character',
            generateAllImages: '/api/images/generate-all',
            checkBalance: '/api/images/check-balance',
            // 素材管理
            saveMapAsset: '/api/assets/save-map',
            saveCharacterAsset: '/api/assets/save-character',
            saveAllAssets: '/api/assets/save-all',
            listMapAssets: '/api/assets/list-maps',
            listCharacterAssets: '/api/assets/list-characters',
            deleteAsset: '/api/assets/delete'
        };

        // 新增：图片生成配置
        this.imageConfig = {
            apiKey: '', // nanobanana API密钥，需要用户配置
            imageSize: '2K',
            mapAspectRatio: '16:9',
            characterAspectRatio: '3:4'
        };

        // 新增：素材缓存
        this.assets = {
            maps: [],
            characters: []
        };

        // 新增：表演执行器
        this.performancePlayer = null;

        this.movementBounds = {
            minX: 5,
            maxX: 95,
            minY: 10,
            maxY: 85
        };
        this.interactionPanelBounds = {
            minWidth: 300,
            minHeight: 200,
            defaultWidth: 600,
            defaultHeight: 500,
            padding: 20,
            edgeSize: 10
        };
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.movementController = new MovementController(this);
        // 初始化表演执行器
        this.performancePlayer = new PerformancePlayer(this);
        // 初始时不加载角色，等用户输入故事后分析生成
        // this.loadSampleCharacters();
        this.updateSystemStatus();
        this.startAutoSave();
    }

    // 设置管理
    loadSettings() {
        const savedSettings = localStorage.getItem('fairyTownSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            this.applySettings();
        }
    }

    saveSettings() {
        localStorage.setItem('fairyTownSettings', JSON.stringify(this.settings));
    }

    applySettings() {
        document.documentElement.setAttribute('data-theme', this.settings.theme);
    }

    // 事件监听器设置
    setupEventListeners() {
        // 新故事按钮
        document.getElementById('new-story-btn').addEventListener('click', () => {
            this.createNewStory();
        });

        // 设置按钮
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.openSettingsModal();
        });

        // 分析文本按钮
        document.getElementById('analyze-text').addEventListener('click', () => {
            this.analyzeStoryText();
        });

        // 加载示例按钮
        document.getElementById('load-sample').addEventListener('click', () => {
            this.loadSampleStory();
        });

        // 生成预测按钮
        document.getElementById('generate-prediction').addEventListener('click', () => {
            this.generatePlotPrediction();
        });

        // 发送对话按钮
        document.getElementById('send-dialogue').addEventListener('click', () => {
            this.sendDialogue();
        });

        // 表演暂停/继续按钮
        document.getElementById('pause-performance').addEventListener('click', () => {
            this.pausePerformance();
        });

        document.getElementById('resume-performance').addEventListener('click', () => {
            this.resumePerformance();
        });

        // 对话暂停/继续按钮
        document.getElementById('pause-dialogue').addEventListener('click', () => {
            this.pauseDialogue();
        });

        document.getElementById('continue-dialogue').addEventListener('click', () => {
            this.continueDialogue();
        });

        // 对话速度控制
        document.getElementById('dialogue-speed').addEventListener('change', (e) => {
            this.dialogueState.speed = parseInt(e.target.value);
        });

        // 模态框关闭按钮
        document.getElementById('close-settings').addEventListener('click', () => {
            this.closeModal('settings-modal');
        });

        document.getElementById('cancel-settings').addEventListener('click', () => {
            this.closeModal('settings-modal');
        });

        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveModalSettings();
        });

        // 余额查询按钮
        document.getElementById('check-balance-btn').addEventListener('click', async () => {
            const result = await this.checkImageBalance();
            const balanceDisplay = document.getElementById('balance-display');
            if (result.success) {
                balanceDisplay.textContent = `余额: ${JSON.stringify(result.balance)}`;
                balanceDisplay.style.color = '#10b981';
            } else {
                balanceDisplay.textContent = `错误: ${result.error}`;
                balanceDisplay.style.color = '#ef4444';
            }
        });

        document.getElementById('close-help').addEventListener('click', () => {
            this.closeModal('help-modal');
        });

        document.getElementById('close-prediction').addEventListener('click', () => {
            this.closePanel('prediction-panel');
        });

        document.getElementById('close-interaction').addEventListener('click', () => {
            this.closePanel('interaction-panel');
        });

        // 帮助和关于按钮
        document.getElementById('help-btn').addEventListener('click', () => {
            this.openModal('help-modal');
        });

        document.getElementById('about-btn').addEventListener('click', () => {
            this.showAbout();
        });

        document.getElementById('animation-toggle').addEventListener('change', (e) => {
            this.settings.animation = e.target.checked;
        });

        document.getElementById('sound-toggle').addEventListener('change', (e) => {
            this.settings.sound = e.target.checked;
        });

        document.getElementById('autosave-toggle').addEventListener('change', (e) => {
            this.settings.autosave = e.target.checked;
        });

        // 交互面板拖拽和缩放
        this.initInteractionPanelControls();

        window.addEventListener('resize', () => {
            this.ensureInteractionPanelInViewport();
        });

        // 键盘事件
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }

    // 获取视口尺寸
    getViewportSize() {
        const docEl = document.documentElement || {};
        return {
            width: Math.max(docEl.clientWidth || 0, window.innerWidth || 0),
            height: Math.max(docEl.clientHeight || 0, window.innerHeight || 0)
        };
    }

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    getInteractionPanelRect() {
        const panel = document.getElementById('interaction-panel');
        const rect = panel.getBoundingClientRect();
        const fallbackWidth = parseFloat(panel.style.width) || this.interactionPanelBounds.defaultWidth;
        const fallbackHeight = parseFloat(panel.style.height) || this.interactionPanelBounds.defaultHeight;

        return {
            left: Number.isFinite(rect.left) ? rect.left : 0,
            top: Number.isFinite(rect.top) ? rect.top : 0,
            width: rect.width || fallbackWidth,
            height: rect.height || fallbackHeight
        };
    }

    getInteractionResizeDirection(e, panelRect) {
        const edgeSize = this.interactionPanelBounds.edgeSize;
        const onLeft = e.clientX >= panelRect.left && e.clientX <= panelRect.left + edgeSize;
        const onRight = e.clientX <= panelRect.left + panelRect.width && e.clientX >= panelRect.left + panelRect.width - edgeSize;
        const onTop = e.clientY >= panelRect.top && e.clientY <= panelRect.top + edgeSize;
        const onBottom = e.clientY <= panelRect.top + panelRect.height && e.clientY >= panelRect.top + panelRect.height - edgeSize;

        if (onTop && onLeft) return 'nw';
        if (onTop && onRight) return 'ne';
        if (onBottom && onLeft) return 'sw';
        if (onBottom && onRight) return 'se';
        if (onTop) return 'n';
        if (onBottom) return 's';
        if (onLeft) return 'w';
        if (onRight) return 'e';
        return '';
    }

    getResizedInteractionPanelRect(initialRect, direction, dx, dy) {
        const viewport = this.getViewportSize();
        const nextRect = { ...initialRect };

        if (direction.includes('e')) {
            nextRect.width = this.clamp(
                initialRect.width + dx,
                this.interactionPanelBounds.minWidth,
                viewport.width - initialRect.left
            );
        }

        if (direction.includes('s')) {
            nextRect.height = this.clamp(
                initialRect.height + dy,
                this.interactionPanelBounds.minHeight,
                viewport.height - initialRect.top
            );
        }

        if (direction.includes('w')) {
            const maxLeft = initialRect.left + initialRect.width - this.interactionPanelBounds.minWidth;
            nextRect.left = this.clamp(initialRect.left + dx, 0, maxLeft);
            nextRect.width = initialRect.width - (nextRect.left - initialRect.left);
        }

        if (direction.includes('n')) {
            const maxTop = initialRect.top + initialRect.height - this.interactionPanelBounds.minHeight;
            nextRect.top = this.clamp(initialRect.top + dy, 0, maxTop);
            nextRect.height = initialRect.height - (nextRect.top - initialRect.top);
        }

        return nextRect;
    }

    normalizeInteractionPanelRect(rect) {
        const viewport = this.getViewportSize();
        const width = this.clamp(
            rect.width,
            this.interactionPanelBounds.minWidth,
            viewport.width
        );
        const height = this.clamp(
            rect.height,
            this.interactionPanelBounds.minHeight,
            viewport.height
        );
        const maxLeft = Math.max(0, viewport.width - width);
        const maxTop = Math.max(0, viewport.height - height);

        return {
            width,
            height,
            left: this.clamp(rect.left, 0, maxLeft),
            top: this.clamp(rect.top, 0, maxTop)
        };
    }

    applyInteractionPanelRect(rect) {
        const panel = document.getElementById('interaction-panel');
        if (!panel) return;

        const normalized = this.normalizeInteractionPanelRect(rect);
        panel.style.bottom = 'auto';
        panel.style.transform = 'none';
        panel.style.margin = '0';
        panel.style.left = `${normalized.left}px`;
        panel.style.top = `${normalized.top}px`;
        panel.style.width = `${normalized.width}px`;
        panel.style.height = `${normalized.height}px`;
    }

    ensureInteractionPanelInViewport() {
        const panel = document.getElementById('interaction-panel');
        if (!panel || panel.style.display === 'none') {
            return;
        }

        this.applyInteractionPanelRect(this.getInteractionPanelRect());
    }

    getDefaultInteractionPanelRect() {
        const viewport = this.getViewportSize();
        const width = Math.min(this.interactionPanelBounds.defaultWidth, viewport.width);
        const height = Math.min(this.interactionPanelBounds.defaultHeight, viewport.height);
        const padding = this.interactionPanelBounds.padding;

        return this.normalizeInteractionPanelRect({
            width,
            height,
            left: Math.max((viewport.width - width) / 2, padding),
            top: Math.max(viewport.height - height - padding, padding)
        });
    }

    initInteractionPanelControls() {
        const panel = document.getElementById('interaction-panel');
        const header = document.getElementById('interaction-header');
        const resizeHandle = document.getElementById('interaction-resize-handle');

        if (!panel || !header || !resizeHandle) return;

        let mode = null;
        let startX = 0;
        let startY = 0;
        let initialRect = null;
        let rafId = null;
        let pendingRect = null;
        let activeResizeDirection = '';

        const updateResizeCursor = (e) => {
            if (mode) return;
            const direction = this.getInteractionResizeDirection(e, this.getInteractionPanelRect());
            if (direction) {
                panel.dataset.resizeDirection = direction;
            } else {
                delete panel.dataset.resizeDirection;
            }
        };

        const scheduleRectUpdate = (nextRect) => {
            pendingRect = nextRect;
            if (rafId) {
                return;
            }

            rafId = requestAnimationFrame(() => {
                this.applyInteractionPanelRect(pendingRect);
                rafId = null;
                pendingRect = null;
            });
        };

        const onMouseMove = (e) => {
            if (!mode || !initialRect) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (mode === 'drag') {
                scheduleRectUpdate({
                    ...initialRect,
                    left: initialRect.left + dx,
                    top: initialRect.top + dy
                });
                return;
            }

            scheduleRectUpdate(
                this.getResizedInteractionPanelRect(initialRect, activeResizeDirection, dx, dy)
            );
        };

        const onMouseUp = () => {
            if (!mode) return;

            mode = null;
            initialRect = null;
            activeResizeDirection = '';
            panel.classList.remove('dragging', 'resizing');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('blur', onMouseUp);

            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }

            if (pendingRect) {
                this.applyInteractionPanelRect(pendingRect);
                pendingRect = null;
            }

            delete panel.dataset.resizeDirection;
        };

        const startInteraction = (nextMode, e, resizeDirection = '') => {
            if (nextMode === 'drag' && e.target.closest('.btn-icon')) {
                return;
            }
            if (nextMode === 'resize' && !resizeDirection) {
                return;
            }

            mode = nextMode;
            activeResizeDirection = resizeDirection;
            startX = e.clientX;
            startY = e.clientY;
            initialRect = this.getInteractionPanelRect();
            this.applyInteractionPanelRect(initialRect);
            panel.classList.toggle('dragging', nextMode === 'drag');
            panel.classList.toggle('resizing', nextMode === 'resize');
            if (resizeDirection) {
                panel.dataset.resizeDirection = resizeDirection;
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            window.addEventListener('blur', onMouseUp);
            e.preventDefault();
        };

        panel.addEventListener('mousemove', updateResizeCursor);
        panel.addEventListener('mouseleave', () => {
            if (!mode) {
                delete panel.dataset.resizeDirection;
            }
        });

        panel.addEventListener('mousedown', (e) => {
            if (e.target.closest('.btn-icon')) {
                return;
            }

            const direction = this.getInteractionResizeDirection(e, this.getInteractionPanelRect());
            if (!direction) {
                return;
            }

            startInteraction('resize', e, direction);
            e.stopPropagation();
        }, true);

        header.addEventListener('mousedown', (e) => {
            startInteraction('drag', e);
        });

        resizeHandle.addEventListener('mousedown', (e) => {
            startInteraction('resize', e, 'se');
        });
    }


    // 故事文本分析
    analyzeStoryText() {
        const text = document.getElementById('story-input').value.trim();

        if (!text) {
            this.showNotification('请输入故事文本', 'warning');
            return;
        }

        this.showSystemMessage('正在分析文本...');

        // 调用后端文本分析接口
        fetch('http://localhost:5000/api/analyze-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                scene: this.currentScene
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('后端返回:', data);  // 调试用
                this.showSystemMessage('后端收到的内容: ' + data.received.text);  // 显示在后端收到的内容
                this.handleAnalysisResult(data);
            } else {
                this.showNotification(data.error || '文本分析失败', 'error');
            }
        })
        .catch(error => {
            console.error('Analysis error:', error);
            // 降级到模拟分析
            this.showSystemMessage('后端连接失败，使用本地分析...');
            const mockResult = this.simulateTextAnalysis(text);
            this.handleAnalysisResult(mockResult);
        });
    }

    // 模拟文本分析（伪代码实现）
    simulateTextAnalysis(text) {
        const characters = [];
        
        // 扩展角色模式以支持中文角色，使用现有图片
        const characterPatterns = [
            { name: '小红帽', role: 'Protagonist', image: 'images/Sam.png', patterns: ['小红帽', 'Little Red'] },
            { name: '大灰狼', role: 'Villain', image: 'images/Isabella.png', patterns: ['大灰狼', 'wolf'] },
            { name: '奶奶', role: 'Supporting', image: 'images/Jennifer.png', patterns: ['奶奶', 'grandma'] },
            { name: '猎人', role: 'Supporting', image: 'images/Tom.png', patterns: ['猎人', 'hunter'] },
            { name: 'Sam', role: 'Protagonist', image: 'images/Sam.png', patterns: ['萨姆', 'Sam'] },
            { name: 'Isabella', role: 'Villain', image: 'images/Isabella.png', patterns: ['伊莎贝拉', 'Isabella'] },
            { name: 'Ayesha', role: 'Supporting', image: 'images/Ayesha.png', patterns: ['艾莎', 'Ayesha'] },
            { name: 'Tom', role: 'Supporting', image: 'images/Tom.png', patterns: ['汤姆', 'Tom'] },
            { name: 'Jennifer', role: 'Supporting', image: 'images/Jennifer.png', patterns: ['詹妮弗', 'Jennifer'] }
        ];

        characterPatterns.forEach(pattern => {
            if (pattern.patterns.some(p => text.includes(p))) {
                characters.push({
                    id: this.generateId(),
                    name: pattern.name,
                    role: pattern.role,
                    image: pattern.image,
                    position: {
                        x: Math.random() * (this.movementBounds.maxX - this.movementBounds.minX) + this.movementBounds.minX,
                        y: Math.random() * (this.movementBounds.maxY - this.movementBounds.minY) + this.movementBounds.minY
                    },
                    emotion: 'neutral',
                    confidence: 0.85 + Math.random() * 0.15
                });
            }
        });

        // 如果没有识别到角色，添加默认角色
        if (characters.length === 0) {
            characters.push({
                id: this.generateId(),
                name: '主角',
                role: 'Protagonist',
                image: 'images/Sam.png',
                position: { x: 50, y: 50 },
                emotion: 'neutral',
                confidence: 0.9
            });
        }

        return {
            success: true,
            characters: characters,
            scene: this.detectScene(text),
            plotPoints: this.extractPlotPoints(text)
        };
    }

    // 检测场景
    detectScene(text) {
        const sceneKeywords = {
            '森林': ['森林', '树林', '树木'],
            '城堡': ['城堡', '宫殿', '王宫'],
            '村庄': ['村庄', '小镇', '村子'],
            '河流': ['河流', '小溪', '水边']
        };

        for (const [scene, keywords] of Object.entries(sceneKeywords)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return scene;
            }
        }
        return '童话镇广场';
    }

    // 提取剧情点
    extractPlotPoints(text) {
        const sentences = text.split(/[。！？]/).filter(s => s.trim());
        return sentences.slice(0, 5).map((sentence, index) => ({
            id: index + 1,
            content: sentence.trim(),
            importance: Math.random()
        }));
    }

    // 处理分析结果
    handleAnalysisResult(result) {
        if (result.success) {
            console.log('处理分析结果:', result); // 详细调试信息
            
            this.characters = result.characters;
            this.currentScene = result.scene;
            
            // 根据故事内容自动切换主题
            const storyText = document.getElementById('story-input').value;
            this.settings.theme = this.detectTheme(storyText);
            this.applySettings();
            this.saveSettings();

            this.updateCharacterList();
            this.updateSceneCharacters();
            this.showSystemMessage(`识别到 ${result.characters.length} 个角色，已切换至${this.getThemeName(this.settings.theme)}`);
            
            // 新增：检查是否有导演输出的表演序列
            if (result.director_output && result.director_output.performance_sequence) {
                console.log('发现表演序列，开始执行完整剧情表演');
                
                // 设置表演状态变化监听
                this.performancePlayer.onStateChange = (state) => {
                    this.updatePerformanceControls(
                        this.performancePlayer.isPlaying,
                        this.performancePlayer.isPaused
                    );
                    if (state === 'paused') {
                        this.showSystemMessage('表演已暂停');
                    } else if (state === 'resumed') {
                        this.showSystemMessage('表演继续');
                    }
                };
                
                // 设置表演完成监听
                this.performancePlayer.onComplete = () => {
                    this.updatePerformanceControls(false, false);
                    this.showSystemMessage('表演已结束');
                };
                
                this.performancePlayer.play(result.director_output.performance_sequence);
                // 显示暂停按钮
                this.updatePerformanceControls(true, false);
            } else if (result.director_output) {
                // 兼容旧版本的director_output
                console.log('使用兼容模式处理旧版director_output');
                this.executeLegacyDirectorOutput(result.director_output);
            }
            
            if (this.settings.autosave) {
                this.saveCurrentState();
            }

            // 自动生成图片素材
            this.autoGenerateImages();
        } else {
            this.showNotification('文本分析失败', 'error');
        }
    }

    // 自动生成图片素材
    autoGenerateImages() {
        const storyText = document.getElementById('story-input').value;
        if (!storyText.trim()) {
            return;
        }

        // 检查是否配置了API密钥
        const apiKey = localStorage.getItem('nanobanana_api_key') || '';
        if (!apiKey.trim()) {
            this.showSystemMessage('未配置图片生成API密钥，跳过图片自动生成');
            return;
        }

        this.showSystemMessage('正在自动生成图片素材...');
        this.generateAndApplyImages(storyText, this.characters).then(result => {
            if (result.success) {
                this.showNotification(`成功生成 ${result.success_count} 个素材`, 'success');
            } else {
                this.showNotification(`图片生成失败: ${result.error}`, 'error');
            }
        });
    }

    // 根据文本内容检测主题
    detectTheme(text) {
        const darkKeywords = ['黑夜', '恐惧', '阴森', '邪恶', '危险', '深夜', '黑暗', '魔王', '深渊', '死亡'];
        const lightKeywords = ['阳光', '明亮', '快乐', '美丽', '希望', '白昼', '天使', '和平', '温暖', '春天'];
        const fairyKeywords = ['童话', '魔法', '奇幻', '神秘', '精灵', '巨龙', '森林', '城堡', '王国'];

        let darkCount = 0;
        let lightCount = 0;
        let fairyCount = 0;

        darkKeywords.forEach(kw => { if (text.includes(kw)) darkCount++; });
        lightKeywords.forEach(kw => { if (text.includes(kw)) lightCount++; });
        fairyKeywords.forEach(kw => { if (text.includes(kw)) fairyCount++; });

        if (darkCount > lightCount && darkCount > fairyCount) return 'dark';
        if (lightCount > darkCount && lightCount > fairyCount) return 'light';
        return 'fairy'; // 默认为童话主题
    }

    // 获取主题名称
    getThemeName(theme) {
        switch (theme) {
            case 'dark': return '暗色主题';
            case 'light': return '亮色主题';
            case 'fairy': return '童话主题';
            default: return '默认主题';
        }
    }

    // 角色图片模板映射表（预设的固定角色图片）
    getCharacterImageTemplate(characterName) {
        // 使用 images 文件夹中现有的图片作为模板
        const imageMap = {
            // 中文角色名映射到现有图片
            '小红帽': 'images/Isabella.png',      // 使用 Isabella 作为小红帽
            '小红': 'images/Isabella.png',
            '奶奶': 'images/Jennifer.png',        // 使用 Jennifer 作为奶奶
            '老太太': 'images/Jennifer.png',
            '外婆': 'images/Jennifer.png',
            '大灰狼': 'images/Wollveng.png',      // 使用 Wollveng 作为大灰狼
            '灰狼': 'images/Wollveng.png',
            '狼': 'images/Wollveng.png',
            '妈妈': 'images/Maria.png',           // 使用 Maria 作为妈妈
            '母亲': 'images/Maria.png',
            '父亲': 'images/Giorgio.png',         // 使用 Giorgio 作为爸爸
            '爸爸': 'images/Giorgio.png',
            '猎人': 'images/Sam.png',             // 使用 Sam 作为猎人
            '王子': 'images/Giorgio.png',
            '公主': 'images/Isabella.png',
            '巫婆': 'images/Latoya.png',          // 使用 Latoya 作为巫婆
            '女巫': 'images/Latoya.png',
            
            // 英文角色名
            'little red riding hood': 'images/Isabella.png',
            'grandmother': 'images/Jennifer.png',
            'wolf': 'images/Wollveng.png',
            'mother': 'images/Maria.png',
            'father': 'images/Giorgio.png',
            'hunter': 'images/Sam.png',
            'prince': 'images/Giorgio.png',
            'princess': 'images/Isabella.png',
            'witch': 'images/Latoya.png',
        };
        
        // 尝试精确匹配
        if (imageMap[characterName]) {
            return imageMap[characterName];
        }
        
        // 尝试模糊匹配（包含关键词）
        const name = characterName.toLowerCase();
        for (const [key, value] of Object.entries(imageMap)) {
            if (name.includes(key) || key.includes(name)) {
                return value;
            }
        }
        
        // 默认返回空（使用默认图标）
        return null;
    }

    // 更新角色列表
    updateCharacterList() {
        const container = document.getElementById('character-list');
        container.innerHTML = '';

        this.characters.forEach(character => {
            const card = this.createCharacterCard(character);
            container.appendChild(card);
        });

        document.getElementById('character-count').textContent = this.characters.length;
    }

    // 创建角色卡片
    createCharacterCard(character) {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.dataset.characterId = character.id;
        
        // 获取角色图片：优先使用后端返回的，其次使用模板图片，最后使用默认图标
        const characterImage = character.image || this.getCharacterImageTemplate(character.name);
        const avatarImg = characterImage 
            ? `<img src="${characterImage}" alt="${character.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">`
            : '';
        const defaultIcon = '<span class="icon icon-user-circle" style="display: none;"></span>';
        
        card.innerHTML = `
            <div class="character-avatar">
                ${avatarImg}
                ${defaultIcon}
            </div>
            <div class="character-info">
                <h3 class="character-name">${character.name}</h3>
                <p class="character-role">${character.role}</p>
            </div>
            <div class="character-actions">
                <button class="btn-icon btn-interact" title="交互">
                    <span class="icon icon-comments"></span>
                </button>
            </div>
        `;

        card.addEventListener('click', () => {
            this.selectCharacter(character);
        });

        card.querySelector('.btn-interact').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openInteractionPanel(character);
        });

        return card;
    }

    // 选择角色
    selectCharacter(character) {
        this.selectedCharacter = character;

        document.querySelectorAll('.character-card').forEach(card => {
            card.classList.remove('active');
        });

        const selectedCard = document.querySelector(`[data-character-id="${character.id}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
        }
    }

    // 获取角色完整信息（从后端）
    async fetchCharacterFromBackend(characterId) {
        try {
            const response = await fetch(`http://localhost:5000/api/characters/${characterId}`);
            const data = await response.json();
            return data.success ? data.character : null;
        } catch (error) {
            console.error('Failed to fetch character:', error);
            return null;
        }
    }

    // 更新场景中的角色
    updateSceneCharacters() {
        const container = document.getElementById('characters-container');
        container.innerHTML = '';

        this.characters.forEach(character => {
            const sceneCharacter = this.createSceneCharacter(character);
            container.appendChild(sceneCharacter);
        });

        document.getElementById('scene-name').textContent = this.currentScene;
    }

    // 创建场景中的角色
    createSceneCharacter(character) {
        const div = document.createElement('div');
        div.className = 'scene-character';
        div.dataset.characterId = character.id;
        div.style.left = `${character.position.x}%`;
        div.style.top = `${character.position.y}%`;
        
        // 获取角色图片：优先使用后端返回的，其次使用模板图片，最后使用默认图标
        const characterImage = character.image || this.getCharacterImageTemplate(character.name);
        const avatarImg = characterImage 
            ? `<img src="${characterImage}" alt="${character.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">`
            : '';
        const defaultIcon = '<span class="icon icon-user-circle" style="display: none; font-size: 2rem; color: #999;"></span>';
        
        div.innerHTML = `
            <div class="character-body">
                ${avatarImg}
                ${defaultIcon}
            </div>
            <div class="character-name-tag">${character.name}</div>
        `;

        div.addEventListener('click', () => {
            this.selectCharacter(character);
            this.openInteractionPanel(character);
        });

        return div;
    }

    // 打开角色交互面板
    openInteractionPanel(character) {
        this.selectedCharacter = character;
        const panel = document.getElementById('interaction-panel');
        
        document.getElementById('selected-character-name').textContent = character.name;
        document.getElementById('selected-character-role').textContent = character.role;
        document.getElementById('dialogue-history').innerHTML = '';
        
        const avatarLarge = panel.querySelector('.character-avatar-large');
        // 获取角色图片：优先使用后端返回的，其次使用模板图片，最后使用默认图标
        const characterImage = character.image || this.getCharacterImageTemplate(character.name);
        if (characterImage) {
            avatarLarge.innerHTML = `<img src="${characterImage}" alt="${character.name}">`;
        } else {
            avatarLarge.innerHTML = '<span class="icon icon-user-circle"></span>';
        }
        
        panel.style.display = 'flex';

        if (!panel.dataset.layoutInitialized) {
            this.applyInteractionPanelRect(this.getDefaultInteractionPanelRect());
            panel.dataset.layoutInitialized = 'true';
        } else {
            this.ensureInteractionPanelInViewport();
        }
    }

    // 暂停对话
    pauseDialogue() {
        this.dialogueState.isPaused = true;
        document.getElementById('pause-dialogue').style.display = 'none';
        document.getElementById('continue-dialogue').style.display = 'inline-flex';
        this.showSystemMessage('对话已暂停');
    }

    // 继续对话
    continueDialogue() {
        this.dialogueState.isPaused = false;
        document.getElementById('pause-dialogue').style.display = 'inline-flex';
        document.getElementById('continue-dialogue').style.display = 'none';
        this.showSystemMessage('对话继续');
        this.processPendingResponses();
    }

    // 暂停表演
    pausePerformance() {
        if (this.performancePlayer) {
            this.performancePlayer.pause();
            document.getElementById('pause-performance').style.display = 'none';
            document.getElementById('resume-performance').style.display = 'inline-flex';
            this.showSystemMessage('表演已暂停');
        }
    }

    // 继续表演
    resumePerformance() {
        if (this.performancePlayer) {
            this.performancePlayer.resume();
            document.getElementById('pause-performance').style.display = 'inline-flex';
            document.getElementById('resume-performance').style.display = 'none';
            this.showSystemMessage('表演继续');
        }
    }

    // 更新表演控制按钮状态
    updatePerformanceControls(isPlaying, isPaused) {
        const pauseBtn = document.getElementById('pause-performance');
        const resumeBtn = document.getElementById('resume-performance');
        
        if (isPlaying && !isPaused) {
            pauseBtn.style.display = 'inline-flex';
            resumeBtn.style.display = 'none';
        } else if (isPlaying && isPaused) {
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'inline-flex';
        } else {
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'none';
        }
    }

    // 处理等待中的回复
    processPendingResponses() {
        if (this.dialogueState.isPaused || this.dialogueState.pendingResponses.length === 0) {
            return;
        }

        const nextResponse = this.dialogueState.pendingResponses.shift();
        if (this.dialogueState.speed === 0) {
            this.addDialogueToHistory('character', nextResponse);
            this.processPendingResponses();
        } else {
            setTimeout(() => {
                this.addDialogueToHistory('character', nextResponse);
                this.processPendingResponses();
            }, this.dialogueState.speed);
        }
    }

    // 发送对话
    sendDialogue() {
        const textarea = document.getElementById('dialogue-textarea');
        const message = textarea.value.trim();

        if (!message || !this.selectedCharacter) {
            if (!this.selectedCharacter) {
                this.showNotification('请先选择一个角色', 'warning');
            }
            return;
        }

        this.addDialogueToHistory('user', message);
        textarea.value = '';

        // 调用后端对话接口
        fetch('http://localhost:5000/api/dialogue/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                characterId: this.selectedCharacter.id,
                characterName: this.selectedCharacter.name,
                message: message
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (this.dialogueState.speed === 0) {
                    this.addDialogueToHistory('character', data.response);
                } else {
                    setTimeout(() => {
                        this.addDialogueToHistory('character', data.response);
                    }, this.dialogueState.speed);
                }
            } else {
                this.showNotification(data.error || '发送失败', 'error');
            }
        })
        .catch(error => {
            console.error('Dialogue error:', error);
            // 降级到模拟响应
            const responses = [
                `我明白了，${message}`,
                "这很有趣！",
                "我同意你的看法。",
                "让我想想...",
                "好的，我知道了。"
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            if (this.dialogueState.speed === 0) {
                this.addDialogueToHistory('character', randomResponse);
            } else {
                setTimeout(() => {
                    this.addDialogueToHistory('character', randomResponse);
                }, this.dialogueState.speed);
            }
        });
    }

    // 添加对话到历史
    addDialogueToHistory(type, message) {
        const history = document.getElementById('dialogue-history');
        const messageDiv = document.createElement('div');
        messageDiv.className = `dialogue-message ${type}`;
        messageDiv.textContent = message;
        history.appendChild(messageDiv);
        history.scrollTop = history.scrollHeight;
    }

    // 生成剧情预测
    generatePlotPrediction() {
        const text = document.getElementById('story-input').value.trim();

        if (!text) {
            this.showNotification('请先输入故事文本', 'warning');
            return;
        }

        this.showSystemMessage('正在生成剧情预测...');

        // 调用后端预测接口
        fetch('http://localhost:5000/api/plot/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                characters: this.characters,
                currentScene: this.currentScene
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.displayPredictions(data.predictions);
            } else {
                this.showNotification(data.error || '预测生成失败', 'error');
            }
        })
        .catch(error => {
            console.error('Prediction error:', error);
            // 降级到模拟预测
            const mockPredictions = this.simulatePlotPrediction();
            this.displayPredictions(mockPredictions);
        });
    }

    // 模拟剧情预测
    simulatePlotPrediction() {
        const predictions = [
            {
                id: 1,
                title: '冒险路线',
                description: '主角踏上冒险旅程，遇到各种挑战和机遇',
                probability: 0.35
            },
            {
                id: 2,
                title: '友谊路线',
                description: '通过合作和友谊解决问题',
                probability: 0.28
            },
            {
                id: 3,
                title: '冲突路线',
                description: '面临内部冲突和外部威胁',
                probability: 0.22
            },
            {
                id: 4,
                title: '成长路线',
                description: '角色在挑战中成长和改变',
                probability: 0.15
            }
        ];

        return predictions.sort((a, b) => b.probability - a.probability);
    }

    // 显示预测结果
    displayPredictions(predictions) {
        const panel = document.getElementById('prediction-panel');
        const container = document.getElementById('prediction-options');
        
        container.innerHTML = '';

        predictions.forEach(prediction => {
            const option = document.createElement('div');
            option.className = 'prediction-option';
            option.innerHTML = `
                <h4>${prediction.title} (${(prediction.probability * 100).toFixed(0)}%)</h4>
                <p>${prediction.description}</p>
            `;
            option.addEventListener('click', () => {
                this.selectPrediction(prediction);
            });
            container.appendChild(option);
        });

        panel.style.display = 'block';
        this.showSystemMessage('剧情预测已生成');
    }

    // 选择预测
    selectPrediction(prediction) {
        this.showSystemMessage(`选择了剧情方向: ${prediction.title}`);
        // 可以在这里添加更多逻辑，比如更新故事文本等
    }

    // 加载示例故事
    loadSampleStory() {
        const sampleStory = `很久很久以前，在一个美丽的童话镇里，住着一个小女孩叫小红帽。有一天，妈妈让小红帽给住在森林深处的奶奶送蛋糕。

小红帽戴着红色的帽子，提着篮子出发了。她穿过村庄，走进了茂密的森林。

在森林里，小红帽遇到了一只大灰狼。大灰狼问她："小姑娘，你要去哪里呀？"

小红帽天真地回答："我要去奶奶家送蛋糕。"

大灰狼眼珠一转，想到了一个坏主意。他让小红帽去采花，自己却抄近路先到了奶奶家。`;

        document.getElementById('story-input').value = sampleStory;
        this.showSystemMessage('示例故事已加载');
    }

    // 创建新故事
    createNewStory() {
        if (confirm('确定要创建新故事吗？当前内容将被清空。')) {
            document.getElementById('story-input').value = '';
            this.characters = [];
            this.updateCharacterList();
            this.updateSceneCharacters();
            this.closePanel('prediction-panel');
            this.closePanel('interaction-panel');
            this.showSystemMessage('新故事已创建');
        }
    }

    // 模态框控制
    openModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    closePanel(panelId) {
        document.getElementById(panelId).style.display = 'none';
    }

    openSettingsModal() {
        this.openModal('settings-modal');
        document.getElementById('animation-toggle').checked = this.settings.animation;
        document.getElementById('sound-toggle').checked = this.settings.sound;
        document.getElementById('autosave-toggle').checked = this.settings.autosave;
        
        // 加载图片生成配置
        const apiKeyInput = document.getElementById('api-key-input');
        const imageSizeSelect = document.getElementById('image-size-select');
        
        if (apiKeyInput) {
            apiKeyInput.value = this.imageConfig.apiKey;
        }
        if (imageSizeSelect) {
            imageSizeSelect.value = this.imageConfig.imageSize;
        }
    }

    saveModalSettings() {
        this.settings.animation = document.getElementById('animation-toggle').checked;
        this.settings.sound = document.getElementById('sound-toggle').checked;
        this.settings.autosave = document.getElementById('autosave-toggle').checked;
        
        // 保存图片生成设置
        const apiKeyInput = document.getElementById('api-key-input');
        const imageSizeSelect = document.getElementById('image-size-select');
        
        if (apiKeyInput) {
            this.imageConfig.apiKey = apiKeyInput.value;
        }
        if (imageSizeSelect) {
            this.imageConfig.imageSize = imageSizeSelect.value;
        }
        
        this.saveSettings();
        this.setImageConfig(this.imageConfig);
        this.applySettings();
        this.closeModal('settings-modal');
        this.showNotification('设置已保存', 'success');
    }

    // 键盘事件处理
    handleKeyboard(e) {
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
            return;
        }
    }

    // 系统状态更新
    updateSystemStatus() {
        document.getElementById('connection-status').innerHTML = `
            <span class="icon icon-circle status-online"></span> 已连接
        `;
        document.getElementById('scene-status').textContent = '就绪';
        this.updateLastUpdateTime();
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN');
        document.getElementById('last-update').textContent = timeString;
    }

    showSystemMessage(message) {
        document.getElementById('system-message').textContent = message;
        this.updateLastUpdateTime();
    }

    // 通知系统
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="icon icon-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></span>
            <span>${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 3000;
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // 自动保存
    startAutoSave() {
        if (this.settings.autosave) {
            setInterval(() => {
                this.saveCurrentState();
            }, 30000); // 每30秒自动保存
        }
    }

    saveCurrentState() {
        const state = {
            characters: this.characters,
            currentScene: this.currentScene,
            storyText: document.getElementById('story-input').value,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('fairyTownState', JSON.stringify(state));
    }

    loadSampleCharacters() {
        this.characters = [
            {
                id: 'char-1',
                name: 'Sam',
                role: 'Protagonist',
                image: 'images/Sam.png',
                position: { x: 15, y: 40 },
                emotion: 'neutral',
                confidence: 0.95
            },
            {
                id: 'char-2',
                name: 'Isabella',
                role: 'Villain',
                image: 'images/Isabella.png',
                position: { x: 50, y: 35 },
                emotion: 'neutral',
                confidence: 0.92
            },
            {
                id: 'char-3',
                name: 'Ayesha',
                role: 'Supporting',
                image: 'images/Ayesha.png',
                position: { x: 85, y: 40 },
                emotion: 'neutral',
                confidence: 0.88
            },
            {
                id: 'char-4',
                name: 'Tom',
                role: 'Supporting',
                image: 'images/Tom.png',
                position: { x: 30, y: 75 },
                emotion: 'neutral',
                confidence: 0.85
            },
            {
                id: 'char-5',
                name: 'Jennifer',
                role: 'Supporting',
                image: 'images/Jennifer.png',
                position: { x: 70, y: 75 },
                emotion: 'neutral',
                confidence: 0.82
            }
        ];
        
        this.updateCharacterList();
        this.updateSceneCharacters();
    }

    // 工具方法
    generateId() {
        return 'id-' + Math.random().toString(36).substr(2, 9);
    }

    // 移动角色（带范围限制，供后端调用）
    moveCharacter(characterId, newX, newY) {
        const character = this.characters.find(c => c.id === characterId);
        if (!character) {
            return { success: false, error: 'Character not found' };
        }

        const clampedX = Math.max(this.movementBounds.minX, Math.min(this.movementBounds.maxX, newX));
        const clampedY = Math.max(this.movementBounds.minY, Math.min(this.movementBounds.maxY, newY));
        
        const wasClamped = clampedX !== newX || clampedY !== newY;
        
        character.position.x = clampedX;
        character.position.y = clampedY;
        
        this.updateSceneCharacterPosition(character);
        
        return {
            success: true,
            clamped: wasClamped,
            position: { x: clampedX, y: clampedY }
        };
    }

    /**
     * 控制角色说话，在场景中显示对话气泡
     * @param {string} characterId 角色ID
     * @param {string} content 说话内容
     * @param {number} duration 气泡显示时长（毫秒），默认为 3000ms
     */
    characterSpeak(characterId, content, duration = 3000) {
        const character = this.characters.find(c => c.id === characterId);
        if (!character) {
            console.error(`[FairyTownSystem] 未找到 ID 为 ${characterId} 的角色`);
            return { success: false, error: 'Character not found' };
        }

        const container = document.getElementById('dialogue-bubbles');
        if (!container) {
            console.error('[FairyTownSystem] 未找到对话气泡容器');
            return { success: false, error: 'Dialogue container not found' };
        }

        // 移除该角色已有的气泡（如果存在）
        const existingBubble = container.querySelector(`[data-character-id="${characterId}"]`);
        if (existingBubble) {
            existingBubble.remove();
        }

        // 创建新的气泡元素
        const bubble = document.createElement('div');
        bubble.className = 'dialogue-bubble';
        bubble.dataset.characterId = characterId;
        bubble.textContent = content;

        // 设置气泡位置（根据角色当前坐标）
        // 这里需要考虑气泡相对于角色的偏移，使其显示在角色上方
        bubble.style.left = `${character.position.x}%`;
        bubble.style.top = `${character.position.y - 10}%`; // 稍微偏上一点

        container.appendChild(bubble);

        // 定时移除气泡
        if (duration > 0) {
            setTimeout(() => {
                if (bubble.parentNode) {
                    bubble.style.opacity = '0';
                    bubble.style.marginTop = '10px';
                    bubble.style.transition = 'all 0.3s ease';
                    setTimeout(() => bubble.remove(), 300);
                }
            }, duration);
        }

        return { success: true };
    }

    // 更新场景中角色的位置
    updateSceneCharacterPosition(character) {
        const sceneCharacter = document.querySelector(`.scene-character[data-character-id="${character.id}"]`);
        if (sceneCharacter) {
            sceneCharacter.style.left = `${character.position.x}%`;
            sceneCharacter.style.top = `${character.position.y}%`;
        }

        // 同时更新对话气泡位置（如果存在）
        const bubble = document.querySelector(`.dialogue-bubble[data-character-id="${character.id}"]`);
        if (bubble) {
            bubble.style.left = `${character.position.x}%`;
            bubble.style.top = `${character.position.y - 10}%`;
        }
    }

    // 设置活动范围（供后端调用）
    setMovementBounds(minX, maxX, minY, maxY) {
        this.movementBounds = { minX, maxX, minY, maxY };
    }

    getDialogueContext() {
        return {
            characters: this.characters,
            scene: this.currentScene,
            recentDialogues: this.getRecentDialogues()
        };
    }

    getRecentDialogues() {
        const history = document.getElementById('dialogue-history');
        return Array.from(history.children).slice(-5).map(msg => msg.textContent);
    }

    showAbout() {
        alert('童话镇多智能体系统 v1.0\n\n一个交互式多智能体系统，支持角色识别、角色扮演、可视化交互及剧情预测功能。');
    }

    // ==================== 图片生成与素材管理 ====================

    // 设置图片生成配置
    setImageConfig(config) {
        this.imageConfig = { ...this.imageConfig, ...config };
        localStorage.setItem('fairyTownImageConfig', JSON.stringify(this.imageConfig));
    }

    loadImageConfig() {
        const saved = localStorage.getItem('fairyTownImageConfig');
        if (saved) {
            this.imageConfig = { ...this.imageConfig, ...JSON.parse(saved) };
        }
    }

    // 生成地图提示词
    async generateMapPrompt(text, sceneName = '') {
        try {
            const response = await fetch('http://localhost:5000' + this.apiEndpoints.generateMapPrompt, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, scene: sceneName })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('生成地图提示词失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 生成角色提示词
    async generateCharacterPrompt(characterInfo, transparent = true) {
        try {
            const response = await fetch('http://localhost:5000' + this.apiEndpoints.generateCharacterPrompt, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ character: characterInfo, transparent })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('生成角色提示词失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 生成地图图片
    async generateMapImage(prompt) {
        if (!this.imageConfig.apiKey) {
            return { success: false, error: '请先配置API密钥' };
        }

        try {
            const response = await fetch('http://localhost:5000' + this.apiEndpoints.generateMapImage, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    api_key: this.imageConfig.apiKey,
                    image_size: this.imageConfig.imageSize,
                    aspect_ratio: this.imageConfig.mapAspectRatio
                })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('生成地图图片失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 生成角色图片
    async generateCharacterImage(prompt) {
        if (!this.imageConfig.apiKey) {
            return { success: false, error: '请先配置API密钥' };
        }

        try {
            const response = await fetch('http://localhost:5000' + this.apiEndpoints.generateCharacterImage, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    api_key: this.imageConfig.apiKey,
                    image_size: this.imageConfig.imageSize,
                    aspect_ratio: this.imageConfig.characterAspectRatio
                })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('生成角色图片失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 保存地图素材
    async saveMapAsset(imageUrl, sceneName) {
        try {
            const response = await fetch('http://localhost:5000' + this.apiEndpoints.saveMapAsset, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_url: imageUrl, scene_name: sceneName })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('保存地图素材失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 保存角色素材
    async saveCharacterAsset(imageUrl, characterName, emotion = 'neutral') {
        try {
            const response = await fetch('http://localhost:5000' + this.apiEndpoints.saveCharacterAsset, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_url: imageUrl,
                    character_name: characterName,
                    emotion
                })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('保存角色素材失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 更新场景背景
    updateSceneBackground(imageUrl) {
        const canvas = document.getElementById('scene-canvas');
        if (canvas) {
            canvas.style.background = `url('${imageUrl}') center center / cover no-repeat`;
        }
    }

    // 更新角色图片
    updateCharacterImage(characterId, imageUrl) {
        // 更新场景中的角色
        const sceneCharacter = document.querySelector(`.scene-character[data-character-id="${characterId}"]`);
        if (sceneCharacter) {
            const img = sceneCharacter.querySelector('img');
            if (img) {
                img.src = imageUrl;
            }
        }

        // 更新角色卡片
        const card = document.querySelector(`[data-character-id="${characterId}"]`);
        if (card) {
            const img = card.querySelector('.character-avatar img');
            if (img) {
                img.src = imageUrl;
            }
        }

        // 更新交互面板中的角色头像
        if (this.selectedCharacter && this.selectedCharacter.id === characterId) {
            const panelAvatar = document.querySelector('.character-avatar-large img');
            if (panelAvatar) {
                panelAvatar.src = imageUrl;
            }
        }

        // 更新内存中的角色信息
        const character = this.characters.find(c => c.id === characterId);
        if (character) {
            character.image = imageUrl;
        }
    }

    // 加载素材列表
    async loadAssets() {
        try {
            const [mapsResponse, charsResponse] = await Promise.all([
                fetch('http://localhost:5000' + this.apiEndpoints.listMapAssets),
                fetch('http://localhost:5000' + this.apiEndpoints.listCharacterAssets)
            ]);

            const mapsData = await mapsResponse.json();
            const charsData = await charsResponse.json();

            if (mapsData.success) {
                this.assets.maps = mapsData.assets;
            }

            if (charsData.success) {
                this.assets.characters = charsData.assets;
            }

            return { success: true, maps: this.assets.maps, characters: this.assets.characters };
        } catch (error) {
            console.error('加载素材列表失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 一键生成所有图片并应用
    async generateAndApplyImages(storyText, characters = null) {
        this.showSystemMessage('开始生成图片素材...');

        try {
            // 1. 生成提示词
            this.showSystemMessage('正在生成提示词...');
            const promptsResponse = await fetch('http://localhost:5000' + this.apiEndpoints.generateAllPrompts, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: storyText, characters })
            });
            const promptsData = await promptsResponse.json();

            if (!promptsData.success) {
                throw new Error(promptsData.error || '生成提示词失败');
            }

            // 2. 生成地图图片
            this.showSystemMessage('正在生成地图图片...');
            const mapImageResponse = await fetch('http://localhost:5000' + this.apiEndpoints.generateMapImage, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: promptsData.map.prompt,
                    api_key: this.imageConfig.apiKey,
                    image_size: this.imageConfig.imageSize,
                    aspect_ratio: this.imageConfig.mapAspectRatio
                })
            });
            const mapImageData = await mapImageResponse.json();

            if (!mapImageData.success) {
                throw new Error(mapImageData.error || '生成地图图片失败');
            }

            // 3. 生成角色图片
            this.showSystemMessage('正在生成角色图片...');
            const characterImages = [];
            for (const charPrompt of promptsData.characters) {
                const charImageResponse = await fetch('http://localhost:5000' + this.apiEndpoints.generateCharacterImage, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: charPrompt.prompt,
                        api_key: this.imageConfig.apiKey,
                        image_size: this.imageConfig.imageSize,
                        aspect_ratio: this.imageConfig.characterAspectRatio
                    })
                });
                const charImageData = await charImageResponse.json();
                
                if (charImageData.success) {
                    characterImages.push({
                        name: charPrompt.character_name,
                        image_url: charImageData.image_url,
                        emotion: charPrompt.emotion
                    });
                }
            }

            // 4. 保存素材
            this.showSystemMessage('正在保存素材...');
            const saveResponse = await fetch('http://localhost:5000' + this.apiEndpoints.saveAllAssets, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    map: {
                        image_url: mapImageData.image_url,
                        scene_type: promptsData.scene_type
                    },
                    characters: characterImages
                })
            });
            const saveData = await saveResponse.json();

            // 5. 更新场景背景
            if (saveData.map && saveData.map.success) {
                this.updateSceneBackground(saveData.map.url);
                this.showSystemMessage('场景背景已更新');
            }

            // 6. 更新角色图片
            if (saveData.characters) {
                saveData.characters.forEach((charAsset, index) => {
                    if (charAsset.success && this.characters[index]) {
                        this.updateCharacterImage(this.characters[index].id, charAsset.url);
                    }
                });
                this.showSystemMessage(`已更新 ${saveData.success_count} 个角色图片`);
            }

            // 7. 重新加载素材列表
            await this.loadAssets();

            return {
                success: true,
                map: saveData.map,
                characters: saveData.characters,
                success_count: saveData.success_count,
                failed_count: saveData.failed_count
            };

        } catch (error) {
            console.error('生成图片失败:', error);
            this.showNotification(`图片生成失败: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }

    // 查询余额
    async checkImageBalance() {
        if (!this.imageConfig.apiKey) {
            return { success: false, error: '请先配置API密钥' };
        }

        try {
            const response = await fetch('http://localhost:5000' + this.apiEndpoints.checkBalance, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: this.imageConfig.apiKey })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('查询余额失败:', error);
            return { success: false, error: error.message };
        }
    }
}

// 角色移动控制模块
class MovementController {
    constructor(fairyTownSystem, config = {}) {
        this.system = fairyTownSystem;
        this.config = {
            defaultSpeed: 2,
            minSpeed: 0.5,
            maxSpeed: 10,
            smoothMovement: true,
            syncToBackend: false,  // 纯前端控制，不同步到后端
            ...config
        };
        
        this.activeMovements = new Map();
        this.keyboardState = new Map();
        this.isListening = false;
        
        this.setupKeyboardListener();
    }

    // 同步移动信息到后端
    async syncMoveToBackend(characterId, moveData) {
        if (!this.config.syncToBackend) {
            return { success: true, synced: false };
        }

        try {
            const character = this.system.characters.find(c => c.id === characterId);
            if (!character) {
                return { success: false, error: 'Character not found', synced: false };
            }

            // 将字符 ID 转换为整数（char-1 -> 1）
            const backendCharId = character.id.replace('char-', '');
            
            const response = await fetch(`http://localhost:5000/api/characters/${backendCharId}/move`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(moveData)
            });

            const result = await response.json();
            
            if (result.success && result.character) {
                // 更新前端角色位置
                character.position = result.character.position;
                this.system.updateSceneCharacterPosition(character);
            }

            return { ...result, synced: true };
        } catch (error) {
            console.warn('[MovementController] 后端同步失败:', error.message);
            return { success: false, error: error.message, synced: false };
        }
    }

    setupKeyboardListener() {
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
                this.keyboardState.set(e.key, true);
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
                this.keyboardState.set(e.key, false);
                e.preventDefault();
            }
        });
    }

    moveByDirection(characterId, direction, speed = null, duration = null) {
        const character = this.system.characters.find(c => c.id === characterId);
        if (!character) {
            return { success: false, error: 'Character not found' };
        }

        const moveSpeed = speed !== null ? speed : this.config.defaultSpeed;
        const clampedSpeed = Math.max(this.config.minSpeed, Math.min(this.config.maxSpeed, moveSpeed));

        let dx = 0;
        let dy = 0;

        switch (direction.toLowerCase()) {
            case 'up':
            case '↑':
                dy = -clampedSpeed;
                break;
            case 'down':
            case '↓':
                dy = clampedSpeed;
                break;
            case 'left':
            case '←':
                dx = -clampedSpeed;
                break;
            case 'right':
            case '→':
                dx = clampedSpeed;
                break;
            case 'up-left':
            case '↖':
                dx = -clampedSpeed * 0.707;
                dy = -clampedSpeed * 0.707;
                break;
            case 'up-right':
            case '↗':
                dx = clampedSpeed * 0.707;
                dy = -clampedSpeed * 0.707;
                break;
            case 'down-left':
            case '↙':
                dx = -clampedSpeed * 0.707;
                dy = clampedSpeed * 0.707;
                break;
            case 'down-right':
            case '↘':
                dx = clampedSpeed * 0.707;
                dy = clampedSpeed * 0.707;
                break;
            default:
                return { success: false, error: 'Invalid direction' };
        }

        return this.moveByVelocity(characterId, dx, dy, duration);
    }

    moveByVelocity(characterId, vx, vy, duration = null) {
        const character = this.system.characters.find(c => c.id === characterId);
        if (!character) {
            return { success: false, error: 'Character not found' };
        }

        const newX = character.position.x + vx;
        const newY = character.position.y + vy;

        const bounds = this.system.movementBounds;
        const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
        const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, newY));

        const wasClamped = clampedX !== newX || clampedY !== newY;

        character.position.x = clampedX;
        character.position.y = clampedY;

        this.system.updateSceneCharacterPosition(character);

        return {
            success: true,
            clamped: wasClamped,
            position: { x: clampedX, y: clampedY },
            velocity: { vx, vy }
        };
    }

    startContinuousMovement(characterId, direction, speed = null) {
        this.stopContinuousMovement(characterId);

        const character = this.system.characters.find(c => c.id === characterId);
        if (!character) {
            return { success: false, error: 'Character not found' };
        }

        const moveSpeed = speed !== null ? speed : this.config.defaultSpeed;
        
        let dx = 0;
        let dy = 0;

        switch (direction.toLowerCase()) {
            case 'up':
            case '↑':
                dy = -moveSpeed;
                break;
            case 'down':
            case '↓':
                dy = moveSpeed;
                break;
            case 'left':
            case '←':
                dx = -moveSpeed;
                break;
            case 'right':
            case '→':
                dx = moveSpeed;
                break;
            case 'up-left':
            case '↖':
                dx = -moveSpeed * 0.707;
                dy = -moveSpeed * 0.707;
                break;
            case 'up-right':
            case '↗':
                dx = moveSpeed * 0.707;
                dy = -moveSpeed * 0.707;
                break;
            case 'down-left':
            case '↙':
                dx = -moveSpeed * 0.707;
                dy = moveSpeed * 0.707;
                break;
            case 'down-right':
            case '↘':
                dx = moveSpeed * 0.707;
                dy = moveSpeed * 0.707;
                break;
            default:
                return { success: false, error: 'Invalid direction' };
        }

        const intervalId = setInterval(() => {
            this.moveByVelocity(characterId, dx, dy);
        }, 16);

        this.activeMovements.set(characterId, { intervalId, direction, speed: moveSpeed });

        return {
            success: true,
            characterId,
            direction,
            speed: moveSpeed
        };
    }

    stopContinuousMovement(characterId) {
        const movement = this.activeMovements.get(characterId);
        if (movement) {
            clearInterval(movement.intervalId);
            this.activeMovements.delete(characterId);
            return { success: true };
        }
        return { success: false, error: 'No active movement found' };
    }

    stopAllMovements() {
        this.activeMovements.forEach((movement, characterId) => {
            clearInterval(movement.intervalId);
        });
        this.activeMovements.clear();
        return { success: true };
    }

    handleKeyboardMovement(characterId, options = {}) {
        if (!this.isListening) {
            this.isListening = true;
        }

        const speed = options.speed || this.config.defaultSpeed;
        const useSmoothMovement = options.smooth !== undefined ? options.smooth : this.config.smoothMovement;

        if (useSmoothMovement) {
            const movementKeys = {
                'ArrowUp': 'up', 'w': 'up', 'W': 'up',
                'ArrowDown': 'down', 's': 'down', 'S': 'down',
                'ArrowLeft': 'left', 'a': 'left', 'A': 'left',
                'ArrowRight': 'right', 'd': 'right', 'D': 'right'
            };

            const activeDirections = [];
            this.keyboardState.forEach((pressed, key) => {
                if (pressed && movementKeys[key]) {
                    activeDirections.push(movementKeys[key]);
                }
            });

            if (activeDirections.length > 0) {
                const combinedDirection = this.combineDirections(activeDirections);
                this.startContinuousMovement(characterId, combinedDirection, speed);
            } else {
                this.stopContinuousMovement(characterId);
            }
        } else {
            const moveOnKey = (direction) => {
                this.moveByDirection(characterId, direction, speed);
            };

            const keyHandlers = {
                'ArrowUp': () => moveOnKey('up'),
                'ArrowDown': () => moveOnKey('down'),
                'ArrowLeft': () => moveOnKey('left'),
                'ArrowRight': () => moveOnKey('right'),
                'w': () => moveOnKey('up'),
                's': () => moveOnKey('down'),
                'a': () => moveOnKey('left'),
                'd': () => moveOnKey('right'),
                'W': () => moveOnKey('up'),
                'S': () => moveOnKey('down'),
                'A': () => moveOnKey('left'),
                'D': () => moveOnKey('right')
            };

            const handler = keyHandlers[Object.keys(this.keyboardState).find(key => this.keyboardState.get(key))];
            if (handler) {
                handler();
            }
        }

        return { success: true, listening: this.isListening };
    }

    combineDirections(directions) {
        if (directions.length === 0) return null;
        if (directions.length === 1) return directions[0];

        const hasUp = directions.includes('up');
        const hasDown = directions.includes('down');
        const hasLeft = directions.includes('left');
        const hasRight = directions.includes('right');

        const vertical = hasUp && !hasDown ? 'up' : hasDown && !hasUp ? 'down' : null;
        const horizontal = hasLeft && !hasRight ? 'left' : hasRight && !hasLeft ? 'right' : null;

        // 禁止斜向移动，只允许 X 轴或 Y 轴单一方向移动
        // 优先使用垂直方向（Y 轴），如果没有垂直方向则使用水平方向（X 轴）
        if (vertical && horizontal) {
            return vertical; // 只返回垂直方向，忽略水平方向
        }

        return vertical || horizontal || null;
    }

    moveToPosition(characterId, targetX, targetY, options = {}) {
        const character = this.system.characters.find(c => c.id === characterId);
        if (!character) {
            return { success: false, error: 'Character not found' };
        }

        const speed = options.speed || this.config.defaultSpeed;
        const smooth = options.smooth !== undefined ? options.smooth : this.config.smoothMovement;

        const bounds = this.system.movementBounds;
        const targetClampedX = Math.max(bounds.minX, Math.min(bounds.maxX, targetX));
        const targetClampedY = Math.max(bounds.minY, Math.min(bounds.maxY, targetY));

        if (!smooth) {
            character.position.x = targetClampedX;
            character.position.y = targetClampedY;
            this.system.updateSceneCharacterPosition(character);
            return {
                success: true,
                position: { x: targetClampedX, y: targetClampedY }
            };
        }

        return new Promise((resolve) => {
            const startX = character.position.x;
            const startY = character.position.y;
            const distance = Math.sqrt(Math.pow(targetClampedX - startX, 2) + Math.pow(targetClampedY - startY, 2));
            const duration = (distance / speed) * 100;
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                character.position.x = startX + (targetClampedX - startX) * progress;
                character.position.y = startY + (targetClampedY - startY) * progress;

                this.system.updateSceneCharacterPosition(character);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve({
                        success: true,
                        position: { x: targetClampedX, y: targetClampedY },
                        completed: true
                    });
                }
            };

            requestAnimationFrame(animate);
        });
    }

    getMovementState(characterId) {
        const character = this.system.characters.find(c => c.id === characterId);
        if (!character) {
            return { success: false, error: 'Character not found' };
        }

        const activeMovement = this.activeMovements.get(characterId);

        return {
            success: true,
            position: { ...character.position },
            isMoving: !!activeMovement,
            movement: activeMovement ? {
                direction: activeMovement.direction,
                speed: activeMovement.speed
            } : null
        };
    }
}

// 角色环境感知类
class CharacterEnvironment {
    constructor(character, fairyTownSystem, config = {}) {
        this.character = character;
        this.system = fairyTownSystem;
        this.visionRadius = config.visionRadius || 150;
        this.visionAngle = config.visionAngle || 360;
        this.environmentObjects = [];
        this.lastUpdateTime = null;
        this.isMonitoring = false;
        this.callbacks = {
            onEnvironmentUpdate: null,
            onBackendMessage: null
        };
    }

    // 扫描周围环境
    scanEnvironment() {
        const nearbyEntities = this.findNearbyEntities();
        const terrainInfo = this.getTerrainInfo();
        const weatherInfo = this.getWeatherInfo();
        
        this.environmentObjects = {
            characters: nearbyEntities.characters,
            objects: nearbyEntities.objects,
            terrain: terrainInfo,
            weather: weatherInfo,
            timestamp: Date.now()
        };
        
        this.lastUpdateTime = Date.now();
        return this.environmentObjects;
    }

    // 查找附近实体
    findNearbyEntities() {
        const result = {
            characters: [],
            objects: []
        };

        const charX = this.character.position.x;
        const charY = this.character.position.y;

        // 查找附近角色
        this.system.characters.forEach(char => {
            if (char.id === this.character.id) return;
            
            const distance = this.calculateDistance(
                charX, charY,
                char.position.x, char.position.y
            );
            
            if (distance <= this.visionRadius) {
                result.characters.push({
                    id: char.id,
                    name: char.name,
                    role: char.role,
                    position: { ...char.position },
                    distance: Math.round(distance * 100) / 100,
                    emotion: char.emotion
                });
            }
        });

        // 伪代码：查找附近物体（建筑物、植物、道具等）
        // const sceneObjects = this.system.sceneObjects;
        // sceneObjects.forEach(obj => {
        //     const distance = this.calculateDistance(charX, charY, obj.x, obj.y);
        //     if (distance <= this.visionRadius) {
        //         result.objects.push({
        //             type: obj.type,
        //             name: obj.name,
        //             position: { x: obj.x, y: obj.y },
        //             distance: Math.round(distance * 100) / 100,
        //             interactable: obj.interactable
        //         });
        //     }
        // });

        return result;
    }

    // 计算两点距离
    calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    // 获取地形信息
    getTerrainInfo() {
        // 伪代码：根据角色位置判断地形
        return {
            type: this.determineTerrainType(this.character.position),
            description: '童话镇广场',
            features: ['草地', '树木', '花丛']
        };
    }

    // 判断地形类型
    determineTerrainType(position) {
        // 伪代码：根据坐标判断地形
        // if (position.y > 70) return 'forest';
        // if (position.x < 20) return 'village';
        return 'square';
    }

    // 获取天气信息
    getWeatherInfo() {
        return {
            condition: 'sunny',
            temperature: 25,
            timeOfDay: this.system.currentScene.includes('night') ? 'night' : 'day'
        };
    }

    // 获取完整环境信息（供后端调用）
    getEnvironmentInfo() {
        return {
            characterId: this.character.id,
            characterName: this.character.name,
            currentPosition: {
                x: this.character.position.x,
                y: this.character.position.y
            },
            visionRadius: this.visionRadius,
            environment: {
                nearbyCharacters: this.environmentObjects.characters || [],
                nearbyObjects: this.environmentObjects.objects || [],
                terrain: this.environmentObjects.terrain || {},
                weather: this.environmentObjects.weather || {}
            },
            lastUpdate: this.lastUpdateTime,
            metadata: {
                scanInterval: 1000,
                timestamp: Date.now()
            }
        };
    }

    // 发送环境信息到后端
    async sendToBackend(endpoint = 'http://localhost:5000/api/environment/update') {
        const environmentData = this.getEnvironmentInfo();

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(environmentData)
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to send environment data:', error);
            return { success: false, error: error.message };
        }
    }

    // 接收后端信息
    async receiveFromBackend(message) {
        // 期望后端返回格式:
        // { command: 'move' | 'interact' | 'update' | 'notify', targetId: 'char-1', data: {...}, timestamp: 1234567890 }

        if (this.callbacks.onBackendMessage) {
            this.callbacks.onBackendMessage(message);
        }

        switch (message.command) {
            case 'move':
                return this.handleMoveCommand(message.data);
            case 'speak':
                return this.handleSpeakCommand(message.data);
            case 'interact':
                return this.handleInteractCommand(message.data);
            case 'update':
                return this.handleUpdateCommand(message.data);
            case 'notify':
                return this.handleNotifyCommand(message.data);
            default:
                return { success: false, error: 'Unknown command' };
        }
    }

    // 处理移动指令
    handleMoveCommand(data) {
        // 伪代码：实际应该调用 system.moveCharacter
        /*
        this.system.moveCharacter(
            this.character.id,
            data.targetX,
            data.targetY
        );
        */
        console.log('[CharacterEnvironment] 收到移动指令:', data);
        return { success: true, action: 'move', data: data };
    }

    // 处理说话指令
    handleSpeakCommand(data) {
        console.log('[CharacterEnvironment] 收到说话指令:', data);
        const result = this.system.characterSpeak(
            this.character.id, 
            data.content, 
            data.duration
        );
        return { ...result, action: 'speak' };
    }

    // 处理交互指令
    handleInteractCommand(data) {
        console.log('[CharacterEnvironment] 收到交互指令:', data);
        return { success: true, action: 'interact', data: data };
    }

    // 处理更新指令
    handleUpdateCommand(data) {
        if (data.visionRadius) {
            this.visionRadius = data.visionRadius;
        }
        console.log('[CharacterEnvironment] 收到更新指令:', data);
        return { success: true, action: 'update', data: data };
    }

    // 处理通知指令
    handleNotifyCommand(data) {
        console.log('[CharacterEnvironment] 收到通知:', data.message);
        return { success: true, action: 'notify', received: true };
    }

    // 设置回调
    setCallback(eventType, callback) {
        if (this.callbacks.hasOwnProperty(eventType)) {
            this.callbacks[eventType] = callback;
        }
    }

    // 开始监控
    startMonitoring(interval = 2000) {
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.scanEnvironment();
            if (this.callbacks.onEnvironmentUpdate) {
                this.callbacks.onEnvironmentUpdate(this.environmentObjects);
            }
        }, interval);
    }

    // 停止监控
    stopMonitoring() {
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }

    // 更新视野半径
    setVisionRadius(radius) {
        this.visionRadius = Math.max(50, Math.min(500, radius));
    }

    // 获取简报（供UI显示）
    getBriefing() {
        const env = this.environmentObjects;
        return {
            nearbyCount: env.characters ? env.characters.length : 0,
            objectCount: env.objects ? env.objects.length : 0,
            terrain: env.terrain ? env.terrain.type : 'unknown'
        };
    }
}

// 初始化系统
if (typeof window !== 'undefined') {
    window.FairyTownSystem = FairyTownSystem;
    window.CharacterEnvironment = CharacterEnvironment;
    window.MovementController = MovementController;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FairyTownSystem, CharacterEnvironment, MovementController };
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.__FAIRY_TOWN_DISABLE_AUTO_INIT__) {
            return;
        }

        window.fairyTownSystem = new FairyTownSystem();
        
        // 为示例角色创建环境感知实例
        window.characterEnvironments = {};
        
        // 伪代码：初始化环境感知
        /*
        window.fairyTownSystem.loadSampleCharacters().then(() => {
            window.fairyTownSystem.characters.forEach(char => {
                window.characterEnvironments[char.id] = new CharacterEnvironment(
                    char,
                    window.fairyTownSystem,
                    { visionRadius: 150 }
                );
            });
        });
        */
    });
}
