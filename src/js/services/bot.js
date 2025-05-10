export class BotService {
  constructor(game) {
    this.game = game;
  }

  makeMove() {
    if (!this.game.gameActive || this.game.currentPlayer !== "O") return;

    let move;
    switch (this.game.botDifficulty) {
      case "noob":
        move = this.makeNoobMove();
        break;
      case "pro":
        move = this.makeProMove();
        break;
      case "master":
        move = this.makeMasterMove();
        break;
      default:
        move = this.makeNoobMove();
    }

    if (move !== null) {
      this.game.makeMove(move);
    }
  }

  makeNoobMove() {
    // Random move
    const emptyCells = this.game.board
      .map((cell, index) => (cell === "" ? index : null))
      .filter((index) => index !== null);

    if (emptyCells.length === 0) return null;
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  makeProMove() {
    // Try to win, block opponent, or make a strategic move
    const winMove = this.findWinningMove("O");
    if (winMove !== null) return winMove;

    const blockMove = this.findWinningMove("X");
    if (blockMove !== null) return blockMove;

    // Try to take center
    if (this.game.board[4] === "") return 4;

    // Try to take corners
    const corners = [0, 2, 6, 8];
    const emptyCorners = corners.filter(
      (corner) => this.game.board[corner] === ""
    );
    if (emptyCorners.length > 0) {
      return emptyCorners[Math.floor(Math.random() * emptyCorners.length)];
    }

    // Take any available move
    return this.makeNoobMove();
  }

  makeMasterMove() {
    // Use minimax algorithm for perfect play
    let bestScore = -Infinity;
    let bestMove = null;

    for (let i = 0; i < 9; i++) {
      if (this.game.board[i] === "") {
        this.game.board[i] = "O";
        const score = this.minimax(0, false);
        this.game.board[i] = "";

        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }

    return bestMove;
  }

  minimax(depth, isMaximizing) {
    const { winner } = this.game.checkWinner(this.game.board);
    if (winner === "O") return 10 - depth;
    if (winner === "X") return depth - 10;
    if (winner === "draw") return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (this.game.board[i] === "") {
          this.game.board[i] = "O";
          const score = this.minimax(depth + 1, false);
          this.game.board[i] = "";
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (this.game.board[i] === "") {
          this.game.board[i] = "X";
          const score = this.minimax(depth + 1, true);
          this.game.board[i] = "";
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  }

  findWinningMove(player) {
    // Check rows, columns, and diagonals for winning moves
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // columns
      [0, 4, 8],
      [2, 4, 6], // diagonals
    ];

    for (const line of lines) {
      const [a, b, c] = line;
      if (
        this.game.board[a] === player &&
        this.game.board[b] === player &&
        this.game.board[c] === ""
      ) {
        return c;
      }
      if (
        this.game.board[a] === player &&
        this.game.board[c] === player &&
        this.game.board[b] === ""
      ) {
        return b;
      }
      if (
        this.game.board[b] === player &&
        this.game.board[c] === player &&
        this.game.board[a] === ""
      ) {
        return a;
      }
    }

    return null;
  }
}
