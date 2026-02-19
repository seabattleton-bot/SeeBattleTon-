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

function createBoard() {
    return Array.from({ length: 10 }, () =>
        Array.from({ length: 10 }, () => ({
            ship: false,
            hit: false
        }))
    );
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
            room.boards[room.players[0]] = createBoard();
            room.boards[room.players[1]] = createBoard();
            room.turn = room.players[0];

            socket.join(roomId);
            io.to(roomId).emit("startGame");
        }
    });

    socket.on("placeShips", ({ roomId, board }) => {
        if (rooms[roomId]) {
            rooms[roomId].boards[socket.id] = board;
        }
    });

    socket.on("move", ({ roomId, row, col }) => {
        const room = rooms[roomId];
        if (!room) return;

        if (room.turn !== socket.id) return;

        const opponent = room.players.find(p => p !== socket.id);
        const cell = room.boards[opponent][row][col];

        if (cell.hit) return;

        cell.hit = true;

        if (!cell.ship) {
            room.turn = opponent;
        }

        io.to(roomId).emit("update", {
            boards: room.boards,
            turn: room.turn
        });
    });

});

server.listen(process.env.PORT || 3000);
    
