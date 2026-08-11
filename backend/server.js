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

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
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

app.use("/api/profiles", profileRoutes);
app.use("/api", requireAuth, sessionRoutes);
app.use("/api/onboarding", requireAuth, onboardingRoutes);
app.use("/api/companies", requireAuth, companiesRoutes);
app.use("/api/company-requests", requireAuth, companyRoutes.requests);
app.use("/api/company", requireAuth, companyRoutes.admin);
app.use("/api/candidate", requireAuth, candidateRoutes);
app.use("/api/jobs", requireAuth, jobRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `No route ${req.method} ${req.path}` });
});

app.use((err, _req, res, _next) => {
  const status = err.status || 400;
  res.status(status).json({ error: err.message || "Request failed" });
});

app.listen(port, () => {
  console.log(`Elevate backend running on http://localhost:${port}`);
});
