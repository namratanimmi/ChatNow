// ChatNow/server/middlewares/VerifyToken.js
import auth from "../config/firebase-config.js"; // Your Firebase Admin auth instance

export const VerifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decodeValue = await auth.verifyIdToken(token);
      if (decodeValue) {
        req.user = decodeValue; // Attach decoded user info to the request object
        return next(); // Token is valid, proceed
      }
      // This case should ideally not be reached if verifyIdToken works as expected
      return res.status(401).json({ message: "Unauthorized: Invalid token payload" });
    } catch (e) {
      console.error("Firebase token verification error:", e.message);
      // More specific error messages can be helpful for debugging
      if (e.code === 'auth/id-token-expired') {
        return res.status(401).json({ message: "Unauthorized: Token expired" });
      }
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
  } else {
    // No valid Authorization header found for a route that requires it
    console.warn(`VerifyToken: Missing or malformed Authorization header for ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ message: "Unauthorized: Authorization header required" });
  }
};

export const VerifySocketToken = async (socket, next) => {
  const token = socket.handshake.auth?.token; // Use optional chaining

  if (!token) {
    console.warn(`VerifySocketToken: No token provided by socket ${socket.id}`);
    return next(new Error("Authentication error: Token not provided"));
  }

  try {
    const decodeValue = await auth.verifyIdToken(token);
    if (decodeValue) {
      socket.user = decodeValue; // Attach decoded user info to the socket object
      return next(); // Token is valid
    }
    // This case should ideally not be reached
    return next(new Error("Authentication error: Invalid token payload"));
  } catch (e) {
    console.error(`Firebase socket token verification error for socket ${socket.id}:`, e.message);
    if (e.code === 'auth/id-token-expired') {
        return next(new Error("Authentication error: Token expired"));
    }
    return next(new Error("Authentication error: Invalid token"));
  }
};