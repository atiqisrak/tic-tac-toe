# WebSocket Tic Tac Toe

A browser-based Tic Tac Toe game that can be played between two players using WebSocket communication.

## Features

- Modern, responsive UI
- Real-time game state synchronization
- Room-based multiplayer system
- Game state persistence
- Win detection and game restart functionality

## Requirements

- Node.js (for running the WebSocket server)
- A modern web browser
- Two players with internet connection

## Setup Instructions

### Server Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

The server will start running on port 8080.

### Playing the Game

1. Open the game in two different browsers or browser windows
2. In the first window:
   - Click "Host Game"
   - You'll receive a room code
3. In the second window:
   - Click "Join Game"
   - Enter the room code from the first window
4. The game will start automatically when both players are connected
5. Take turns making moves by clicking on the empty cells
6. The game will automatically detect wins or draws
7. Click "Restart Game" to play again

## Technical Details

The game uses WebSocket for real-time communication between players. The server acts as a mediator, handling:

- Room creation and management
- Player connections
- Move validation and synchronization
- Game state management
- Win detection

## Browser Support

The game works in all modern browsers that support WebSocket:

- Chrome
- Firefox
- Safari
- Edge

## Development

To modify the game:

1. The server logic is in `server.js`
2. The client-side game logic is in `game.js`
3. The UI is styled in `styles.css`

## Security Note

For production deployment:

1. Use HTTPS for the web server
2. Use WSS (WebSocket Secure) for the WebSocket connection
3. Implement proper authentication if needed
4. Consider rate limiting and other security measures
