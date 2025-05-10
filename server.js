const WebSocket = require("ws");
const express = require("express");
const path = require("path");
const os = require("os");

// Create Express app
const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Serve static files from the current directory
app.use(express.static(__dirname));

// Create HTTP server
const server = require("http").createServer(app);

// Create WebSocket server with CORS enabled
const wss = new WebSocket.Server({
  server,
  // Enable CORS for WebSocket
  verifyClient: (info, callback) => {
    callback(true);
  },
});

// Store connected players and their game rooms
const rooms = new Map();

// Function to get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

wss.on("connection", (ws) => {
  let playerId = null;
  let roomId = null;

  console.log("New WebSocket connection established");

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    console.log("Received message:", data);

    switch (data.type) {
      case "join":
        // Handle player joining
        playerId = data.playerId;
        roomId = data.roomId;
        console.log(`Player ${playerId} joining room ${roomId}`);

        if (!rooms.has(roomId)) {
          console.log(`Creating new room ${roomId}`);
          rooms.set(roomId, {
            players: new Map([[ws, "X"]]),
            gameState: Array(9).fill(""),
            currentPlayer: "X",
            moveHistory: [],
            lastMove: null,
          });
          ws.send(
            JSON.stringify({
              type: "joined",
              player: "X",
              message: "Waiting for opponent...",
            })
          );
        } else {
          const room = rooms.get(roomId);
          if (room.players.size < 2) {
            console.log(`Adding second player to room ${roomId}`);
            room.players.set(ws, "O");
            ws.send(
              JSON.stringify({
                type: "joined",
                player: "O",
                message: "Game starting!",
              })
            );
            // Notify both players that the game can start
            room.players.forEach((player, playerWs) => {
              playerWs.send(
                JSON.stringify({
                  type: "start",
                  gameState: room.gameState,
                  currentPlayer: room.currentPlayer,
                })
              );
            });
          } else {
            console.log(`Room ${roomId} is full`);
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Room is full",
              })
            );
          }
        }
        break;

      case "move":
        // Handle player moves
        if (roomId && rooms.has(roomId)) {
          const room = rooms.get(roomId);
          const { index, player } = data;
          console.log(`Player ${player} making move at index ${index}`);

          // Validate move
          if (room.gameState[index] === "" && room.currentPlayer === player) {
            room.gameState[index] = player;
            room.currentPlayer = player === "X" ? "O" : "X";
            room.lastMove = { index, player };

            // Broadcast move to all players in the room
            room.players.forEach((_, playerWs) => {
              playerWs.send(
                JSON.stringify({
                  type: "move",
                  index,
                  player,
                  gameState: room.gameState,
                  currentPlayer: room.currentPlayer,
                })
              );
            });

            // Check for win or draw
            const { winner, winningLine } = checkWinner(room.gameState);
            if (winner) {
              console.log(`Player ${winner} wins!`);
              room.players.forEach((_, playerWs) => {
                playerWs.send(
                  JSON.stringify({
                    type: "gameOver",
                    winner,
                    gameState: room.gameState,
                    winningLine,
                  })
                );
              });
            } else if (room.gameState.every((cell) => cell !== "")) {
              console.log("Game ended in a draw");
              room.players.forEach((_, playerWs) => {
                playerWs.send(
                  JSON.stringify({
                    type: "gameOver",
                    winner: "draw",
                    gameState: room.gameState,
                  })
                );
              });
            }
          }
        }
        break;

      case "restart":
        // Handle game restart
        if (roomId && rooms.has(roomId)) {
          console.log(`Restarting game in room ${roomId}`);
          const room = rooms.get(roomId);
          room.gameState = Array(9).fill("");
          room.currentPlayer = "X";
          room.moveHistory = [];
          room.lastMove = null;
          room.players.forEach((_, playerWs) => {
            playerWs.send(
              JSON.stringify({
                type: "restart",
                gameState: room.gameState,
                currentPlayer: room.currentPlayer,
              })
            );
          });
        }
        break;

      case "undo":
        // Handle undo move
        if (roomId && rooms.has(roomId)) {
          const room = rooms.get(roomId);
          if (room.lastMove && room.lastMove.player === data.player) {
            const { index } = room.lastMove;
            room.gameState[index] = "";
            room.currentPlayer = data.player;
            room.lastMove = null;

            room.players.forEach((_, playerWs) => {
              playerWs.send(
                JSON.stringify({
                  type: "move",
                  index,
                  player: data.player,
                  gameState: room.gameState,
                  currentPlayer: room.currentPlayer,
                })
              );
            });
          }
        }
        break;

      case "chat":
        // Handle chat messages
        if (roomId && rooms.has(roomId)) {
          const room = rooms.get(roomId);
          room.players.forEach((_, playerWs) => {
            playerWs.send(
              JSON.stringify({
                type: "chat",
                message: data.message,
                player: data.player,
              })
            );
          });
        }
        break;
    }
  });

  ws.on("close", () => {
    console.log(`Connection closed for player ${playerId} in room ${roomId}`);
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.players.delete(ws);
      if (room.players.size === 0) {
        console.log(`Removing empty room ${roomId}`);
        rooms.delete(roomId);
      } else {
        // Notify remaining player
        console.log(`Notifying remaining player in room ${roomId}`);
        room.players.forEach((_, playerWs) => {
          playerWs.send(
            JSON.stringify({
              type: "opponentLeft",
              message: "Opponent has left the game",
            })
          );
        });
      }
    }
  });
});

function checkWinner(board) {
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
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winningLine: pattern };
    }
  }
  return { winner: null, winningLine: null };
}

// Start the server
const PORT = process.env.PORT || 3000;
const localIP = getLocalIP();
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Local IP Address: http://${localIP}:${PORT}`);
});
