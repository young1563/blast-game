class CoopBlastGame extends BlastGame {
    constructor() {
        super();
        this.roomId = null;
        this.playerId = null;
        this.isHost = false;
        this.gameStarted = false;
        this.timeLeft = 60;
        this.skillGauge = 0;
        this.bossHP = 100;
        this.setupCoopGame();
    }

    setupCoopGame() {
        // UI 요소
        this.lobbyScreen = document.getElementById('lobby');
        this.gameScreen = document.getElementById('game');
        this.timeLeftElement = document.getElementById('timeLeft');
        this.bossHpElement = document.getElementById('bossHpFill');
        this.skillGaugeElement = document.getElementById('skillGaugeFill');
        this.skillButton = document.getElementById('useSkill');

        // 버튼 이벤트
        document.getElementById('createRoom').onclick = () => this.createRoom();
        document.getElementById('joinRoom').onclick = () => this.joinRoom();
        this.skillButton.onclick = () => this.useSkill();

        // 초기 화면 설정
        this.showLobby();
    }

    // 방 생성
    async createRoom() {
        this.isHost = true;
        this.roomId = Math.random().toString(36).substring(2, 8);
        this.playerId = 'player1';
        
        await database.ref(`rooms/${this.roomId}`).set({
            host: this.playerId,
            gameStarted: false,
            board: this.board,
            bossHP: this.bossHP,
            skillGauge: this.skillGauge,
            players: {
                player1: { score: 0, connected: true }
            }
        });

        this.setupGameListeners();
        alert(`방 코드: ${this.roomId}`);
    }

    // 방 참여
    async joinRoom() {
        const roomCode = document.getElementById('roomCode').value;
        const roomRef = database.ref(`rooms/${roomCode}`);
        
        const snapshot = await roomRef.once('value');
        if (!snapshot.exists()) {
            alert('존재하지 않는 방입니다.');
            return;
        }

        this.roomId = roomCode;
        this.playerId = 'player2';
        
        await roomRef.child('players/player2').set({
            score: 0,
            connected: true
        });

        this.setupGameListeners();
        this.startGame();
    }

    // 게임 리스너 설정
    setupGameListeners() {
        const roomRef = database.ref(`rooms/${this.roomId}`);

        // 게임 상태 변경 감지
        roomRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            this.bossHP = data.bossHP;
            this.skillGauge = data.skillGauge;
            this.updateUI();
        });

        // 플레이어 점수 변경 감지
        roomRef.child('players').on('value', (snapshot) => {
            const players = snapshot.val();
            if (!players) return;

            document.querySelector('#player1 .player-score').textContent = players.player1?.score || 0;
            document.querySelector('#player2 .player-score').textContent = players.player2?.score || 0;
        });

        // 연결 해제 시
        database.ref('.info/connected').on('value', (snap) => {
            if (snap.val() === false) return;

            roomRef.child(`players/${this.playerId}/connected`).onDisconnect().set(false);
        });
    }

    // 게임 시작
    startGame() {
        this.gameStarted = true;
        this.showGame();
        
        if (this.isHost) {
            this.startTimer();
        }
    }

    // 타이머 시작
    startTimer() {
        const timerInterval = setInterval(() => {
            this.timeLeft--;
            this.timeLeftElement.textContent = this.timeLeft;

            if (this.timeLeft <= 0) {
                clearInterval(timerInterval);
                this.endGame();
            }
        }, 1000);
    }

    // UI 업데이트
    updateUI() {
        this.bossHpElement.style.width = `${this.bossHP}%`;
        this.skillGaugeElement.style.width = `${this.skillGauge}%`;
        this.skillButton.disabled = this.skillGauge < 100;
    }

    // 점수 업데이트 오버라이드
    updateScore(matchCount) {
        super.updateScore(matchCount);
        
        // 보스 HP 감소
        const damage = matchCount * 2;
        this.bossHP = Math.max(0, this.bossHP - damage);

        // 스킬 게이지 증가
        this.skillGauge = Math.min(100, this.skillGauge + matchCount * 5);

        // Firebase에 업데이트
        database.ref(`rooms/${this.roomId}`).update({
            bossHP: this.bossHP,
            skillGauge: this.skillGauge
        });

        database.ref(`rooms/${this.roomId}/players/${this.playerId}/score`).set(this.score);

        this.updateUI();
        this.checkGameEnd();
    }

    // 스킬 사용
    useSkill() {
        if (this.skillGauge < 100) return;

        // 전체 한 줄 제거
        const randomRow = Math.floor(Math.random() * this.boardSize);
        for (let col = 0; col < this.boardSize; col++) {
            this.board[randomRow][col] = null;
        }

        this.skillGauge = 0;
        this.dropBlocks();
        this.fillEmptySpaces();
        this.renderBoard();

        database.ref(`rooms/${this.roomId}`).update({
            skillGauge: this.skillGauge
        });
    }

    // 게임 종료 체크
    checkGameEnd() {
        if (this.bossHP <= 0) {
            this.endGame(true);
        }
    }

    // 게임 종료
    endGame(isVictory = false) {
        if (isVictory) {
            alert('승리! 보스를 물리쳤습니다!');
        } else {
            alert('게임 오버! 시간이 초과되었습니다.');
        }

        // 방 삭제
        if (this.isHost) {
            database.ref(`rooms/${this.roomId}`).remove();
        }

        this.showLobby();
    }

    // 화면 전환
    showLobby() {
        this.lobbyScreen.classList.remove('hidden');
        this.gameScreen.classList.add('hidden');
    }

    showGame() {
        this.lobbyScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
    }
}

// 게임 시작
window.onload = () => {
    new CoopBlastGame();
}; 