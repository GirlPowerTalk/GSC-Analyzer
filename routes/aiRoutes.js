import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const router = express.Router();

// ✅ Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ OpenAI API Key (ensure it's in .env.local)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("[ERROR] Missing OPENAI_API_KEY in environment variables.");
}

// ---------------------------------------------
// POST /api/ai/suggest-keywords
// ---------------------------------------------
router.post("/suggest-keywords", async (req, res) => {
  try {
    console.log("[INFO] Incoming AI keyword request...");
    console.log("[DEBUG] Request body:", req.body);

    const { domain, pageTitle, pageDescription, gscQueries } = req.body;

    if (!domain || !pageTitle || !pageDescription) {
      return res.status(400).json({
        error: "Missing required fields: domain, pageTitle, and pageDescription.",
      });
    }

    // 🟢 Optional: Fetch domain data from Supabase
    const { data: domainData, error: supabaseError } = await supabase
      .from("verified_domains")
      .select("*")
      .eq("domain", domain)
      .maybeSingle();

    if (supabaseError) {
      console.error("[ERROR] Supabase fetch failed:", supabaseError.message);
    }

    // ✅ Prepare GSC query list (limit to top 10 for clarity)
    const topGSCQueries =
      Array.isArray(gscQueries) && gscQueries.length > 0
        ? gscQueries.slice(0, 10).map((q) => q.query || q).join(" | ")
        : "No GSC query data available";

    // 🧠 AI Prompt — GSC data is the main context for suggestions
    const prompt = `
You are an advanced SEO keyword strategist.

Analyze the following data and recommend the *most semantically relevant keywords* for the web page.
Base your analysis primarily on Google Search Console queries but also factor in the page's title, description, and domain context.

---

📘 Domain: ${domain}
🏷️ Page Title: ${pageTitle}
📝 Page Description: ${pageDescription}

📊 Top Google Search Console Queries:
${topGSCQueries}

🔍 Additional Domain Info:
${JSON.stringify(domainData || {}, null, 2)}

---

Return output strictly as JSON in this format:
{
  "primary_keywords": ["High-impact primary keywords"],
  "secondary_keywords": ["Supporting long-tail or contextual keywords"],
  "long_tail_keywords": ["High-conversion or intent-driven phrases"],
  "reasoning": "Brief explanation of how GSC data influenced keyword selection."
}
`;

    // ✅ Import and use OpenAI client dynamically
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    console.log("[INFO] Generating keyword suggestions using GPT-4o-mini...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });

    const text = completion.choices[0].message.content.trim();

    // 🧩 Try parsing the AI response as JSON
    let suggestions;
    try {
      suggestions = JSON.parse(text);
    } catch {
      suggestions = { raw_text: text };
    }

    res.json({
      provider: "openai",
      suggestions,
    });
  } catch (err) {
    console.error("[ERROR] AI keyword suggestion route failed:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
