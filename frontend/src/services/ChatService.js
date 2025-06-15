// --- CORRECTED CODE FOR: frontend/src/services/ChatService.js ---

import axios from "axios";
import auth from "../config/firebase";
import { io } from "socket.io-client";

const baseURL = "http://localhost:5001/api";

const getUserToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    // Handle case where user is not logged in
    console.error("User not authenticated.");
    return null;
  }
  const token = await user.getIdToken();
  return token;
};

export const initiateSocketConnection = async () => {
  const token = await getUserToken();
  if (!token) return null; // Don't connect if there's no token

  const socket = io("http://localhost:5001", {
    auth: {
      token,
    },
  });

  return socket;
};

const createHeader = async () => {
  const token = await getUserToken();
  if (!token) return null;

  const payloadHeader = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
  return payloadHeader;
};

export const getAllUsers = async () => {
  const header = await createHeader();
  if (!header) return; // Exit if header creation fails

  try {
    const res = await axios.get(`${baseURL}/user`, header);
    return res.data;
  } catch (e) {
    console.error("Failed to get all users:", e);
  }
};

export const getUser = async (userId) => {
  const header = await createHeader();
  if (!header) return;

  try {
    const res = await axios.get(`${baseURL}/user/${userId}`, header);
    return res.data;
  } catch (e) {
    console.error(`Failed to get user ${userId}:`, e);
  }
};

// --- THIS FUNCTION IS NOW FIXED ---
export const getUsers = async (userIds) => {
  const header = await createHeader();
  if (!header) return;

  try {
    const params = new URLSearchParams();
    userIds.forEach((id) => params.append("users", id));

    const res = await axios.get(`${baseURL}/user/users`, {
      params,
      headers: header.headers,
    });
    return res.data;
  } catch (e) {
    console.error("Failed to get multiple users:", e);
  }
};

export const getChatRooms = async (userId) => {
  const header = await createHeader();
  if (!header) return;

  try {
    const res = await axios.get(`${baseURL}/room/${userId}`, header);
    return res.data;
  } catch (e) {
    console.error("Failed to get chat rooms:", e);
  }
};

export const getChatRoomOfUsers = async (firstUserId, secondUserId) => {
  const header = await createHeader();
  if (!header) return;

  try {
    const res = await axios.get(
      `${baseURL}/room/${firstUserId}/${secondUserId}`,
      header
    );
    return res.data;
  } catch (e) {
    console.error("Failed to find chat room of users:", e);
  }
};

export const createChatRoom = async (members) => {
  const header = await createHeader();
  if (!header) return;

  try {
    const res = await axios.post(`${baseURL}/room`, members, header);
    return res.data;
  } catch (e) {
    console.error("Failed to create chat room:", e);
  }
};

export const getMessagesOfChatRoom = async (chatRoomId) => {
  const header = await createHeader();
  if (!header) return;

  try {
    const res = await axios.get(`${baseURL}/message/${chatRoomId}`, header);
    return res.data;
  } catch (e) {
    console.error("Failed to get messages:", e);
  }
};

export const sendMessage = async (messageBody) => {
  const header = await createHeader();
  if (!header) return;

  try {
    const res = await axios.post(`${baseURL}/message`, messageBody, header);
    return res.data;
  } catch (e) {
    console.error("Failed to send message:", e);
  }
};