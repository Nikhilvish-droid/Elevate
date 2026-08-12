const express = require("express");
const { asyncHandler, fail } = require("../lib/helpers");
const { ensureAppUser, buildSessionProfile } = require("../lib/users");
const { supabaseAdmin } = require("../supabase");

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

router.delete(
  "/me",
  asyncHandler(async (req, res) => {
    const confirm = String(req.body?.confirm || "");
    if (confirm !== "DELETE") {
      return fail(res, 400, 'Type DELETE to confirm account deletion.');
    }

    const userId = req.user.id;
    const { data, error } = await req.supabase.rpc("delete_own_account");
    if (error) {
      throw new Error(
        /function .* does not exist/i.test(error.message)
          ? "Account delete is not set up. Run supabase/delete-account.sql in the Supabase SQL editor."
          : error.message,
      );
    }

    const admin = supabaseAdmin();
    if (admin) {
      await admin.auth.admin.deleteUser(userId);
    }

    res.json({ ok: true, ...(data || {}), auth_deleted: Boolean(admin) });
  }),
);

module.exports = router;
