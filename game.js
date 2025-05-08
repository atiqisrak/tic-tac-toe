class TicTacToe {
  constructor() {
    this.board = Array(9).fill("");
    this.currentPlayer = "X";
    this.isHost = false;
    this.isConnected = false;
    this.ws = null;
    this.player = null;
    this.roomId = null;
    this.gameActive = false;

    // DOM elements
    this.cells = document.querySelectorAll(".cell");
    this.status = document.getElementById("status");
    this.hostBtn = document.getElementById("hostBtn");
    this.joinBtn = document.getElementById("joinBtn");
    this.restartBtn = document.getElementById("restartBtn");

    // Bind event listeners
    this.hostBtn.addEventListener("click", () => this.hostGame());
    this.joinBtn.addEventListener("click", () => this.joinGame());
    this.restartBtn.addEventListener("click", () => this.restartGame());
    this.cells.forEach((cell) => {
      cell.addEventListener("click", () => this.handleCellClick(cell));
    });

    // Initialize the board
    this.updateBoard();
  }

  generateRoomId() {
    return Math.random().toString(36).substring(2, 8);
  }

  async hostGame() {
    try {
      this.roomId = this.generateRoomId();
      this.connectToServer();
      this.isHost = true;

      // Create a more visible room code display
      const roomCodeDisplay = document.createElement("div");
      roomCodeDisplay.className = "room-code";
      roomCodeDisplay.innerHTML = `
        <h3>Room Code:</h3>
        <div class="code-container">
          <span id="roomCode">${this.roomId}</span>
          <button onclick="navigator.clipboard.writeText('${this.roomId}')" class="copy-btn">
            Copy
          </button>
        </div>
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

      this.updateStatus("Waiting for opponent to join...");
    } catch (error) {
      console.error("Error hosting game:", error);
      this.updateStatus("Error creating room: " + error.message);
    }
  }

  async joinGame() {
    try {
      const roomId = prompt("Enter the room code:");
      if (!roomId) return;

      this.roomId = roomId;
      this.connectToServer();
      this.isHost = false;
    } catch (error) {
      console.error("Error joining game:", error);
      this.updateStatus("Error joining room: " + error.message);
    }
  }

  connectToServer() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = window.location.port || "8080";
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
            this.hostBtn.disabled = true;
            this.joinBtn.disabled = true;
            console.log(`Joined as player ${this.player}`);
            break;

          case "start":
            console.log("Game starting with state:", data.gameState);
            this.board = data.gameState;
            this.currentPlayer = data.currentPlayer;
            this.gameActive = true;
            this.updateBoard();
            this.updateStatus(`${this.currentPlayer}'s turn`);
            break;

          case "move":
            console.log("Move received:", data);
            this.board = data.gameState;
            this.currentPlayer = data.currentPlayer;
            this.updateBoard();
            this.updateStatus(`${this.currentPlayer}'s turn`);
            break;

          case "gameOver":
            console.log("Game over:", data);
            this.board = data.gameState;
            this.gameActive = false;
            this.updateBoard();
            if (data.winner === "draw") {
              this.updateStatus("It's a draw!");
            } else {
              this.updateStatus(`Player ${data.winner} wins!`);
            }
            this.restartBtn.style.display = "block";
            break;

          case "restart":
            console.log("Game restarted");
            this.board = data.gameState;
            this.currentPlayer = data.currentPlayer;
            this.gameActive = true;
            this.updateBoard();
            this.updateStatus(`Game restarted! ${this.currentPlayer}'s turn`);
            this.restartBtn.style.display = "none";
            break;

          case "opponentLeft":
            console.log("Opponent left");
            this.gameActive = false;
            this.updateStatus(data.message);
            this.restartBtn.style.display = "block";
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
        this.hostBtn.disabled = false;
        this.joinBtn.disabled = false;
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
        this.isConnected = false;
        this.gameActive = false;
        this.updateStatus("Connection lost. Please refresh the page.");
        this.hostBtn.disabled = false;
        this.joinBtn.disabled = false;
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      this.updateStatus("Failed to connect. Please try again.");
      this.isConnected = false;
      this.gameActive = false;
      this.hostBtn.disabled = false;
      this.joinBtn.disabled = false;
    }
  }

  async handleCellClick(cell) {
    if (
      !this.isConnected ||
      !this.gameActive ||
      this.board[cell.dataset.index] !== "" ||
      this.currentPlayer !== this.player
    ) {
      return;
    }

    const index = parseInt(cell.dataset.index);
    this.ws.send(
      JSON.stringify({
        type: "move",
        index,
        player: this.player,
      })
    );
  }

  updateBoard() {
    this.cells.forEach((cell, index) => {
      cell.textContent = this.board[index];
      cell.classList.remove("x", "o");
      if (this.board[index]) {
        cell.classList.add(this.board[index].toLowerCase());
      }
    });
  }

  async restartGame() {
    if (this.ws && this.isConnected) {
      this.ws.send(
        JSON.stringify({
          type: "restart",
        })
      );
    }
  }

  updateStatus(message) {
    this.status.textContent = message;
  }
}

// Initialize the game
const game = new TicTacToe();
