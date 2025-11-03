// src/lib/generateContent.js
export async function generateAIContent({
  domain,
  pageTitle,
  pageDescription,
  keywords,
  gscQueries,
  apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
}) {
  try {
    const body = {
      domain,
      pageTitle,
      pageDescription,
      keywords,
      gscQueries,
      
    };
// ✅ Pick top 10 GSC queries based on impressions or clicks
const topQueries = gscQueries
  ?.filter(q => q.query && (q.impressions > 0 || q.clicks > 0))
  ?.sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
  ?.slice(0, 10);

    const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/ai/generate-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, keywords, gscQueries: topQueries, pageDescription, }),
    });

    // try to parse JSON; handle empty/non-JSON gracefully
    const text = await res.text();
    if (!text) {
      return { ok: false, error: "Empty response from AI endpoint", raw_text: "" };
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      // Not valid JSON — return raw text for debugging
      return { ok: false, error: "Non-JSON response from AI", raw_text: text };
    }

    if (!res.ok) {
      return { ok: false, error: parsed?.error || `AI endpoint returned ${res.status}`, raw_text: text };
    }

    // success
    return { ok: true, content: parsed.content ?? parsed, raw_text: text };
  } catch (err) {
    console.error("Error generating AI content:", err);
    return { ok: false, error: err.message || String(err) };
  }
}
