const express = require("express");
const { asyncHandler, fail } = require("../lib/helpers");
const { loadPublicProfile } = require("../lib/candidateProfile");
const { supabaseAnon, supabaseAdmin } = require("../supabase");

const router = express.Router();

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return fail(res, 400, "Invalid profile id.");

    const profile = await loadPublicProfile(
      supabaseAdmin() || supabaseAnon(),
      id,
    );
    if (!profile) return fail(res, 404, "Profile not found.");
    res.json(profile);
  }),
);

module.exports = router;
