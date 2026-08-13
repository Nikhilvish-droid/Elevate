const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { requireAuth } = require("./src/middleware/auth");
const sessionRoutes = require("./src/routes/session");
const onboardingRoutes = require("./src/routes/onboarding");
const candidateRoutes = require("./src/routes/candidate");
const jobRoutes = require("./src/routes/jobs");
const profileRoutes = require("./src/routes/profiles");
const companiesRoutes = require("./src/routes/companies");
const companyRoutes = require("./src/routes/company");
const authEmailRoutes = require("./src/routes/authEmail");
const adminRoutes = require("./src/routes/admin");

const app = express();
const port = process.env.PORT || 5000;

const corsOrigins = String(
  process.env.FRONTEND_ORIGIN || "http://localhost:3000",
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    message: "Elevate API is running",
    port: Number(port),
  });
});

app.use("/api/auth", authEmailRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api", requireAuth, sessionRoutes);
app.use("/api/onboarding", requireAuth, onboardingRoutes);
app.use("/api/companies", requireAuth, companiesRoutes);
app.use("/api/company-requests", requireAuth, companyRoutes.requests);
app.use("/api/company", requireAuth, companyRoutes.admin);
app.use("/api/candidate", requireAuth, candidateRoutes);
app.use("/api/jobs", requireAuth, jobRoutes);
app.use("/api/admin", requireAuth, adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `No route ${req.method} ${req.path}` });
});

app.use((err, _req, res, _next) => {
  const status = err.status || 400;
  res.status(status).json({ error: err.message || "Request failed" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Elevate backend running on http://localhost:${port}`);
});
