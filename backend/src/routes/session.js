const express = require("express");
const { asyncHandler } = require("../lib/helpers");
const { ensureAppUser, buildSessionProfile } = require("../lib/users");

const router = express.Router();

router.post(
  "/auth/sync",
  asyncHandler(async (req, res) => {
    await ensureAppUser(req.supabase, req.user);
    const profile = await buildSessionProfile(req.supabase, req.user);
    res.json(profile);
  }),
);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    await ensureAppUser(req.supabase, req.user);
    const profile = await buildSessionProfile(req.supabase, req.user);
    res.json(profile);
  }),
);

module.exports = router;
