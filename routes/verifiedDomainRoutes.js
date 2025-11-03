import express from "express";
const router = express.Router();

// Simple test route
router.get("/", (req, res) => {
  res.send("Verified domains route working ✅");
});

export default router;
