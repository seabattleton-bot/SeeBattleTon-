const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.static("public"));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let rooms = {};

function checkWin(board){
    for(let r=0;r<10;r++){
        for(let c=0;c<10;c++){
            if(board[r][c].ship && !board[r][c].hit){
                return false;
            }
        }
    }
    return true;
}

io.on("connection", socket => {

    socket.on("createRoom", () => {
        const roomId = uuidv4();
        rooms[roomId] = {
            players: [socket.id],
            boards: {},
            turn: null
        };
        socket.join(roomId);
        socket.emit("roomCreated", roomId);
    });

    socket.on("joinRoom", roomId => {
        const room = rooms[roomId];
        if (room && room.players.length < 2) {
            room.players.push(socket.id);
            room.turn = room.players[0];
            socket.join(roomId);
            io.to(roomId).emit("startGame");
        }
    });

    socket.on("placeShips", ({ roomId, board }) => {
        const room = rooms[roomId];
        if (!room) return;
        room.boards[socket.id] = board;
    });

    socket.on("move", ({ roomId, row, col }) => {
        const room = rooms[roomId];
        if (!room) return;
        if (room.turn !== socket.id) return;

        const opponent = room.players.find(p => p !== socket.id);
        const board = room.boards[opponent];
        const cell = board[row][col];

        if (cell.hit) return;

        cell.hit = true;

        if (!cell.ship) {
            room.turn = opponent;
        }

        let winner = null;
        if (checkWin(board)) {
            winner = socket.id;
        }

        io.to(roomId).emit("update", {
            boards: room.boards,
            turn: room.turn,
            winner
        });
    });

});

server.listen(process.env.PORT || 3000);
