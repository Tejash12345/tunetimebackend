import express from "express";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import fileUpload from "express-fileupload";
import path from "path";
import cors from "cors";
import fs from "fs";
import { createServer } from "http";
import cron from "node-cron";

import { initializeSocket } from "./lib/socket.js";
import { connectDB } from "./lib/db.js";
import userRoutes from "./routes/user.route.js";
import adminRoutes from "./routes/admin.route.js";
import authRoutes from "./routes/auth.route.js";
import songRoutes from "./routes/song.route.js";
import albumRoutes from "./routes/album.route.js";
import statRoutes from "./routes/stat.route.js";

dotenv.config();

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT;

const httpServer = createServer(app);
initializeSocket(httpServer);

app.use(
  cors({
    origin: "https://tune-timefrontend-g9q0osoiw-tejesh-kumars-projects.vercel.app/",
    credentials: true,
  })
);

app.use(express.json({ limit: "100mb" })); // Increased JSON payload size
app.use(express.urlencoded({ limit: "100mb", extended: true })); // Increased URL-encoded payload size
app.use(clerkMiddleware()); // Auth middleware
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "tmp"),
    createParentPath: true,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max file size
    },
  })
);

// Cron job for cleaning temp files every hour
const tempDir = path.join(process.cwd(), "tmp");
cron.schedule("0 * * * *", () => {
  if (fs.existsSync(tempDir)) {
    fs.readdir(tempDir, (err, files) => {
      if (err) {
        console.error("Error reading temp directory:", err);
        return;
      }
      for (const file of files) {
        fs.unlink(path.join(tempDir, file), (err) => {
          if (err) console.error("Error deleting temp file:", err);
        });
      }
    });
  }
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/stats", statRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Error handler middleware
app.use((err, req, res, next) => {
  res.status(500).json({
    message: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message,
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});
