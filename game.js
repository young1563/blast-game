class BlastGame {
    constructor() {
        this.board = [];
        this.colors = ['red', 'blue', 'green', 'yellow', 'purple'];
        this.score = 0;
        this.boardSize = 8;
        this.selectedBlocks = [];
    }

    init() {
        this.gameBoard = document.getElementById('gameBoard');
        this.scoreElement = document.getElementById('score');
        this.createBoard();
        this.renderBoard();
    }

    createBoard() {
        for (let row = 0; row < this.boardSize; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.boardSize; col++) {
                this.board[row][col] = {
                    color: 'gray', // 기본 색상
                    row: row,
                    col: col
                };
            }
        }
    }

    renderBoard() {
        this.gameBoard.innerHTML = '';
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const block = document.createElement('div');
                block.className = 'block';
                block.style.backgroundColor = this.board[row][col].color;
                block.onclick = () => this.handleBlockClick(row, col);
                this.gameBoard.appendChild(block);
            }
        }
    }

    handleBlockClick(row, col) {
        const clickedBlock = this.board[row][col];
        this.selectedBlocks = [];
        this.findMatches(row, col, clickedBlock.color);
        
        if (this.selectedBlocks.length >= 3) {
            this.removeBlocks();
            this.dropBlocks();
            this.fillEmptySpaces();
            this.updateScore(this.selectedBlocks.length);
            this.renderBoard();
        }
    }

    findMatches(row, col, color) {
        if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) return;
        if (this.board[row][col].color !== color) return;
        if (this.selectedBlocks.some(block => block.row === row && block.col === col)) return;

        this.selectedBlocks.push({row, col});

        // 상하좌우 확인
        this.findMatches(row - 1, col, color);
        this.findMatches(row + 1, col, color);
        this.findMatches(row, col - 1, color);
        this.findMatches(row, col + 1, color);
    }

    removeBlocks() {
        this.selectedBlocks.forEach(block => {
            this.board[block.row][block.col] = null;
        });
    }

    dropBlocks() {
        for (let col = 0; col < this.boardSize; col++) {
            let emptyRow = this.boardSize - 1;
            for (let row = this.boardSize - 1; row >= 0; row--) {
                if (this.board[row][col] !== null) {
                    if (emptyRow !== row) {
                        this.board[emptyRow][col] = this.board[row][col];
                        this.board[row][col] = null;
                    }
                    emptyRow--;
                }
            }
        }
    }

    fillEmptySpaces() {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.board[row][col] === null) {
                    this.board[row][col] = {
                        color: this.colors[Math.floor(Math.random() * this.colors.length)],
                        row: row,
                        col: col
                    };
                }
            }
        }
    }

    updateScore(matchCount) {
        this.score += matchCount * 10;
        this.scoreElement.textContent = this.score;
    }
}

// 게임 시작
window.onload = () => {
    new BlastGame();
}; 