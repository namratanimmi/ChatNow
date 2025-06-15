// --- COMPLETE CORRECTED CODE for server/index.js ---

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import ChatMessage from "./models/ChatMessage.js"; // 1. IMPORT YOUR MESSAGE MODEL

import "./config/mongo.js";

import { VerifyToken, VerifySocketToken } from "./middlewares/VerifyToken.js";
import chatRoomRoutes from "./routes/chatRoom.js";
import chatMessageRoutes from "./routes/chatMessage.js";
import userRoutes from "./routes/user.js";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(VerifyToken);

const PORT = process.env.PORT || 8080;

app.use("/api/room", chatRoomRoutes);
app.use("/api/message", chatMessageRoutes);
app.use("/api/user", userRoutes);

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

io.use(VerifySocketToken);

const onlineUsers = new Map();

io.on("connection", (socket) => {
  // --- USER ONLINE STATUS LOGIC (IMPROVED) ---
  socket.on("addUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    // Broadcast to EVERYONE that the online user list has changed
    io.emit("getUsers", Array.from(onlineUsers.keys()));
  });

  // --- ROOM-BASED LOGIC ---
  // A user must join a room to receive messages for that chat
  socket.on("joinRoom", (chatRoomId) => {
    socket.join(chatRoomId);
  });

  // --- REAL-TIME MESSAGING LOGIC (THE MAIN FIX) ---
  socket.on("sendMessage", async (data) => {
    const { chatRoomId, senderId, message } = data;

    try {
      // 2. Create a new message and save it to MongoDB
      const newMessage = new ChatMessage({
        chatRoomId,
        sender: senderId,
        message,
      });
      const savedMessage = await newMessage.save();

      // 3. Populate sender info so the frontend can display it immediately
      const populatedMessage = await ChatMessage.findById(savedMessage._id)
        .populate("sender", "displayName avatar _id");

      // 4. Broadcast the complete, saved message to everyone in the specific chat room
      io.to(chatRoomId).emit("receiveMessage", populatedMessage);

    } catch (error) {
      console.error("Error handling sent message:", error);
      // Optional: send an error message back to the sender
      socket.emit("sendMessageError", { error: "Message could not be sent." });
    }
  });

  // --- DISCONNECT LOGIC (IMPROVED) ---
  socket.on("disconnect", () => {
    // Find which userId belongs to the disconnected socket.id
    let userIdToRemove;
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        userIdToRemove = userId;
        break;
      }
    }
    // If found, remove them and broadcast the updated user list
    if (userIdToRemove) {
      onlineUsers.delete(userIdToRemove);
      io.emit("getUsers", Array.from(onlineUsers.keys()));
    }
  });
});