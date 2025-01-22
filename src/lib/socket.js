import { Server } from "socket.io";
import { Message } from "../models/message.model.js"; // Example schema for messages (ensure you have this in your models)

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "https://tune-timefrontend-gyjxryhec-tejesh-kumars-projects.vercel.app", // Replace with your frontend URL
      credentials: true,
    },
  });

  const userSockets = new Map(); // Stores userId to socketId mappings
  const userActivities = new Map(); // Stores userId to activity status mappings

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("user_connected", (userId) => {
      userSockets.set(userId, socket.id);
      userActivities.set(userId, "Idle");

      io.emit("user_connected", userId); // Notify all clients about the new user
      socket.emit("users_online", Array.from(userSockets.keys())); // Send the list of online users
      io.emit("activities", Array.from(userActivities.entries())); // Broadcast activities
    });

    socket.on("update_activity", ({ userId, activity }) => {
      console.log(`Activity updated for user ${userId}: ${activity}`);
      userActivities.set(userId, activity);
      io.emit("activity_updated", { userId, activity }); // Notify all clients about the activity update
    });

    socket.on("send_message", async (data) => {
      try {
        const { senderId, receiverId, content } = data;

        // Save message to the database
        const message = await Message.create({ senderId, receiverId, content });

        const receiverSocketId = userSockets.get(receiverId); // Get receiver's socket ID
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_message", message); // Deliver the message in real-time
        }

        socket.emit("message_sent", message); // Acknowledge the sender
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("message_error", error.message); // Notify the sender about the error
      }
    });

    socket.on("disconnect", () => {
      let disconnectedUserId;
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          userSockets.delete(userId); // Remove the user from the sockets map
          userActivities.delete(userId); // Remove the user from the activities map
          break;
        }
      }
      if (disconnectedUserId) {
        io.emit("user_disconnected", disconnectedUserId); // Notify all clients
      }
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};
