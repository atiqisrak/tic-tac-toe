import { WebSocketService } from "./services/websocket.js";
import { BotService } from "./services/bot.js";
import { QRCodeService } from "./services/qrcode.js";
import { generateRoomId, checkWinner } from "./utils/gameUtils.js";

class TicTacToe {
  constructor() {
    this.board = Array(9).fill("");
    this.currentPlayer = Math.random() < 0.5 ? "X" : "O";
    this.isHost = false;
    this.isConnected = false;
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

    // Initialize services
    this.wsService = new WebSocketService(this);
    this.botService = new BotService(this);
    this.qrService = new QRCodeService(this);

    // Initialize DOM elements
    this.initializeDOMElements();
    this.bindEventListeners();
  }

  initializeDOMElements() {
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
  }

  bindEventListeners() {
    this.hostBtn.addEventListener("click", () => this.hostGame());
    this.joinBtn.addEventListener("click", () => this.showJoinOptions());
    this.botBtn.addEventListener("click", () => this.showDifficultySelect());
    this.scanQRBtn.addEventListener("click", () =>
      this.qrService.startScanner()
    );
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
    this.closeScanner.addEventListener("click", () =>
      this.qrService.stopScanner()
    );
    this.restartGameBtn.addEventListener("click", () => this.restartGame());
    this.goHomeBtn.addEventListener("click", () => this.showWelcomeScreen());
    this.cells.forEach((cell) => {
      cell.addEventListener("click", () => this.handleCellClick(cell));
    });

    document.querySelectorAll("[data-difficulty]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.botDifficulty = e.target.dataset.difficulty;
        this.startBotGame();
      });
    });
  }

  showWelcomeScreen() {
    this.welcomeScreen.style.display = "block";
    this.joinOptions.style.display = "none";
    this.difficultySelect.style.display = "none";
    this.gameContainer.style.display = "none";
    this.gameOverPopup.style.display = "none";
    this.qrService.stopScanner();
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

  async hostGame() {
    try {
      this.roomId = generateRoomId();
      this.wsService.connect();
      this.isHost = true;

      // Create and show popup for room code and QR code
      const popup = document.createElement("div");
      popup.className = "room-code-popup";
      const currentUrl = window.location.href.split("?")[0];
      const roomUrl = `${currentUrl}?room=${this.roomId}`;

      popup.innerHTML = `
        <div class="popup-content">
          <h3>Share this code with your opponent</h3>
          <div class="code-container">
            <span id="roomCode">${this.roomId}</span>
            <button onclick="navigator.clipboard.writeText('${roomUrl}')" class="copy-btn">
              Copy Link
            </button>
          </div>
          <div class="qr-code" id="qrCode"></div>
          <div class="popup-status">Waiting for opponent to join...</div>
          <button class="close-popup-btn">Close</button>
        </div>
      `;

      // Remove any existing popup
      const existingPopup = document.querySelector(".room-code-popup");
      if (existingPopup) {
        existingPopup.remove();
      }

      // Add popup to the body
      document.body.appendChild(popup);

      // Add close button functionality
      const closeBtn = popup.querySelector(".close-popup-btn");
      closeBtn.addEventListener("click", () => {
        popup.remove();
        this.wsService.disconnect();
        this.showWelcomeScreen();
      });

      // Generate QR code
      await this.qrService.generateQRCode(roomUrl);

      // Update status in popup
      const statusElement = popup.querySelector(".popup-status");
      const originalUpdateStatus = this.updateStatus;
      this.updateStatus = (message) => {
        statusElement.textContent = message;
        if (message.includes("Game starting")) {
          popup.remove();
          this.showGameScreen();
          this.gameBoard.style.display = "grid";
          this.restartBtn.style.display = "block";
          this.undoBtn.style.display = "block";
          // Restore original updateStatus function
          this.updateStatus = originalUpdateStatus;
        }
      };
    } catch (error) {
      console.error("Error hosting game:", error);
      this.updateStatus("Error creating room: " + error.message);
    }
  }

  async joinGame(roomId = null) {
    try {
      if (!roomId) {
        roomId = prompt("Enter the room code:");
        if (!roomId) return;
      }

      this.roomId = roomId;
      this.wsService.connect();
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

  makeMove(index) {
    if (!this.gameActive || this.board[index] !== "") return;

    requestAnimationFrame(() => {
      this.board[index] = this.currentPlayer;
      this.moveHistory.push({
        player: this.currentPlayer,
        index,
        timestamp: new Date(),
      });

      this.updateBoard();
      this.updateMoveHistory();

      const { winner, winningLine } = checkWinner(this.board);
      if (winner) {
        this.handleGameOver(winner, winningLine);
      } else {
        this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";
        this.updateStatus(`${this.currentPlayer}'s turn`);

        if (this.isBotGame && this.currentPlayer === "O") {
          setTimeout(() => this.botService.makeMove(), 500);
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

  handleCellClick(cell) {
    if (!this.gameActive || this.board[cell.dataset.index] !== "") return;

    const index = parseInt(cell.dataset.index);

    if (this.isBotGame) {
      if (this.currentPlayer === this.player) {
        this.makeMove(index);
      }
    } else {
      this.wsService.sendMove(index);
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

  restartGame() {
    if (this.isBotGame) {
      this.resetGame();
      this.startBotGame();
    } else {
      this.wsService.sendRestart();
    }
  }

  resetGame() {
    this.board = Array(9).fill("");
    this.currentPlayer = Math.random() < 0.5 ? "X" : "O";
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
        ? ["#10b981", "#059669", "#34d399"]
        : ["#10b981", "#059669", "#34d399"];
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors,
    });
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
    } else {
      this.wsService.sendUndo();
    }
  }
}

// Check for room code in URL
window.addEventListener("load", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get("room");

  const game = new TicTacToe();
  if (roomCode) {
    game.roomId = roomCode;
    game.wsService.connect();
  }
});
