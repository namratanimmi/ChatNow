
import ChatMessage from "../models/ChatMessage.js";

// --- CREATE A NEW MESSAGE ---
export const createMessage = async (req, res) => {
  // We get the sender's ID from the verified token, not the request body.
  // This is more secure. Your VerifyToken middleware should add `req.user`.
  const senderId = req.user.id; 
  const { chatRoomId, message } = req.body;

  // Basic validation
  if (!chatRoomId || !message) {
    return res.status(400).json({ message: "Chat Room ID and message text are required." });
  }

  const newMessage = new ChatMessage({
    chatRoomId,
    sender: senderId, // Use the secure ID from the token
    message,
  });

  try {
    const savedMessage = await newMessage.save();
    
    // Populate the sender details before sending back to the client
    const populatedMessage = await ChatMessage.findById(savedMessage._id)
      .populate("sender", "displayName avatar"); // Select which fields to show

    res.status(201).json(populatedMessage);
  } catch (error) {
    // Use 500 for server errors
    res.status(500).json({
      message: "Failed to save the message.",
      error: error.message,
    });
  }
};


// --- GET ALL MESSAGES FOR A CHAT ROOM ---
export const getMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.find({
      chatRoomId: req.params.chatRoomId,
    })
    .populate("sender", "displayName avatar") // Crucial: Get sender info
    .sort({ createdAt: 1 }); // Optional: Sort messages by oldest first

    res.status(200).json(messages);
  } catch (error) {
    // Use 500 for server errors
    res.status(500).json({
      message: "Failed to retrieve messages.",
      error: error.message,
    });
  }
};