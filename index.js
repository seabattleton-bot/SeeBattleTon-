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

io.on("connection", socket => {

    socket.on("createRoom", () => {
        const roomId = uuidv4();
        rooms[roomId] = { players: [socket.id] };
        socket.join(roomId);
        socket.emit("roomCreated", roomId);
    });

    socket.on("joinRoom", roomId => {
        if (rooms[roomId] && rooms[roomId].players.length < 2) {
            rooms[roomId].players.push(socket.id);
            socket.join(roomId);
            io.to(roomId).emit("startGame");
        }
    });

});

server.listen(process.env.PORT || 3000);
  
