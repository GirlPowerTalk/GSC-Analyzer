// routes/aiContentRoutes.js
import express from "express";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

const OpenAI = (await import("openai")).default;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/ai/generate-content
 * body: {
 *   domain: string,
 *   keywords: string[],
 *   gscQueries: Array<{ query: string, clicks?: number, impressions?: number }>,
 *   currentContent?: string
 * }
 */
router.post("/generate-content", async (req, res) => {
  try {
    const { domain, keywords = [], gscQueries = [], pageDescription } = req.body;

    if (!domain) {
      return res.status(400).json({ error: "Missing required field: domain" });
    }

    console.log("[AI PAGE CONTENT INPUT]", {
      domain,
      keywordCount: Array.isArray(keywords)
        ? keywords.length
        : Object.values(keywords || {}).flat().length,
      keywords: Array.isArray(keywords)
        ? keywords
        : Object.values(keywords || {}).flat(),
      gscQueries: gscQueries?.map((q) => ({
        query: q.query,
        clicks: q.clicks,
        impressions: q.impressions,
      })),
      pageDescription,
    });

    const prompt = `
## 🔧 Prompt: Minimal Keyword Injection for Semantic Optimization

You are a *Semantic SEO assistant*.

Your task is to **enhance and optimize** an existing webpage by **strategically adding or rewriting small parts of sentences** to include **new keyword-rich phrases** derived from the given target keywords — while keeping the original content structure and tone intact.

The content is already well-written and structured. You are NOT allowed to:

- Rewrite full paragraphs  
- Add new sections  
- Change the structure or intent of the content  

---

### 🎯 Goal

Insert or suggest keywords and short keyword phrases where they create the *highest semantic impact* while maintaining natural tone and flow.

---

### 🧠 Injection Strategy

Place the target keywords in the following *SEO-strong positions*:

1. ✅ *First paragraph / Introduction* (within first 100 words)  
2. ✅ *Headings* (H2 or H3 — modify slightly if needed)  
3. ✅ *Relevant body paragraph* (only if it adds value or reinforces topic naturally)

- If the exact keyword doesn't fit naturally, use a *semantic variant* or add a *short supporting phrase* naturally.  
- Maximum: *2–4 mentions total per keyword* across the entire document.

---

### ⚠ Rules

- DO NOT break structure, tone, or logical flow.  
- DO NOT keyword stuff.  
- DO NOT remove original content unless required for grammar.  
- DO NOT alter the overall meaning or topic of the page.  
- Highlight all newly added or optimized keywords or short phrases using [KEYWORD: your_keyword] for easy review.

---

### 🔹 Inputs

- *Target Keywords:* ${gscQueries.slice(0, 5).map(q => `"${q.query}"`).join(', ')}
- *Page Content:*  
"""
${pageDescription}
"""

### ✅ Output Format

Return only the updated content with [KEYWORD: your_suggested_keyword] around injected or newly suggested keywords or phrases.
Do not include any explanation, JSON, or commentary.
`.trim();


    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const rawText = completion.choices?.[0]?.message?.content?.trim();
    if (!rawText) return res.status(502).json({ error: "No response from OpenAI" });

    // ✅ Return text directly — no JSON.parse
    return res.json({ ok: true, content: rawText });
  } catch (err) {
    console.error("[ERROR] AI content generation:", err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});


export default router;
