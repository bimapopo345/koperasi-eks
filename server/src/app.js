import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import conf from "./conf/conf.js";

const app = express();
app.use(bodyParser.json());

// app.use(
//   cors({
//     origin: conf.CORS_ORIGIN.replace(/\/$/, ""),
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//   })
// );

app.use(
  cors({
    origin: [
      "http://localhost:5173", 
      "http://localhost:3000",
      "http://localhost:8080"  // Added for CI4 to MERN webhook
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());
app.use(express.static("public"));
app.use(cookieParser());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

import Routes from "./routes/index.js";
import adminRoutes from "./routes/admin.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";

app.use("/api", Routes);
app.use("/api", adminRoutes);
app.use("/api/webhook", webhookRoutes);

app.post("/testing", (req, res) => {
  console.log("Testing");
  res.send("Hello testing completed");
});

app.get("/", (req, res) => {
  res.send("Welcome to the Express Server!");
});

export { app };
