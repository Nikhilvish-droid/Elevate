const express = require("express");
const { asyncHandler } = require("../lib/helpers");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json([]);

    const { data, error } = await req.supabase
      .from("companies")
      .select("id, name, logo_url, industry, website_url")
      .ilike("name", `%${q}%`)
      .order("name", { ascending: true })
      .limit(10);
    if (error) throw new Error(error.message);
    res.json(data || []);
  }),
);

module.exports = router;
