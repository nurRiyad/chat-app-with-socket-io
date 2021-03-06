const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const { generateMsg } = require("./msg");
const { addUser, removeUser, getUser, getUserInRoom } = require("./users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

io.on("connection", (socket) => {
  //when a user join a specific room
  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });
    if (error) {
      return callback(error);
    }
    socket.join(user.room);

    socket.emit(
      "newMsg",
      generateMsg("Welcome! you are connected through the socket.io", "Admin")
    );

    socket.broadcast
      .to(user.room)
      .emit(
        "newMsg",
        generateMsg(`${user.username} just joined the room`, "Admin")
      );
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUserInRoom(user.room),
    });

    callback();
  });

  // sending message from server to client
  socket.on("sendMsg", (msg, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit("newMsg", generateMsg(msg, user.username));
    callback();
  });

  // Sending location from server to client
  socket.on("sendLocation", (msg, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit("locationMsg", generateMsg(msg, user.username));
    callback();
  });

  // Sending information when a user leave or disconnect from the room
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "newMsg",
        generateMsg(`${user.username} just left the room`, "Admin")
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUserInRoom(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
