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
  roomId = customId || Math.random().toString(36).substr(2, 6); // custom or random ID

  player = "X";
  myTurn = true;

  // Save room in database
  db.ref("rooms/" + roomId).set({
    board: Array(9).fill(""),
    turn: "X",
    winner: null
  });

  setStatus("Room created! Share this ID: " + roomId);
  console.log("Room created:", roomId);
  listenToRoom();
}

// ===== STEP 5: Join Room =====
function joinRoom() {
  roomId = document.getElementById("roomIdInput").value.trim();
  if (!roomId) return alert("Enter a Room ID to join!");

  console.log("Trying to join room:", roomId);

  db.ref("rooms/" + roomId).once("value").then(snapshot => {
    console.log("Snapshot exists?", snapshot.exists(), snapshot.val());
    if (!snapshot.exists()) {
      alert("Room not found! Check the ID.");
      roomId = null;
      return;
    }

    player = "O"; // joiner
    myTurn = false;
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

    if (data.winner) {
      setStatus(data.winner === "Draw" ? "Draw!" : "Winner: " + data.winner);
      myTurn = false;
      return;
    }

    setStatus(`Turn: ${data.turn} | You are ${player}`);
    myTurn = (data.turn === player);
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
    // Update turn and check winner
    db.ref("rooms/" + roomId).once("value").then(snapshot => {
      const data = snapshot.val();
      const winner = checkWinner(data.board);
      if (winner) {
        db.ref("rooms/" + roomId + "/winner").set(winner);
      } else {
        const nextTurn = (data.turn === "X") ? "O" : "X";
        db.ref("rooms/" + roomId + "/turn").set(nextTurn);
      }
    });
  });
}

// ===== STEP 8: Update Board UI =====
function updateBoard(board) {
  document.querySelectorAll(".cell").forEach((cell, i) => {
    cell.innerText = board[i];
    if (board[i]) cell.classList.add("taken");
    else cell.classList.remove("taken");
  });
}

// ===== STEP 9: Check Winner =====
function checkWinner(board) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  for (let [a,b,c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (board.every(cell => cell !== "")) return "Draw";
  return null;
}
