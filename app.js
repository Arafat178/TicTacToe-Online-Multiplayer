// ====== STEP 1: Add your Firebase config here ======
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

// ====== STEP 2: Game variables ======
let roomId = null;
let player = null; // "X" or "O"
let myTurn = false;

// ====== STEP 3: Make the board ======
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

// ====== STEP 4: Create / Join Room ======
function createRoom() {
  roomId = Math.random().toString(36).substr(2, 6); // 6-char ID
  player = "X";
  myTurn = true;

  db.ref("rooms/" + roomId).set({
    board: Array(9).fill(""),
    turn: "X",
    winner: null
  });

  setStatus("Room created! Share this ID: " + roomId);
  listenToRoom();
}

function joinRoom() {
  roomId = document.getElementById("roomIdInput").value.trim();
  if (!roomId) return alert("Enter a room ID!");

  db.ref("rooms/" + roomId).once("value").then(snapshot => {
    if (!snapshot.exists()) {
      alert("Room not found!");
      return;
    }

    player = "O";
    setStatus("Joined room: " + roomId);

    // turn ডাটাবেস থেকে আসবে, আমরা এখানে myTurn সেট করবো না
    listenToRoom();
  });
}

// ====== STEP 5: Listen for updates from Firebase ======
function listenToRoom() {
  db.ref("rooms/" + roomId).on("value", (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    updateBoard(data.board);

    if (data.winner) {
      setStatus("Winner: " + data.winner);
      myTurn = false;
      return;
    }

    setStatus("Turn: " + data.turn);
    myTurn = (data.turn === player);
  });
}

// ====== STEP 6: Make a move ======
function makeMove(index) {
  if (!myTurn) return;
  const cellRef = db.ref("rooms/" + roomId + "/board/" + index);

  cellRef.transaction((current) => {
    if (current === "") {
      return player;
    }
    return current;
  });

  // Change turn after move
  db.ref("rooms/" + roomId).once("value").then((snapshot) => {
    const data = snapshot.val();
    const newBoard = data.board;

    const winner = checkWinner(newBoard);
    if (winner) {
      db.ref("rooms/" + roomId + "/winner").set(winner);
    } else {
      const nextTurn = (data.turn === "X") ? "O" : "X";
      db.ref("rooms/" + roomId + "/turn").set(nextTurn);
    }
  });
}

// ====== STEP 7: Update board UI ======
function updateBoard(board) {
  document.querySelectorAll(".cell").forEach((cell, i) => {
    cell.innerText = board[i];
    if (board[i]) cell.classList.add("taken");
    else cell.classList.remove("taken");
  });
}

// ====== STEP 8: Check winner ======
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


