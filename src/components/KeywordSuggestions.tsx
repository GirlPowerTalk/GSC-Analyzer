import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X } from "lucide-react";

type AiResponse = {
  provider?: string;
  suggestions: any;
};

const safeParseJsonFromText = (text: string) => {
  try {
    if (!text) return null;
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const jsonStr = fenced ? fenced[1] : text;
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    const trimmed =
      firstBrace !== -1 && lastBrace !== -1
        ? jsonStr.slice(firstBrace, lastBrace + 1)
        : jsonStr;
    return JSON.parse(trimmed);
  } catch (err) {
    try {
      const arr = text.match(/\[.*\]/s);
      if (arr) return JSON.parse(arr[0]);
    } catch {}
    return null;
  }
};

interface KeywordSuggestionsProps {
  domain: string;
  pageTitle: string;
  pageDescription: string;
  gscQueries?: any[];
  apiBaseUrl?: string;
  onKeywordsGenerated?: (keywords: any) => void;
}

export default function KeywordSuggestions({
  domain,
  pageTitle,
  pageDescription,
  gscQueries,
  apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "",
  onKeywordsGenerated,
}: KeywordSuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manualKeywords, setManualKeywords] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState(10);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const res = await fetch(`${apiBaseUrl}/api/ai/suggest-keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          pageTitle,
          pageDescription,
          gscQueries,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Status ${res.status}`);
      }

      const data: AiResponse = await res.json();
      let parsed: any = null;
      if (data?.suggestions?.raw_text) {
        parsed = safeParseJsonFromText(data.suggestions.raw_text);
      } else {
        parsed =
          typeof data.suggestions === "string"
            ? safeParseJsonFromText(data.suggestions)
            : data.suggestions;
      }

      // Flatten all categories into one array
      const allKeywords = [
        ...(parsed?.primary_keywords || []),
        ...(parsed?.secondary_keywords || []),
        ...(parsed?.long_tail_keywords || []),
      ];

      setSuggestions(allKeywords);
      onKeywordsGenerated?.(allKeywords);
    } catch (err: any) {
      console.error("AI keyword suggestion error:", err);
      setError(err.message || "Failed to fetch suggestions");
      toast.error(err.message || "Failed to fetch suggestions");
    } finally {
      setLoading(false);
    }
  };

  const addManualKeywords = () => {
    if (!manualKeywords.trim()) return;
    const parts = manualKeywords.split(",").map((p) => p.trim()).filter(Boolean);
    const updated = [...new Set([...parts, ...suggestions])];
    setSuggestions(updated);
    onKeywordsGenerated?.(updated);
    setManualKeywords("");
    toast.success("Manual keywords added");
  };

  const removeKeyword = (keyword: string) => {
    const updated = suggestions.filter((k) => k !== keyword);
    setSuggestions(updated);
    onKeywordsGenerated?.(updated);
  };

  const handleLoadMore = () => setVisibleCount((prev) => prev + 10);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button onClick={fetchSuggestions} disabled={loading || !domain || !pageTitle}>
          {loading ? "Generating..." : "Get AI Keyword Suggestions"}
        </Button>
        <Button variant="outline" onClick={() => { setSuggestions([]); setError(null); }}>
          Clear
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <Input
          placeholder="Add manual keywords (comma separated)"
          value={manualKeywords}
          onChange={(e) => setManualKeywords(e.target.value)}
        />
        <Button onClick={addManualKeywords}>Add</Button>
      </div>

      {loading && <div className="text-sm">Generating suggestions...</div>}
      {error && <div className="text-sm text-red-600">Error: {error}</div>}

      {!!suggestions.length && (
        <div className="bg-white p-4 rounded-md border">
          <h3 className="font-semibold mb-2">Suggested Keywords</h3>

          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, visibleCount).map((k, i) => (
              <Badge
                key={i}
                variant="outline"
                className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-red-100 transition"
                onClick={() => removeKeyword(k)}
              >
                {k}
                <X className="h-3 w-3 text-red-500" />
              </Badge>
            ))}
          </div>

          {visibleCount < suggestions.length && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-3 text-blue-500"
              onClick={handleLoadMore}
            >
              Load More
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
