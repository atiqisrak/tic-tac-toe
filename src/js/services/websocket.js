export class WebSocketService {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?room=${this.game.roomId}`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log("WebSocket connection established");
      this.game.isConnected = true;
      this.reconnectAttempts = 0;
      this.game.updateStatus("Connected! Waiting for opponent...");
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.socket.onclose = () => {
      console.log("WebSocket connection closed");
      this.game.isConnected = false;
      this.handleDisconnect();
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.game.updateStatus("Connection error. Please try again.");
    };
  }

  handleMessage(data) {
    switch (data.type) {
      case "game_start":
        this.handleGameStart(data);
        break;
      case "move":
        this.handleMove(data);
        break;
      case "restart":
        this.handleRestart();
        break;
      case "undo":
        this.handleUndo();
        break;
      case "error":
        this.handleError(data.message);
        break;
      default:
        console.warn("Unknown message type:", data.type);
    }
  }

  handleGameStart(data) {
    this.game.player = data.player;
    this.game.gameActive = true;
    this.game.gameBoard.style.display = "grid";
    this.game.undoBtn.style.display = "block";
    this.game.updateStatus(`Game started! You are player ${this.game.player}`);
  }

  handleMove(data) {
    this.game.board[data.index] = data.player;
    this.game.moveHistory.push({
      player: data.player,
      index: data.index,
      timestamp: new Date(),
    });
    this.game.updateBoard();
    this.game.updateMoveHistory();

    const { winner, winningLine } = this.game.checkWinner(this.game.board);
    if (winner) {
      this.game.handleGameOver(winner, winningLine);
    } else {
      this.game.currentPlayer = this.game.currentPlayer === "X" ? "O" : "X";
      this.game.updateStatus(`${this.game.currentPlayer}'s turn`);
    }
  }

  handleRestart() {
    this.game.resetGame();
    this.game.gameActive = true;
    this.game.gameBoard.style.display = "grid";
    this.game.updateStatus("Game restarted! Your turn.");
  }

  handleUndo() {
    if (this.game.moveHistory.length >= 2) {
      this.game.moveHistory.pop();
      this.game.moveHistory.pop();
      const lastMove = this.game.moveHistory[this.game.moveHistory.length - 1];
      if (lastMove) {
        this.game.board[lastMove.index] = lastMove.player;
      } else {
        this.game.board = Array(9).fill("");
      }
      this.game.currentPlayer = "X";
      this.game.updateBoard();
      this.game.updateMoveHistory();
      this.game.updateStatus("Move undone. Your turn.");
    }
  }

  handleError(message) {
    this.game.updateStatus(`Error: ${message}`);
  }

  handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.game.updateStatus(
        `Connection lost. Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );
      setTimeout(
        () => this.connect(),
        this.reconnectDelay * this.reconnectAttempts
      );
    } else {
      this.game.updateStatus("Connection lost. Please refresh the page.");
    }
  }

  sendMove(index) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "move",
          index: index,
          player: this.game.currentPlayer,
        })
      );
    }
  }

  sendRestart() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "restart" }));
    }
  }

  sendUndo() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "undo" }));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}
