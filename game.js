class TicTacToe {
  constructor() {
    this.board = Array(9).fill("");
    this.currentPlayer = Math.random() < 0.5 ? "X" : "O"; // Randomly choose first player
    this.isHost = false;
    this.isConnected = false;
    this.ws = null;
    this.player = null;
    this.roomId = null;
    this.gameActive = false;
    this.moveHistory = [];
    this.playerStats = {
      wins: 0,
      losses: 0,
      draws: 0,
    };
    this.isBotGame = false;
    this.botDifficulty = "noob";

    // DOM elements
    this.welcomeScreen = document.getElementById("welcomeScreen");
    this.joinOptions = document.getElementById("joinOptions");
    this.difficultySelect = document.getElementById("difficultySelect");
    this.gameContainer = document.getElementById("gameContainer");
    this.gameBoard = document.getElementById("gameBoard");
    this.cells = document.querySelectorAll(".cell");
    this.status = document.getElementById("status");
    this.hostBtn = document.getElementById("hostBtn");
    this.joinBtn = document.getElementById("joinBtn");
    this.botBtn = document.getElementById("botBtn");
    this.scanQRBtn = document.getElementById("scanQRBtn");
    this.enterCodeBtn = document.getElementById("enterCodeBtn");
    this.backToMenuBtn = document.getElementById("backToMenuBtn");
    this.backToMenuBtn2 = document.getElementById("backToMenuBtn2");
    this.restartBtn = document.getElementById("restartBtn");
    this.undoBtn = document.getElementById("undoBtn");
    this.backBtn = document.getElementById("backBtn");
    this.moveHistoryDiv = document.getElementById("moveHistory");
    this.qrScanner = document.getElementById("qrScanner");
    this.closeScanner = document.getElementById("closeScanner");
    this.gameOverPopup = document.getElementById("gameOverPopup");
    this.gameOverMessage = document.getElementById("gameOverMessage");
    this.restartGameBtn = document.getElementById("restartGameBtn");
    this.goHomeBtn = document.getElementById("goHomeBtn");

    // Bind event listeners
    this.hostBtn.addEventListener("click", () => this.hostGame());
    this.joinBtn.addEventListener("click", () => this.showJoinOptions());
    this.botBtn.addEventListener("click", () => this.showDifficultySelect());
    this.scanQRBtn.addEventListener("click", () => this.startQRScanner());
    this.enterCodeBtn.addEventListener("click", () => this.joinGame());
    this.backToMenuBtn.addEventListener("click", () =>
      this.showWelcomeScreen()
    );
    this.backToMenuBtn2.addEventListener("click", () =>
      this.showWelcomeScreen()
    );
    this.restartBtn.addEventListener("click", () => this.restartGame());
    this.undoBtn.addEventListener("click", () => this.undoMove());
    this.backBtn.addEventListener("click", () => this.showWelcomeScreen());
    this.closeScanner.addEventListener("click", () => this.stopQRScanner());
    this.restartGameBtn.addEventListener("click", () => this.restartGame());
    this.goHomeBtn.addEventListener("click", () => this.showWelcomeScreen());
    this.cells.forEach((cell) => {
      cell.addEventListener("click", () => this.handleCellClick(cell));
    });

    // Add difficulty selection listeners
    document.querySelectorAll("[data-difficulty]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.botDifficulty = e.target.dataset.difficulty;
        this.startBotGame();
      });
    });

    // Initialize the board
    this.updateBoard();
    this.updateStats();
  }

  showWelcomeScreen() {
    this.welcomeScreen.style.display = "block";
    this.joinOptions.style.display = "none";
    this.difficultySelect.style.display = "none";
    this.gameContainer.style.display = "none";
    this.gameOverPopup.style.display = "none";
    this.stopQRScanner();
    this.resetGame();
  }

  showJoinOptions() {
    this.welcomeScreen.style.display = "none";
    this.joinOptions.style.display = "block";
  }

  showDifficultySelect() {
    this.welcomeScreen.style.display = "none";
    this.difficultySelect.style.display = "block";
  }

  showGameScreen() {
    this.welcomeScreen.style.display = "none";
    this.joinOptions.style.display = "none";
    this.difficultySelect.style.display = "none";
    this.gameContainer.style.display = "flex";
  }

  generateRoomId() {
    return Math.random().toString(36).substring(2, 8);
  }

  async hostGame() {
    try {
      this.roomId = this.generateRoomId();
      this.connectToServer();
      this.isHost = true;
      this.showGameScreen();

      // Create room code display with QR code
      const roomCodeDisplay = document.createElement("div");
      roomCodeDisplay.className = "room-code";
      const currentUrl = window.location.href.split("?")[0];
      const roomUrl = `${currentUrl}?room=${this.roomId}`;

      roomCodeDisplay.innerHTML = `
        <h3>Room Code:</h3>
        <div class="code-container">
          <span id="roomCode">${this.roomId}</span>
          <button onclick="navigator.clipboard.writeText('${roomUrl}')" class="copy-btn">
            Copy Link
          </button>
        </div>
        <div class="qr-code" id="qrCode"></div>
      `;

      // Remove any existing room code display
      const existingDisplay = document.querySelector(".room-code");
      if (existingDisplay) {
        existingDisplay.remove();
      }

      // Insert after the status element
      this.status.parentNode.insertBefore(
        roomCodeDisplay,
        this.status.nextSibling
      );

      // Generate QR code
      const qrCodeDiv = document.getElementById("qrCode");
      if (qrCodeDiv) {
        try {
          // Clear any existing QR code
          qrCodeDiv.innerHTML = "";

          // Create QR code using the correct method
          new QRCode(qrCodeDiv, {
            text: roomUrl,
            width: 128,
            height: 128,
            colorDark: "#10b981",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H,
          });
        } catch (error) {
          console.error("Error generating QR code:", error);
          qrCodeDiv.innerHTML =
            '<p class="error-message">Failed to generate QR code</p>';
        }
      }

      this.updateStatus("Waiting for opponent to join...");
    } catch (error) {
      console.error("Error hosting game:", error);
      this.updateStatus("Error creating room: " + error.message);
    }
  }

  startQRScanner() {
    this.joinOptions.style.display = "none";
    this.qrScanner.style.display = "flex";
    const html5QrCode = new Html5Qrcode("scanner");
    html5QrCode
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          const roomId = new URL(decodedText).searchParams.get("room");
          if (roomId) {
            this.stopQRScanner();
            this.joinGame(roomId);
          }
        },
        (error) => {
          // Ignore scanning errors
        }
      )
      .catch((err) => {
        console.error("Error starting QR scanner:", err);
        this.updateStatus(
          "Error starting camera. Please enter room code manually."
        );
        this.stopQRScanner();
        this.joinGame();
      });
  }

  stopQRScanner() {
    this.qrScanner.style.display = "none";
    const scanner = document.getElementById("scanner");
    if (scanner) {
      scanner.innerHTML = "";
    }
  }

  async joinGame(roomId = null) {
    try {
      if (!roomId) {
        roomId = prompt("Enter the room code:");
        if (!roomId) return;
      }

      this.roomId = roomId;
      this.connectToServer();
      this.isHost = false;
      this.showGameScreen();
    } catch (error) {
      console.error("Error joining game:", error);
      this.updateStatus("Error joining room: " + error.message);
    }
  }

  startBotGame() {
    this.isBotGame = true;
    this.player = "X";
    this.gameActive = true;
    this.showGameScreen();
    this.gameBoard.style.display = "grid";
    this.updateStatus("Your turn (X)");
    this.undoBtn.style.display = "block";
  }

  makeBotMove() {
    if (!this.isBotGame || !this.gameActive || this.currentPlayer !== "O")
      return;

    let move;
    switch (this.botDifficulty) {
      case "noob":
        move = this.getRandomMove();
        break;
      case "athlete":
        move = this.getAthleteMove();
        break;
      case "pro":
        move = this.getProMove();
        break;
      default:
        move = this.getRandomMove();
    }

    if (move !== null) {
      setTimeout(() => this.makeMove(move), 500);
    }
  }

  getRandomMove() {
    const emptyCells = this.board
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell }) => cell === "");

    if (emptyCells.length > 0) {
      const randomIndex = Math.floor(Math.random() * emptyCells.length);
      return emptyCells[randomIndex].index;
    }
    return null;
  }

  getAthleteMove() {
    // Try to win
    const winningMove = this.findWinningMove("O");
    if (winningMove !== null) return winningMove;

    // Block opponent's winning move
    const blockingMove = this.findWinningMove("X");
    if (blockingMove !== null) return blockingMove;

    // Take center if available
    if (this.board[4] === "") return 4;

    // Take a corner
    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(
      (index) => this.board[index] === ""
    );
    if (availableCorners.length > 0) {
      return availableCorners[
        Math.floor(Math.random() * availableCorners.length)
      ];
    }

    // Take any available move
    return this.getRandomMove();
  }

  getProMove() {
    // Try to win
    const winningMove = this.findWinningMove("O");
    if (winningMove !== null) return winningMove;

    // Block opponent's winning move
    const blockingMove = this.findWinningMove("X");
    if (blockingMove !== null) return blockingMove;

    // Take center if available
    if (this.board[4] === "") return 4;

    // Look for fork opportunities
    const forkMove = this.findForkMove();
    if (forkMove !== null) return forkMove;

    // Take a corner
    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(
      (index) => this.board[index] === ""
    );
    if (availableCorners.length > 0) {
      return availableCorners[
        Math.floor(Math.random() * availableCorners.length)
      ];
    }

    // Take any available move
    return this.getRandomMove();
  }

  findWinningMove(player) {
    for (let i = 0; i < 9; i++) {
      if (this.board[i] === "") {
        this.board[i] = player;
        const { winner } = this.checkWinner();
        this.board[i] = "";
        if (winner === player) {
          return i;
        }
      }
    }
    return null;
  }

  findForkMove() {
    const emptyCells = this.board
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell }) => cell === "");

    for (const { index } of emptyCells) {
      let winningPaths = 0;
      this.board[index] = "O";

      // Check each possible winning pattern
      const winPatterns = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8], // Rows
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8], // Columns
        [0, 4, 8],
        [2, 4, 6], // Diagonals
      ];

      for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (
          (this.board[a] === "O" &&
            this.board[b] === "O" &&
            this.board[c] === "") ||
          (this.board[a] === "O" &&
            this.board[c] === "O" &&
            this.board[b] === "") ||
          (this.board[b] === "O" &&
            this.board[c] === "O" &&
            this.board[a] === "")
        ) {
          winningPaths++;
        }
      }

      this.board[index] = "";
      if (winningPaths >= 2) {
        return index;
      }
    }
    return null;
  }

  makeMove(index) {
    if (!this.gameActive || this.board[index] !== "") return;

    // Optimize DOM updates by batching them
    requestAnimationFrame(() => {
      this.board[index] = this.currentPlayer;
      this.moveHistory.push({
        player: this.currentPlayer,
        index,
        timestamp: new Date(),
      });

      this.updateBoard();
      this.updateMoveHistory();

      const { winner, winningLine } = this.checkWinner();
      if (winner) {
        this.handleGameOver(winner, winningLine);
      } else {
        this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";
        this.updateStatus(`${this.currentPlayer}'s turn`);

        if (this.isBotGame && this.currentPlayer === "O") {
          setTimeout(() => this.makeBotMove(), 500);
        }
      }
    });
  }

  handleGameOver(winner, winningLine = null) {
    this.gameActive = false;

    // Create a miniature board for the popup
    const popupBoard = document.createElement("div");
    popupBoard.className = "popup-board";
    popupBoard.innerHTML = this.board
      .map(
        (cell, index) => `
      <div class="popup-cell ${cell.toLowerCase()} ${
          winningLine && winningLine.includes(index) ? "winning-cell" : ""
        }">
        ${cell}
      </div>
    `
      )
      .join("");

    // Clear any existing popup board
    const existingPopupBoard = document.querySelector(".popup-board");
    if (existingPopupBoard) {
      existingPopupBoard.remove();
    }

    // Insert the board before the buttons
    const popupButtons = document.querySelector(".popup-buttons");
    popupButtons.parentNode.insertBefore(popupBoard, popupButtons);

    if (winner === "draw") {
      this.gameOverMessage.textContent = "It's a draw!";
      this.playerStats.draws++;
      this.showConfetti("draw");
    } else {
      this.gameOverMessage.textContent = `Player ${winner} wins!`;
      if (winner === this.player) {
        this.playerStats.wins++;
      } else {
        this.playerStats.losses++;
      }
      this.showConfetti("win");
    }

    this.updateStats();
    this.gameOverPopup.style.display = "flex";
  }

  connectToServer() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = window.location.port || "3000";
    const wsUrl = `${protocol}//${host}:${port}`;

    console.log("Connecting to WebSocket server at:", wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("WebSocket connection established");
        this.isConnected = true;
        this.ws.send(
          JSON.stringify({
            type: "join",
            roomId: this.roomId,
            playerId: Math.random().toString(36).substring(2, 8),
          })
        );
      };

      this.ws.onmessage = (event) => {
        console.log("Received message:", event.data);
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "joined":
            this.player = data.player;
            this.updateStatus(data.message);
            console.log(`Joined as player ${this.player}`);
            break;

          case "start":
            console.log("Game starting with state:", data.gameState);
            this.board = data.gameState;
            this.currentPlayer = data.currentPlayer;
            this.gameActive = true;
            this.gameBoard.style.display = "grid";
            this.updateBoard();
            this.updateStatus(`${this.currentPlayer}'s turn`);
            this.undoBtn.style.display = "block";
            break;

          case "move":
            console.log("Move received:", data);
            this.board = data.gameState;
            this.currentPlayer = data.currentPlayer;
            this.moveHistory.push({
              player: data.player,
              index: data.index,
              timestamp: new Date(),
            });
            this.updateBoard();
            this.updateMoveHistory();
            this.updateStatus(`${this.currentPlayer}'s turn`);
            break;

          case "gameOver":
            console.log("Game over:", data);
            this.board = data.gameState;
            this.handleGameOver(data.winner, data.winningLine);
            break;

          case "restart":
            console.log("Game restarted");
            this.board = data.gameState;
            this.currentPlayer = data.currentPlayer;
            this.gameActive = true;
            this.gameBoard.style.display = "grid";
            this.moveHistory = [];
            this.updateBoard();
            this.updateMoveHistory();
            this.updateStatus(`Game restarted! ${this.currentPlayer}'s turn`);
            this.gameOverPopup.style.display = "none";
            break;

          case "opponentLeft":
            console.log("Opponent left");
            this.gameActive = false;
            this.updateStatus(data.message);
            this.gameOverPopup.style.display = "flex";
            this.gameOverMessage.textContent = "Opponent left the game";
            break;

          case "error":
            console.error("Error received:", data.message);
            this.updateStatus(data.message);
            break;
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.updateStatus("Connection error. Please try again.");
        this.isConnected = false;
        this.gameActive = false;
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
        this.isConnected = false;
        this.gameActive = false;
        this.updateStatus("Connection lost. Please refresh the page.");
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      this.updateStatus("Failed to connect. Please try again.");
      this.isConnected = false;
      this.gameActive = false;
    }
  }

  async handleCellClick(cell) {
    if (!this.gameActive || this.board[cell.dataset.index] !== "") return;

    const index = parseInt(cell.dataset.index);

    if (this.isBotGame) {
      if (this.currentPlayer === this.player) {
        this.makeMove(index);
      }
    } else if (
      this.ws &&
      this.isConnected &&
      this.currentPlayer === this.player
    ) {
      this.ws.send(
        JSON.stringify({
          type: "move",
          index,
          player: this.player,
        })
      );
    }
  }

  updateBoard() {
    this.cells.forEach((cell, index) => {
      cell.textContent = this.board[index];
      cell.classList.remove("x", "o", "winning-cell");
      if (this.board[index]) {
        cell.classList.add(this.board[index].toLowerCase());
      }
    });
  }

  async restartGame() {
    if (this.isBotGame) {
      this.resetGame();
      this.startBotGame();
    } else if (this.ws && this.isConnected) {
      this.ws.send(
        JSON.stringify({
          type: "restart",
        })
      );
    }
  }

  resetGame() {
    this.board = Array(9).fill("");
    this.currentPlayer = Math.random() < 0.5 ? "X" : "O"; // Randomly choose first player
    this.gameActive = false;
    this.moveHistory = [];
    this.updateBoard();
    this.updateMoveHistory();
    this.updateStatus("Welcome! Host or join a game.");
    this.gameBoard.style.display = "none";
    this.gameOverPopup.style.display = "none";
  }

  updateStatus(message) {
    this.status.textContent = message;
  }

  updateStats() {
    document.getElementById("wins").textContent = this.playerStats.wins;
    document.getElementById("losses").textContent = this.playerStats.losses;
    document.getElementById("draws").textContent = this.playerStats.draws;
  }

  updateMoveHistory() {
    this.moveHistoryDiv.innerHTML = this.moveHistory
      .map((move) => {
        const time = move.timestamp.toLocaleTimeString();
        return `<div class="move-entry">
          Player ${move.player}: Cell ${move.index + 1} (${time})
        </div>`;
      })
      .join("");
    this.moveHistoryDiv.scrollTop = this.moveHistoryDiv.scrollHeight;
  }

  showConfetti(type) {
    const colors =
      type === "win"
        ? ["#1a73e8", "#34a853", "#fbbc04"]
        : ["#ea4335", "#fbbc04", "#34a853"];
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors,
    });
  }

  highlightWinningCells(winningLine) {
    if (winningLine) {
      winningLine.forEach((index) => {
        this.cells[index].classList.add("winning-cell");
      });
    }
  }

  undoMove() {
    if (this.isBotGame) {
      if (this.moveHistory.length >= 2) {
        // Remove bot's move and player's move
        this.moveHistory.pop();
        this.moveHistory.pop();
        const lastMove = this.moveHistory[this.moveHistory.length - 1];
        if (lastMove) {
          this.board[lastMove.index] = lastMove.player;
        } else {
          this.board = Array(9).fill("");
        }
        this.currentPlayer = "X";
        this.updateBoard();
        this.updateMoveHistory();
        this.updateStatus("Your turn (X)");
      }
    } else if (
      this.ws &&
      this.isConnected &&
      this.gameActive &&
      this.currentPlayer === this.player
    ) {
      this.ws.send(
        JSON.stringify({
          type: "undo",
          player: this.player,
        })
      );
    }
  }

  checkWinner() {
    const winPatterns = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // Rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // Columns
      [0, 4, 8],
      [2, 4, 6], // Diagonals
    ];

    // Check for winner
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (
        this.board[a] &&
        this.board[a] === this.board[b] &&
        this.board[a] === this.board[c]
      ) {
        return { winner: this.board[a], winningLine: pattern };
      }
    }

    // Check for potential draw
    const emptyCells = this.board.filter((cell) => cell === "").length;
    if (emptyCells <= 2) {
      const isDraw = this.predictDraw();
      if (isDraw) {
        return { winner: "draw", winningLine: null };
      }
    }

    return { winner: null, winningLine: null };
  }

  predictDraw() {
    // If only 1 or 2 cells are empty, check if a win is still possible
    const winPatterns = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // Rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // Columns
      [0, 4, 8],
      [2, 4, 6], // Diagonals
    ];

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      const cells = [this.board[a], this.board[b], this.board[c]];
      const emptyCount = cells.filter((cell) => cell === "").length;
      const xCount = cells.filter((cell) => cell === "X").length;
      const oCount = cells.filter((cell) => cell === "O").length;

      // If a pattern has only one empty cell and both X and O are present,
      // or if it has two empty cells but both players have moves in it,
      // this pattern can't be won
      if (
        (emptyCount === 1 && xCount > 0 && oCount > 0) ||
        (emptyCount === 2 && xCount === 1 && oCount === 1)
      ) {
        continue;
      }

      // If any pattern can still be won, it's not a draw
      if (emptyCount > 0 && !(xCount > 0 && oCount > 0)) {
        return false;
      }
    }

    return true;
  }
}

// Check for room code in URL
window.addEventListener("load", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get("room");

  const game = new TicTacToe();
  if (roomCode) {
    game.roomId = roomCode;
    game.connectToServer();
  }
});
