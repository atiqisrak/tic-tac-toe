export function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function checkWinner(board) {
  const lines = [
    [0, 1, 2], // top row
    [3, 4, 5], // middle row
    [6, 7, 8], // bottom row
    [0, 3, 6], // left column
    [1, 4, 7], // middle column
    [2, 5, 8], // right column
    [0, 4, 8], // diagonal top-left to bottom-right
    [2, 4, 6], // diagonal top-right to bottom-left
  ];

  // Check for winner
  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winningLine: line };
    }
  }

  // Check for draw
  if (board.every((cell) => cell !== "")) {
    return { winner: "draw", winningLine: null };
  }

  // Game still in progress
  return { winner: null, winningLine: null };
}

export function predictDraw(board) {
  // Count X's and O's
  const xCount = board.filter((cell) => cell === "X").length;
  const oCount = board.filter((cell) => cell === "O").length;

  // If there's a significant difference in counts, no draw is possible
  if (Math.abs(xCount - oCount) > 1) {
    return false;
  }

  // Check if there are any winning moves available
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
    // Check if any line has two same symbols and an empty cell
    if (
      (board[a] === board[b] && board[a] !== "" && board[c] === "") ||
      (board[a] === board[c] && board[a] !== "" && board[b] === "") ||
      (board[b] === board[c] && board[b] !== "" && board[a] === "")
    ) {
      return false;
    }
  }

  // If we get here, no winning moves are available
  return true;
}
