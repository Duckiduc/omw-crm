const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const contactRoutes = require("./routes/contacts");
const organizationRoutes = require("./routes/organizations");
const dealRoutes = require("./routes/deals");
const activityRoutes = require("./routes/activities");
const contactNotesRoutes = require("./routes/contact-notes");
const activityNotesRoutes = require("./routes/activity-notes");
const adminRoutes = require("./routes/admin");
const sharesRoutes = require("./routes/shares");

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
// CORS configuration using environment-aware config
const environmentConfig = require("./config/environment");

console.log(
  "🌍 Environment Configuration: CORS enabled for Docker/Local setup"
);

app.use(cors(environmentConfig.getCorsConfig()));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/api/health", (req, res) => {
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
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
