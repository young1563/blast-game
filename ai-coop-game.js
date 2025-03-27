// 스테이지 데이터 정의
const STAGE_DATA = {
    1: {
        name: '연습생 데뷔',
        targetScore: 20000,  // 목표 점수 하향
        timeLimit: 120,      // 시간 여유 증가
        bossName: null,
        specialCondition: null,
        theme: {
            background: 'practice-room',
            bgm: 'piano',
            description: '연습실 / 잔잔한 피아노'
        },
        specialBlockChance: 0.05  // 특수 블록 출현 확률
    },
    3: {
        name: '팬 쇼케이스',
        targetScore: 35000,
        timeLimit: 100,
        bossName: '잡음 몬스터',
        specialCondition: {
            type: 'BLOCK_COUNT',
            target: 30,      // 목표 개수 하향
            current: 0
        },
        theme: {
            background: 'small-theater',
            bgm: 'fan-cheer',
            description: '소극장 / 팬 응원 bgm'
        },
        specialBlockChance: 0.08
    },
    5: {
        name: '방송 데뷔 무대',
        targetScore: 50000,
        timeLimit: 90,
        bossName: '루머괴물',
        specialCondition: {
            type: 'COMBO',
            target: 3,       // 콤보 목표 하향
            current: 0
        },
        theme: {
            background: 'broadcast-stage',
            bgm: 'edm',
            description: '방송국 무대 / EDM'
        },
        specialBlockChance: 0.10
    },
    7: {
        name: '월드투어 in 서울',
        targetScore: 70000,
        timeLimit: 90,
        bossName: '피로의 그림자',
        specialCondition: {
            type: 'SPECIAL_BLOCK',
            target: 2,       // 특수 블록 사용 횟수 하향
            current: 0
        },
        theme: {
            background: 'night-stage',
            bgm: 'band',
            description: '야경 무대 / 밴드 사운드'
        },
        specialBlockChance: 0.15
    },
    10: {
        name: '연말 시상식',
        targetScore: 100000,
        timeLimit: 90,       // 시간 증가
        bossName: '질투의 악령',
        specialCondition: {
            type: 'SKILL_USE',
            target: 2,
            current: 0
        },
        theme: {
            background: 'awards-ceremony',
            bgm: 'orchestra',
            description: '시상식 / 웅장한 오케스트라'
        },
        specialBlockChance: 0.20
    }
};

// 실제 구현이 필요한 데이터 수집 예시
const realTimeStats = {
    clearTime: {
        average: 0,
        min: 0,
        max: 0,
        distribution: []
    },
    scores: {
        average: 0,
        highScore: 0,
        distribution: []
    },
    clearRate: {
        overall: 0,
        byStage: {}
    },
    specialBlocks: {
        usageRate: 0,
        effectiveness: 0
    }
};

// 추가될 수 있는 상세 분석 지표들
const advancedAnalytics = {
    playerRetention: {
        byStage: {},
        overall: 0
    },
    aiCoopEffectiveness: {
        helpfulnessRate: 0,
        playerSatisfaction: 0
    },
    stageBalance: {
        difficultySpike: [],
        bottlenecks: []
    }
};

class StarBlastGame extends BlastGame {
    constructor(stageId = 1) {
        super();
        this.stageId = stageId;
        this.stageData = STAGE_DATA[stageId];
        this.boardSize = 8; // 보드 크기 설정
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(null));
        this.selectedBlocks = []; // 선택된 블록들을 저장할 배열 초기화
        this.setupGame();
    }

    setupGame() {
        // 블록 타입 초기화
        this.blockTypes = ['mic', 'light', 'letter'];
        this.blockEmojis = {
            'mic': '🎤',
            'light': '🌟',
            'letter': '💌',
            'bomb': '💣',
            'rainbow': '🌈'
        };

        // 게임 상태 초기화
        this.score = 0;
        this.aiScore = 0;
        this.fanGauge = 0;
        this.skillGauge = 0;
        this.timeLeft = this.stageData.timeLimit;
        this.aiThinkingTime = 1000;
        this.combo = 0;
        this.specialBlocksUsed = 0;
        this.skillsUsed = 0;
        this.totalBlocksDestroyed = 0;

        // UI 요소 초기화
        this.gameScreen = document.getElementById('game');
        this.gameBoard = document.getElementById('gameBoard');
        this.timeLeftElement = document.getElementById('timeLeft');
        this.fanGaugeElement = document.getElementById('bossHpFill');
        this.skillGaugeElement = document.getElementById('skillGaugeFill');
        this.skillButton = document.getElementById('useSkill');
        this.aiScoreElement = document.querySelector('#player2 .player-score');
        this.playerScoreElement = document.querySelector('#player1 .player-score');
        this.stageNameElement = document.getElementById('stageName');
        this.targetScoreElement = document.getElementById('targetScore');
        this.specialConditionElement = document.getElementById('specialCondition');

        // 스테이지 정보 표시
        this.updateStageInfo();

        // 이벤트 리스너
        this.skillButton.onclick = () => this.useSpecialStage();

        // 파티클 시스템 설정
        this.setupParticles();

        // 게임 보드 초기화 및 시작
        this.createStarBoard();
        this.showGame();
        this.startGame();

        // AI 동작 시작
        this.startAI();
        
        // 배경음악 설정
        this.setupBGM();
        
        // 보스 애니메이션 설정
        if (this.stageData.bossName) {
            this.setupBossAnimation();
        }

        // 진행도 불러오기
        this.loadProgress();
    }

    updateStageInfo() {
        this.stageNameElement.textContent = this.stageData.name;
        this.targetScoreElement.textContent = this.stageData.targetScore.toLocaleString();
        if (this.stageData.specialCondition) {
            this.specialConditionElement.textContent = this.getSpecialConditionText();
        } else {
            this.specialConditionElement.textContent = '없음 (튜토리얼)';
        }
    }

    getSpecialConditionText() {
        const condition = this.stageData.specialCondition;
        switch (condition.type) {
            case 'BLOCK_COUNT':
                return `블록 ${condition.current}/${condition.target}개 제거`;
            case 'COMBO':
                return `콤보 ${condition.current}/${condition.target}회`;
            case 'SPECIAL_BLOCK':
                return `특수 블록 ${condition.current}/${condition.target}개 사용`;
            case 'SKILL_USE':
                return `스킬 ${condition.current}/${condition.target}회 사용`;
            default:
                return '';
        }
    }

    createStarBoard() {
        this.gameBoard.innerHTML = '';
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                // 특수 블록 생성 확률 적용
                const isSpecialBlock = Math.random() < this.stageData.specialBlockChance;
                const type = isSpecialBlock ? 
                    (Math.random() < 0.5 ? 'bomb' : 'rainbow') :
                    this.blockTypes[Math.floor(Math.random() * this.blockTypes.length)];

                this.board[row][col] = {
                    type: type,
                    color: this.getBlockColor(type),
                    emoji: this.blockEmojis[type],
                    row: row,
                    col: col
                };

                const block = document.createElement('div');
                block.className = `block ${type}`;
                block.textContent = this.blockEmojis[type];
                block.dataset.row = row;
                block.dataset.col = col;
                block.onclick = () => this.handleBlockClick(row, col);
                this.gameBoard.appendChild(block);
            }
        }
    }

    setupParticles() {
        this.canvas = document.getElementById('particleCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        
        // 캔버스 크기 설정
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    getBlockColor(type) {
        const colors = {
            'mic': '#ff6b6b',
            'light': '#ffd93d',
            'letter': '#4ecdc4',
            'bomb': '#ff8e8e',
            'rainbow': 'linear-gradient(45deg, #ff6b6b, #ffd93d, #4ecdc4, #45b7af)'
        };
        return colors[type];
    }

    renderBoard() {
        if (!this.gameBoard) return; // 보드가 초기화되지 않았다면 리턴

        this.gameBoard.innerHTML = '';
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const block = document.createElement('div');
                const blockData = this.board[row][col];
                block.className = `block ${blockData.type}`;
                block.textContent = blockData.emoji;
                block.onclick = () => this.handleBlockClick(row, col);
                this.gameBoard.appendChild(block);
            }
        }
    }

    handleBlockClick(row, col) {
        if (this.timeLeft <= 0) return;

        const clickedBlock = this.board[row][col];
        if (!clickedBlock) return;

        this.selectedBlocks = [];
        this.findMatches(row, col, clickedBlock.type, this.selectedBlocks);
        
        if (this.selectedBlocks.length >= 3) {
            this.createParticles(this.selectedBlocks);
            
            // 점수 계산
            const score = this.calculateMoveScore(this.selectedBlocks);
            this.score += score;
            this.playerScoreElement.textContent = this.score;
            
            // 게이지 업데이트 - 상승량 증가
            this.fanGauge = Math.min(100, this.fanGauge + (score * 0.8));
            this.skillGauge = Math.min(100, this.skillGauge + (this.selectedBlocks.length * 8));
            
            // UI 업데이트
            this.fanGaugeElement.style.width = `${this.fanGauge}%`;
            this.skillGaugeElement.style.width = `${this.skillGauge}%`;
            this.skillButton.disabled = this.skillGauge < 100;
            
            // 콤보 시스템
            this.combo++;
            this.lastMatchTime = Date.now();
            
            // 블록 제거 및 보드 업데이트
            this.selectedBlocks.forEach(block => {
                this.board[block.row][block.col] = null;
            });
            
            this.checkSpecialBlocks();
            this.dropBlocks();
            this.fillEmptySpaces();
            this.renderBoard();
            
            // 특수 조건 업데이트
            this.updateSpecialCondition(this.selectedBlocks);
            
            // 게임 종료 체크
            this.checkGameEnd();
        }
    }

    findMatches(row, col, type, matches) {
        if (!matches) return; // matches 배열이 없으면 리턴
        if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) return;
        if (!this.board[row][col] || this.board[row][col].type !== type) return;
        if (matches.some(block => block.row === row && block.col === col)) return;

        matches.push({row, col});

        // 상하좌우 확인
        this.findMatches(row - 1, col, type, matches);
        this.findMatches(row + 1, col, type, matches);
        this.findMatches(row, col - 1, type, matches);
        this.findMatches(row, col + 1, type, matches);
    }

    fillEmptySpaces() {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.board[row][col] === null) {
                    const type = this.blockTypes[Math.floor(Math.random() * this.blockTypes.length)];
                    this.board[row][col] = {
                        type: type,
                        color: this.getBlockColor(type),
                        emoji: this.blockEmojis[type],
                        row: row,
                        col: col
                    };
                }
            }
        }
    }

    checkSpecialBlocks() {
        if (this.selectedBlocks.length >= 7) {
            // 레인보우 블록 생성
            const randomBlock = this.selectedBlocks[Math.floor(Math.random() * this.selectedBlocks.length)];
            this.board[randomBlock.row][randomBlock.col] = {
                type: 'rainbow',
                color: this.getBlockColor('rainbow'),
                emoji: this.blockEmojis['rainbow'],
                row: randomBlock.row,
                col: randomBlock.col
            };
        } else if (this.selectedBlocks.length >= 5) {
            // 폭발 블록 생성
            const randomBlock = this.selectedBlocks[Math.floor(Math.random() * this.selectedBlocks.length)];
            this.board[randomBlock.row][randomBlock.col] = {
                type: 'bomb',
                color: this.getBlockColor('bomb'),
                emoji: this.blockEmojis['bomb'],
                row: randomBlock.row,
                col: randomBlock.col
            };
        }
    }

    createParticles(blocks) {
        blocks.forEach(block => {
            const rect = this.gameBoard.children[block.row * this.boardSize + block.col].getBoundingClientRect();
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    life: 1,
                    color: this.board[block.row][block.col].color
                });
            }
        });
        this.animateParticles();
    }

    animateParticles() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
            this.ctx.fill();
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        if (this.particles.length > 0) {
            requestAnimationFrame(() => this.animateParticles());
        }
    }

    useSpecialStage() {
        if (this.skillGauge < 100) return;

        // 스킬 사용 횟수 업데이트
        if (this.stageData.specialCondition?.type === 'SKILL_USE') {
            this.stageData.specialCondition.current++;
            this.specialConditionElement.textContent = this.getSpecialConditionText();
        }

        // 스페셜 무대 효과 강화
        this.showSpecialStageEffect();
        
        // 전체 두 줄 제거로 강화
        const row1 = Math.floor(Math.random() * this.boardSize);
        const row2 = (row1 + 1) % this.boardSize;
        
        for (let col = 0; col < this.boardSize; col++) {
            this.board[row1][col] = null;
            this.board[row2][col] = null;
        }

        // 보너스 효과 강화
        this.timeLeft = Math.min(this.stageData.timeLimit, this.timeLeft + 8);
        this.score += 1000;  // 고정 보너스 점수
        this.playerScoreElement.textContent = this.score;
        
        this.skillGauge = 0;
        this.dropBlocks();
        this.fillEmptySpaces();
        this.renderBoard();
        this.updateUI();
    }

    showSpecialStageEffect() {
        const overlay = document.createElement('div');
        overlay.className = 'special-stage-overlay';
        
        const effect = document.createElement('div');
        effect.className = 'stage-effect';
        
        // 스페셜 무대 이미지 추가
        const stageImage = document.createElement('img');
        stageImage.src = `assets/effects/special-stage-${this.stageId}.png`;
        stageImage.alt = '스페셜 무대';
        stageImage.onerror = () => {
            stageImage.src = 'assets/effects/special-stage-default.png';
        };
        
        // 텍스트 효과
        const textEffect = document.createElement('div');
        textEffect.textContent = '✨ 스페셜 무대 ✨';
        
        effect.appendChild(stageImage);
        effect.appendChild(textEffect);
        overlay.appendChild(effect);
        document.body.appendChild(overlay);
        
        // 파티클 효과 추가
        this.createSpecialParticles();
        
        // 사운드 효과 재생
        const specialSound = new Audio('assets/sounds/special-stage.mp3');
        specialSound.volume = 0.5;
        specialSound.play().catch(() => {});
        
        setTimeout(() => {
            overlay.remove();
        }, 2000);
    }

    createSpecialParticles() {
        const particleCount = 50;
        const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7af'];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'special-particle';
            particle.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1001;
            `;
            
            const angle = (Math.random() * Math.PI * 2);
            const velocity = 5 + Math.random() * 5;
            const startX = window.innerWidth / 2;
            const startY = window.innerHeight / 2;
            
            particle.style.left = startX + 'px';
            particle.style.top = startY + 'px';
            
            document.body.appendChild(particle);
            
            const animation = particle.animate([
                {
                    transform: 'translate(0, 0) scale(1)',
                    opacity: 1
                },
                {
                    transform: `translate(${Math.cos(angle) * velocity * 50}px, ${Math.sin(angle) * velocity * 50}px) scale(0)`,
                    opacity: 0
                }
            ], {
                duration: 1000 + Math.random() * 1000,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'forwards'
            });
            
            animation.onfinish = () => particle.remove();
        }
    }

    updateScore(matchCount) {
        const baseScore = matchCount * 10;
        let bonus = 0;

        // 특수 블록 보너스
        this.selectedBlocks.forEach(block => {
            switch(this.board[block.row][block.col].type) {
                case 'light': bonus += 5; break;
                case 'letter': bonus += 10; break;
                case 'bomb': bonus += 15; break;
                case 'rainbow': bonus += 20; break;
            }
        });

        const totalScore = baseScore + bonus;
        this.score += totalScore;
        this.fanGauge = Math.min(100, this.fanGauge + (totalScore * 0.5));
        this.skillGauge = Math.min(100, this.skillGauge + (matchCount * 5));

        this.playerScoreElement.textContent = this.score;
        this.updateUI();
        this.checkGameEnd();
    }

    updateUI() {
        this.fanGaugeElement.style.width = `${this.fanGauge}%`;
        this.skillGaugeElement.style.width = `${this.skillGauge}%`;
        this.skillButton.disabled = this.skillGauge < 100;
    }

    checkGameEnd() {
        const isVictory = this.score >= this.stageData.targetScore && 
            (!this.stageData.specialCondition || 
             this.stageData.specialCondition.current >= this.stageData.specialCondition.target);
        
        if (isVictory || this.timeLeft <= 0) {
            this.endGame(isVictory);
        }
    }

    endGame(isVictory = false) {
        clearInterval(this.aiInterval);
        
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
        }
        
        // 게임 데이터 수집
        GameAnalytics.collectGameData({
            stageId: this.stageId,
            timeLimit: this.stageData.timeLimit,
            timeLeft: this.timeLeft,
            score: this.score,
            aiScore: this.aiScore,
            targetScore: this.stageData.targetScore,
            specialBlocksUsed: this.specialBlocksUsed,
            skillsUsed: this.skillsUsed,
            maxCombo: Math.max(this.combo, this.stageData.specialCondition?.type === 'COMBO' ? this.stageData.specialCondition.current : 0)
        });
        
        if (isVictory) {
            this.saveProgress();
        }
        
        const nextStage = this.getNextStageId();
        const message = isVictory 
            ? `🎉 스테이지 클리어! 🎉\n목표 점수: ${this.stageData.targetScore.toLocaleString()}\n획득 점수: ${this.score.toLocaleString()}\nAI 점수: ${this.aiScore.toLocaleString()}`
            : `💔 스테이지 실패...\n목표 점수: ${this.stageData.targetScore.toLocaleString()}\n획득 점수: ${this.score.toLocaleString()}\nAI 점수: ${this.aiScore.toLocaleString()}`;

        setTimeout(() => {
            alert(message);
            if (isVictory && nextStage) {
                if (confirm('다음 스테이지로 이동하시겠습니까?')) {
                    new StarBlastGame(nextStage);
                } else {
                    this.showStageSelect();
                }
            } else {
                this.showStageSelect();
            }
        }, 500);
    }

    getNextStageId() {
        const stageIds = Object.keys(STAGE_DATA).map(Number);
        const currentIndex = stageIds.indexOf(this.stageId);
        return currentIndex < stageIds.length - 1 ? stageIds[currentIndex + 1] : null;
    }

    updateSpecialCondition(blocks) {
        if (!this.stageData.specialCondition) return;

        const condition = this.stageData.specialCondition;
        switch (condition.type) {
            case 'BLOCK_COUNT':
                condition.current += blocks.length;
                break;
            case 'COMBO':
                this.combo++;
                condition.current = Math.max(condition.current, this.combo);
                break;
            case 'SPECIAL_BLOCK':
                const specialBlocks = blocks.filter(b => 
                    ['bomb', 'rainbow'].includes(this.board[b.row][b.col].type)
                ).length;
                condition.current += specialBlocks;
                break;
        }
        
        this.specialConditionElement.textContent = this.getSpecialConditionText();
    }

    showGame() {
        document.getElementById('lobby').classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
    }

    startGame() {
        // 타이머 시작
        const timerInterval = setInterval(() => {
            this.timeLeft--;
            this.timeLeftElement.textContent = this.timeLeft;

            if (this.timeLeft <= 0) {
                clearInterval(timerInterval);
                this.endGame(false);
            }
        }, 1000);
    }

    startAI() {
        this.aiInterval = setInterval(() => {
            if (this.timeLeft <= 0) return;
            
            // AI의 최적의 수 찾기
            const bestMove = this.findBestMove();
            if (bestMove) {
                this.handleAIMove(bestMove);
            }
        }, this.aiThinkingTime);
    }

    findBestMove() {
        let bestScore = 0;
        let bestMove = null;

        // 모든 블록을 검사
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (!this.board[row][col]) continue; // 빈 블록 건너뛰기
                
                const matches = [];
                this.findMatches(row, col, this.board[row][col].type, matches);
                
                if (matches.length >= 3) {
                    const score = this.calculateMoveScore(matches);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { row, col, matches };
                    }
                }
            }
        }

        return bestMove;
    }

    calculateMoveScore(matches) {
        let score = matches.length * 15;  // 기본 점수 증가
        
        // 콤보 보너스
        if (this.combo > 1) {
            score *= (1 + (this.combo * 0.1));  // 콤보당 10% 추가
        }
        
        // 특수 블록 보너스
        matches.forEach(match => {
            const block = this.board[match.row][match.col];
            switch(block.type) {
                case 'light': score += 10; break;    // 보너스 점수 증가
                case 'letter': score += 15; break;
                case 'bomb': score += 25; break;
                case 'rainbow': score += 35; break;
            }
        });

        // 매치 크기 보너스
        if (matches.length >= 4) {
            score *= 1.2;  // 4개 이상 매치 시 20% 보너스
        }
        if (matches.length >= 5) {
            score *= 1.3;  // 5개 이상 매치 시 추가 30% 보너스
        }

        return Math.floor(score);
    }

    handleAIMove(move) {
        // AI 이동 시각화
        const block = document.querySelector(`#gameBoard .block:nth-child(${move.row * this.boardSize + move.col + 1})`);
        block.classList.add('ai-match');
        
        setTimeout(() => {
            block.classList.remove('ai-match');
            
            // 점수 계산 및 업데이트
            const score = this.calculateMoveScore(move.matches);
            this.aiScore += score;
            this.aiScoreElement.textContent = this.aiScore;
            
            // 블록 제거 및 보드 업데이트
            move.matches.forEach(m => {
                this.board[m.row][m.col] = null;
            });
            
            this.dropBlocks();
            this.fillEmptySpaces();
            this.renderBoard();
        }, 500);
    }

    // 배경음악 관련 메서드
    setupBGM() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
        }

        this.bgm = new Audio('assets/music/dream.mp3');
        this.bgm.loop = true;
        this.bgm.volume = 0.5;
        
        // BGM 컨트롤 이벤트 설정
        const bgmControl = document.getElementById('toggleBGM');
        if (bgmControl) {
            bgmControl.onclick = () => {
                if (this.bgm.paused) {
                    this.bgm.play();
                    bgmControl.innerHTML = '<i class="fas fa-volume-up"></i>';
                } else {
                    this.bgm.pause();
                    bgmControl.innerHTML = '<i class="fas fa-volume-mute"></i>';
                }
            };
        }

        // BGM 자동 재생 시도
        this.bgm.play().catch(() => {
            console.log('BGM autoplay prevented - waiting for user interaction');
            if (bgmControl) {
                bgmControl.innerHTML = '<i class="fas fa-volume-mute"></i>';
            }
        });
    }

    // 보스 애니메이션 관련 메서드
    setupBossAnimation() {
        const bossContainer = document.createElement('div');
        bossContainer.className = 'boss-container';
        bossContainer.innerHTML = `
            <div class="boss-character">
                <img src="assets/bosses/${this.stageData.bossName}.png" alt="${this.stageData.bossName}">
                <div class="boss-name">${this.stageData.bossName}</div>
            </div>
        `;
        document.querySelector('.game-main').appendChild(bossContainer);
    }

    // 진행도 저장/불러오기 관련 메서드
    saveProgress() {
        const progress = {
            lastClearedStage: this.stageId,
            scores: {
                [this.stageId]: this.score
            }
        };
        localStorage.setItem('starBlastProgress', JSON.stringify(progress));
    }

    loadProgress() {
        const progress = localStorage.getItem('starBlastProgress');
        if (progress) {
            return JSON.parse(progress);
        }
        return null;
    }

    showStageSelect() {
        const progress = this.loadProgress();
        const lastClearedStage = progress ? progress.lastClearedStage : 0;
        
        // 기존 게임 화면 숨기기
        document.getElementById('game').classList.add('hidden');
        
        // 스테이지 선택 화면 생성
        const stageSelect = document.createElement('div');
        stageSelect.id = 'stageSelect';
        stageSelect.className = 'screen';
        stageSelect.innerHTML = `
            <h2>스테이지 선택</h2>
            <div class="stage-grid"></div>
        `;
        
        const stageGrid = stageSelect.querySelector('.stage-grid');
        Object.entries(STAGE_DATA).forEach(([id, stage]) => {
            const stageButton = document.createElement('div');
            stageButton.className = `stage-button ${Number(id) <= lastClearedStage + 1 ? 'unlocked' : 'locked'}`;
            stageButton.innerHTML = `
                <div class="stage-icon">
                    <i class="fas ${this.getStageIcon(stage.theme.background)}"></i>
                </div>
                <div class="stage-info">
                    <div class="stage-name">${stage.name}</div>
                    <div class="stage-desc">${stage.theme.description}</div>
                </div>
                ${Number(id) <= lastClearedStage ? '<div class="stage-cleared">✓</div>' : ''}
            `;
            
            if (Number(id) <= lastClearedStage + 1) {
                stageButton.onclick = () => {
                    stageSelect.remove();
                    new StarBlastGame(Number(id));
                };
            }
            
            stageGrid.appendChild(stageButton);
        });
        
        document.getElementById('gameContainer').appendChild(stageSelect);
    }

    getStageIcon(background) {
        const icons = {
            'practice-room': 'fa-music',
            'small-theater': 'fa-users',
            'broadcast-stage': 'fa-tv',
            'night-stage': 'fa-moon',
            'awards-ceremony': 'fa-trophy'
        };
        return icons[background] || 'fa-star';
    }
}

// 게임 시작
window.onload = () => {
    new StarBlastGame();
};

class GameAnalytics {
    static collectGameData(gameResult) {
        const data = {
            stageId: gameResult.stageId,
            clearTime: gameResult.timeLimit - gameResult.timeLeft,
            score: gameResult.score,
            aiScore: gameResult.aiScore,
            specialBlocksUsed: gameResult.specialBlocksUsed,
            skillsUsed: gameResult.skillsUsed,
            maxCombo: gameResult.maxCombo,
            isVictory: gameResult.score >= gameResult.targetScore,
            timestamp: new Date().toISOString()
        };

        // 로컬 스토리지에 데이터 저장
        let gameStats = JSON.parse(localStorage.getItem('gameStats') || '[]');
        gameStats.push(data);
        localStorage.setItem('gameStats', JSON.stringify(gameStats));

        // 통계 업데이트
        this.updateStatistics(data);
    }

    static updateStatistics(newData) {
        let stats = JSON.parse(localStorage.getItem('gameStatistics') || '{}');
        
        // 스테이지별 통계
        if (!stats.byStage) stats.byStage = {};
        if (!stats.byStage[newData.stageId]) {
            stats.byStage[newData.stageId] = {
                attempts: 0,
                victories: 0,
                averageScore: 0,
                averageClearTime: 0,
                highScore: 0
            };
        }

        const stageStats = stats.byStage[newData.stageId];
        stageStats.attempts++;
        if (newData.isVictory) stageStats.victories++;
        stageStats.averageScore = ((stageStats.averageScore * (stageStats.attempts - 1)) + newData.score) / stageStats.attempts;
        stageStats.averageClearTime = ((stageStats.averageClearTime * (stageStats.attempts - 1)) + newData.clearTime) / stageStats.attempts;
        stageStats.highScore = Math.max(stageStats.highScore, newData.score);

        // 전체 통계
        if (!stats.overall) {
            stats.overall = {
                totalGames: 0,
                totalVictories: 0,
                averageScore: 0,
                averageClearTime: 0
            };
        }

        stats.overall.totalGames++;
        if (newData.isVictory) stats.overall.totalVictories++;
        stats.overall.averageScore = ((stats.overall.averageScore * (stats.overall.totalGames - 1)) + newData.score) / stats.overall.totalGames;
        stats.overall.averageClearTime = ((stats.overall.averageClearTime * (stats.overall.totalGames - 1)) + newData.clearTime) / stats.overall.totalGames;

        localStorage.setItem('gameStatistics', JSON.stringify(stats));
        
        // 대시보드 업데이트 트리거
        if (typeof DashboardUpdater !== 'undefined') {
            DashboardUpdater.updateStats();
        }
    }

    static getStatistics() {
        return JSON.parse(localStorage.getItem('gameStatistics') || '{}');
    }

    static clearStatistics() {
        localStorage.removeItem('gameStats');
        localStorage.removeItem('gameStatistics');
    }
}

class DashboardUpdater {
    static async updateStats() {
        const stats = GameAnalytics.getStatistics();
        this.updateCharts(stats);
        this.updateCards(stats);
    }

    static updateCharts(stats) {
        const difficultyChart = document.getElementById('difficultyChart');
        if (!difficultyChart) return;

        const chartData = {
            labels: Object.keys(STAGE_DATA).map(id => STAGE_DATA[id].name),
            datasets: [
                {
                    label: '클리어율',
                    data: Object.keys(STAGE_DATA).map(id => {
                        const stageStats = stats.byStage?.[id];
                        return stageStats ? (stageStats.victories / stageStats.attempts * 100) || 0 : 0;
                    }),
                    borderColor: '#4ecdc4',
                    fill: false
                },
                {
                    label: '평균 점수 달성률',
                    data: Object.keys(STAGE_DATA).map(id => {
                        const stageStats = stats.byStage?.[id];
                        return stageStats ? (stageStats.averageScore / STAGE_DATA[id].targetScore * 100) || 0 : 0;
                    }),
                    borderColor: '#ffd93d',
                    fill: false
                }
            ]
        };

        if (window.difficultyChart) {
            window.difficultyChart.data = chartData;
            window.difficultyChart.update();
        } else {
            window.difficultyChart = new Chart(difficultyChart.getContext('2d'), {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
    }

    static updateCards(stats) {
        const overall = stats.overall || {
            totalGames: 0,
            totalVictories: 0,
            averageScore: 0,
            averageClearTime: 0
        };

        // 통계 카드 업데이트
        this.updateStatCard('averageClearTime', 
            `${Math.round(overall.averageClearTime || 0)}초`,
            '평균 클리어 시간');
            
        this.updateStatCard('averageScore', 
            `${Math.round(overall.averageScore || 0).toLocaleString()}점`,
            '평균 점수');
            
        this.updateStatCard('clearRate', 
            `${Math.round((overall.totalVictories / overall.totalGames * 100) || 0)}%`,
            '평균 클리어율');
            
        this.updateStatCard('specialBlockRate', 
            this.calculateAverageSpecialBlockRate(stats),
            '특수 블록 사용률');

        // 스테이지 카드 업데이트
        Object.entries(STAGE_DATA).forEach(([id, stage]) => {
            const stageStats = stats.byStage?.[id];
            this.updateStageCard(id, stage, stageStats);
        });
    }

    static updateStatCard(id, value, label) {
        const card = document.getElementById(id);
        if (!card) return;

        card.querySelector('.stat-value').textContent = value;
        card.querySelector('.stat-label').textContent = label;
    }

    static updateStageCard(id, stage, stats) {
        const card = document.querySelector(`.stage-card[data-stage="${id}"]`);
        if (!card) return;

        if (stats) {
            card.querySelector('.clear-rate').textContent = 
                `클리어율: ${Math.round((stats.victories / stats.attempts * 100) || 0)}%`;
            card.querySelector('.average-score').textContent = 
                `평균 점수: ${Math.round(stats.averageScore || 0).toLocaleString()}`;
            card.querySelector('.high-score').textContent = 
                `최고 점수: ${Math.round(stats.highScore || 0).toLocaleString()}`;
        }

        // 난이도 게이지 업데이트
        const difficulty = this.calculateStageDifficulty(stats);
        const gauge = card.querySelector('.difficulty-gauge');
        gauge.style.width = `${difficulty}%`;
        gauge.style.backgroundColor = this.getDifficultyColor(difficulty);
    }

    static calculateAverageSpecialBlockRate(stats) {
        if (!stats.byStage) return '0%';
        
        const rates = Object.values(stats.byStage)
            .map(stage => stage.specialBlocksUsed / stage.attempts)
            .filter(rate => !isNaN(rate));
            
        if (rates.length === 0) return '0%';
        
        const average = rates.reduce((a, b) => a + b, 0) / rates.length;
        return `${Math.round(average * 100)}%`;
    }

    static calculateStageDifficulty(stats) {
        if (!stats || stats.attempts === 0) return 50;
        
        const clearRate = (stats.victories / stats.attempts) * 100;
        const scoreRate = (stats.averageScore / stats.targetScore) * 100;
        
        // 난이도는 클리어율과 점수 달성률의 역수
        return 100 - ((clearRate + scoreRate) / 2);
    }

    static getDifficultyColor(difficulty) {
        if (difficulty < 30) return '#4ecdc4';  // 쉬움
        if (difficulty < 70) return '#ffd93d';  // 보통
        return '#ff6b6b';  // 어려움
    }
}