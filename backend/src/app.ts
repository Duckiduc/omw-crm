import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import authRoutes from "./routes/auth";
import contactRoutes from "./routes/contacts";
import organizationRoutes from "./routes/organizations";
import dealRoutes from "./routes/deals";
import activityRoutes from "./routes/activities";
import contactNotesRoutes from "./routes/contact-notes";
import activityNotesRoutes from "./routes/activity-notes";
import adminRoutes from "./routes/admin";
import sharesRoutes from "./routes/shares";
import environmentConfig from "./config/environment";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
});

// Middleware
app.use(helmet());
app.use(limiter);

console.log(
  "🌍 Environment Configuration: CORS enabled for Docker/Local setup"
);

app.use(cors(environmentConfig.getCorsConfig()));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/contact-notes", contactNotesRoutes);
app.use("/api/activity-notes", activityNotesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/shares", sharesRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// 404 handler
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
