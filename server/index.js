// ChatNow/server/index.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import ChatMessage from "./models/ChatMessage.js"; // Make sure this path is correct

import "./config/mongo.js"; // Establishes MongoDB connection

import { VerifyToken, VerifySocketToken } from "./middlewares/VerifyToken.js";
import chatRoomRoutes from "./routes/chatRoom.js";
import chatMessageRoutes from "./routes/chatMessage.js";
import userRoutes from "./routes/user.js";

const app = express();
dotenv.config();

// --- Global Middlewares ---
app.use(cors({
    origin: "http://localhost:3000", // For development. Update for production!
    // For production, use an array or a function to check allowed origins:
    // origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Health Check Route (does NOT use VerifyToken) ---
app.get("/", (req, res) => {
  res.status(200).send("ChatNow Server is healthy and running!");
});

// --- API Routes ---
// Apply VerifyToken middleware ONLY to routes starting with /api
app.use("/api", VerifyToken, (req, res, next) => { // You can chain middlewares
  // This is just a placeholder to show chaining. VerifyToken calls next() if successful.
  // console.log(`Accessing API route: ${req.method} ${req.originalUrl} by user: ${req.user?.uid}`);
  next();
});

app.use("/api/room", chatRoomRoutes);
app.use("/api/message", chatMessageRoutes);
app.use("/api/user", userRoutes);

// --- Server Setup ---
// IMPORTANT: Ensure this PORT matches your ChatService.js and Render settings (e.g., 5001)
const PORT = process.env.PORT || 5001; // Defaulting to 5001 for consistency
const server = app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`🔗 API base: http://localhost:${PORT}/api`);
});

// --- Socket.io Setup ---
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // For development. Update for production!
    // origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.use(VerifySocketToken); // Apply token verification to all incoming socket connections

const onlineUsers = new Map(); // userId -> socket.id

// Helper to get userId from socket.id (if needed, less common now with direct userId)
const getUserIdBySocketId = (socketId) => {
    for (const [userId, sId] of onlineUsers.entries()) {
        if (sId === socketId) {
            return userId;
        }
    }
    return null;
};

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}, User UID (from token): ${socket.user?.uid}`);

  socket.on("addUser", (userId) => { // Client explicitly sends its userId
    if (userId && socket.user && userId === socket.user.uid) { // Ensure provided userId matches token's uid
        console.log(`➕ User ${userId} (Socket: ${socket.id}) added to online list.`);
        onlineUsers.set(userId, socket.id);
        io.emit("getUsers", Array.from(onlineUsers.keys()));
    } else {
        console.warn(`⚠️ addUser event: Mismatch or missing userId/socket.user. Provided: ${userId}, Token UID: ${socket.user?.uid}, Socket: ${socket.id}`);
    }
  });

  socket.on("joinRoom", (chatRoomId) => {
    if (chatRoomId) {
        socket.join(chatRoomId);
        console.log(`🚪 Socket ${socket.id} (User: ${socket.user?.uid}) joined room: ${chatRoomId}`);
    }
  });

  socket.on("leaveRoom", (chatRoomId) => { // Client should emit this
    if (chatRoomId) {
        socket.leave(chatRoomId);
        console.log(`🚪 Socket ${socket.id} (User: ${socket.user?.uid}) left room: ${chatRoomId}`);
    }
  });

  socket.on("sendMessage", async (data) => { // This is client's "new message to be saved and broadcasted"
    // 'data' should be: { chatRoomId, senderId (should match socket.user.uid), message (text) }
    // The client should get senderId from its own auth context (currentUser.uid)
    console.log(`💬 Received 'sendMessage' from User ${socket.user?.uid} (Socket: ${socket.id}):`, data);

    if (!socket.user || !socket.user.uid) {
        console.error("Error: sendMessage event from unauthenticated socket.");
        socket.emit("sendMessageError", { error: "Authentication required." });
        return;
    }
    if (!data || !data.chatRoomId || !data.message || !data.senderId) {
        console.error("Error: sendMessage event with incomplete data:", data);
        socket.emit("sendMessageError", { error: "Incomplete message data." });
        return;
    }
    if (data.senderId !== socket.user.uid) {
        console.error(`Error: sendMessage event senderId [${data.senderId}] does not match authenticated socket user [${socket.user.uid}].`);
        socket.emit("sendMessageError", { error: "Sender ID mismatch." });
        return;
    }

    try {
      const newMessage = new ChatMessage({
        chatRoomId: data.chatRoomId,
        sender: data.senderId, // This should be the ObjectId of the user if your schema expects it
        message: data.message,
      });
      const savedMessage = await newMessage.save();

      // Populate sender details if your ChatMessage model 'sender' field is a ref
      // This ensures the client gets full sender info for display
      const populatedMessage = await ChatMessage.findById(savedMessage._id)
        .populate({
            path: 'sender', // Assuming 'sender' in ChatMessage model refers to User model
            select: 'displayName uid photoURL _id' // Select fields you want to send
        })
        .lean(); // .lean() for plain JS object

      if (!populatedMessage) {
        console.error("Error: Could not find and populate saved message:", savedMessage._id);
        socket.emit("sendMessageError", { error: "Failed to process message after saving." });
        return;
      }
      
      console.log(`📢 Broadcasting 'receiveMessage' to room [${data.chatRoomId}]:`, populatedMessage.message);
      io.to(data.chatRoomId).emit("receiveMessage", populatedMessage);

    } catch (error) {
      console.error("Error saving or broadcasting message:", error);
      socket.emit("sendMessageError", { error: "Message could not be processed on server." });
    }
  });

  socket.on("disconnect", () => {
    const disconnectedUserId = getUserIdBySocketId(socket.id); // Or directly use socket.user.uid if available before disconnect
    if (disconnectedUserId) {
      onlineUsers.delete(disconnectedUserId);
      console.log(`➖ User ${disconnectedUserId} (Socket: ${socket.id}) disconnected.`);
      io.emit("getUsers", Array.from(onlineUsers.keys()));
    } else {
        console.log(`🔌 Socket ${socket.id} (User: ${socket.user?.uid}) disconnected, user might not have called addUser or was already removed.`);
        // If socket.user was populated by VerifySocketToken, we can use that directly
        if (socket.user?.uid) {
            if (onlineUsers.get(socket.user.uid) === socket.id) { // Ensure this specific socket was the one for the user
                onlineUsers.delete(socket.user.uid);
                console.log(`➖ User ${socket.user.uid} (from token) disconnected via direct lookup.`);
                io.emit("getUsers", Array.from(onlineUsers.keys()));
            }
        }
    }
  });
});

console.log("🚀 Server setup complete. Socket.IO initialized.");