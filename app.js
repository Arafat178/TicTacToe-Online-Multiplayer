// ===== STEP 1: Firebase Config =====
const firebaseConfig = {
  apiKey: "AIzaSyANCz6-spzPM799qLSHpBqpEWCzIh0N7Pc",
  authDomain: "tictactoe-f6d0b.firebaseapp.com",
  projectId: "tictactoe-f6d0b",
  databaseURL: "https://tictactoe-f6d0b-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "tictactoe-f6d0b.firebasestorage.app",
  messagingSenderId: "535080720497",
  appId: "1:535080720497:web:5153a249ff25dae470e3d0",
  measurementId: "G-D94R2BFWZH"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ===== STEP 2: Game Variables =====
let roomId = null;
let player = null; // "X" or "O"
let myTurn = false;

// ===== STEP 3: Create Board =====
const boardDiv = document.getElementById("board");
for (let i = 0; i < 9; i++) {
  const cell = document.createElement("div");
  cell.classList.add("cell");
  cell.dataset.index = i;
  cell.addEventListener("click", () => makeMove(i));
  boardDiv.appendChild(cell);
}

function setStatus(msg) {
  document.getElementById("status").innerText = msg;
}

// ===== STEP 4: Create Room =====
function createRoom() {
  const customId = document.getElementById("roomIdInput").value.trim();
  const playerName = document.getElementById("playerNameInput").value.trim() || "Player X";
  roomId = customId || Math.random().toString(36).substr(2, 6);
  player = "X";
  myTurn = true;

  db.ref("rooms/" + roomId).set({
    board: Array(9).fill(""),
    turn: "X",
    winner: null,
    players: { X: { name: playerName, wins: 0 }, O: { name: null, wins: 0 } },
    draws: 0
  });

  setStatus("Room created! Share this ID: " + roomId);
  listenToRoom();
}

// ===== STEP 5: Join Room =====
function joinRoom() {
  roomId = document.getElementById("roomIdInput").value.trim();
  const playerName = document.getElementById("playerNameInput").value.trim() || "Player O";

  if (!roomId) return alert("Enter a Room ID to join!");

  db.ref("rooms/" + roomId).once("value").then(snapshot => {
    if (!snapshot.exists()) {
      alert("Room not found! Check the ID.");
      roomId = null;
      return;
    }

    player = "O"; // joiner
    myTurn = false;
    db.ref("rooms/" + roomId + "/players/O/name").set(playerName);
    setStatus("Joined room: " + roomId);
    listenToRoom();
  });
}

// ===== STEP 6: Listen to Firebase =====
function listenToRoom() {
  db.ref("rooms/" + roomId).on("value", snapshot => {
    const data = snapshot.val();
    if (!data) return;

    updateBoard(data.board);

    const continueBtn = document.getElementById("continueBtn");
    const popup = document.getElementById("winnerPopup");

    if (data.winner) {
      // Show winner or draw in status
      setStatus(data.winner === "Draw" ? "Draw!" : "Winner: " + data.winner);
      myTurn = false;
      continueBtn.disabled = false; // Enable Continue button after round

      // Show popup
      if (data.winner === "Draw") {
        popup.innerText = "Draw!";
      } else {
        const winnerName = data.players[data.winner]?.name || data.winner;
        popup.innerText = `Win: ${winnerName}!`;
      }
      popup.classList.remove("hidden");
      popup.classList.add("show");

    } else {
      // Active round
      setStatus(`Turn: ${data.turn} | You are ${player}`);
      myTurn = (data.turn === player);
      continueBtn.disabled = true;

      // Hide popup during active round
      popup.classList.remove("show");
      popup.classList.add("hidden");
    }

    // Update stats
    const playerX = data.players.X;
    const playerO = data.players.O;
    document.getElementById("playerXStats").innerText = `${playerX.name || "Player X"}: ${playerX.wins} Wins`;
    document.getElementById("playerOStats").innerText = `${playerO.name || "Player O"}: ${playerO.wins} Wins`;
    document.getElementById("drawStats").innerText = `Draws: ${data.draws}`;
  });
}

// ===== STEP 7: Make Move =====
function makeMove(index) {
  if (!myTurn) return;

  const cellRef = db.ref("rooms/" + roomId + "/board/" + index);
  cellRef.transaction(current => {
    if (current === "") return player;
    return current;
  }, () => {
    // Play sound
    const audio = document.getElementById("moveSound");
    audio.currentTime = 0;
    audio.play().catch(err => console.log("Sound error:", err));

    // Check winner and update turn
    db.ref("rooms/" + roomId).once("value").then(snapshot => {
      const data = snapshot.val();
      const winner = checkWinner(data.board);

      if (winner) {
        db.ref("rooms/" + roomId + "/winner").set(winner);

        // Update stats atomically
        if (winner === "X") {
        db.ref(`rooms/${roomId}/players/X/wins`).transaction(prev => (prev || 0) + 1);
        } else if (winner === "O") {
        db.ref(`rooms/${roomId}/players/O/wins`).transaction(prev => (prev || 0) + 1);
        } else if (winner === "Draw") {
        db.ref(`rooms/${roomId}/draws`).transaction(prev => (prev || 0) + 1);
        }

      } else {
        const nextTurn = (data.turn === "X") ? "O" : "X";
        db.ref("rooms/" + roomId + "/turn").set(nextTurn);
      }
    });
  });
}

// ===== STEP 8: Continue Game =====
function continueGame() {
  if (!roomId) return;

  // Get the last round's turn so we can alternate
  db.ref("rooms/" + roomId + "/turn").once("value").then(snapshot => {
    const lastTurn = snapshot.val() || "O"; // Default to O if somehow null
    const nextStarter = (lastTurn === "X") ? "O" : "X"; // flip

    db.ref("rooms/" + roomId).update({
      board: Array(9).fill(""),
      turn: nextStarter,
      winner: null
    });

    setStatus(`New round started! Turn: ${nextStarter}`);
    myTurn = (player === nextStarter); // set your turn according to starter
  });
}

// pop up window for winner
function showWinnerPopup(text) {
  const popup = document.getElementById("winnerPopup");
  popup.innerText = text;
  popup.classList.remove("hidden");
  popup.classList.add("show");
}





// ===== STEP 9: Update Board UI =====
function updateBoard(board) {
  document.querySelectorAll(".cell").forEach((cell, i) => {
    cell.innerText = board[i];
    cell.classList.remove("taken", "x", "o");

    if (board[i]) {
      cell.classList.add("taken");
      if (board[i] === "X") cell.classList.add("x");
      if (board[i] === "O") cell.classList.add("o");
    }
  });
}

// ===== STEP 10: Check Winner =====
function checkWinner(board) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  for (let [a,b,c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }

  if (board.every(cell => cell !== "")) return "Draw";
  return null;
}
