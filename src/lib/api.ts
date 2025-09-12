
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface GSCQueryData {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

/**
 * Mock function to fetch Google Search Console data
 * In a real application, this would make API calls to GSC
 */
export const fetchGscData = async (
  url: string,
  days: number = 28
): Promise<GSCQueryData[]> => {
  // In a production app, this would actually call the GSC API
  // For demo purposes, we'll simulate a network call with mock data
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  // For demo, we'll generate some mock data based on the URL
  const siteType = url.includes("blog") ? "blog" : "site";
  const mockQueries = siteType === "blog" 
    ? ["content marketing", "SEO tips", "blogging strategy", "keyword research", "content optimization"]
    : ["pricing", "features", "reviews", "alternatives", "tutorial"];
    
  // Generate some query variations based on the URL
  const urlObj = new URL(url);
  const path = urlObj.pathname.split("/").filter(Boolean);
  const pageContext = path.length > 0 ? path[path.length - 1].replace(/-/g, " ") : "";
  
  const contextQueries = pageContext 
    ? [
        `best ${pageContext}`, 
        `how to ${pageContext}`, 
        `${pageContext} guide`, 
        `${pageContext} tutorial`,
        `${pageContext} tips`
      ]
    : [];
    
  const allQueries = [...mockQueries, ...contextQueries];
  
  // Generate random data that looks plausible
  return allQueries.map((query) => {
    const impressions = Math.floor(Math.random() * 500) + 10;
    const clicks = Math.floor(impressions * (Math.random() * 0.2));
    return {
      query,
      clicks,
      impressions,
      position: Math.random() * 10 + 1,
      ctr: clicks / impressions,
    };
  });
};

/**
 * Function to fetch page content using Supabase Edge Function
 */
export const scrapePageContent = async (url: string) => {
  try {
    toast.info("Fetching page content...");
    
    // Call the Supabase Edge Function to fetch the URL content
    const { data, error } = await supabase.functions.invoke('fetch-url', {
      body: { url }
    });
    
    if (error) {
      console.error('Function invocation error:', error);
      throw new Error(`Function error: ${error.message}`);
    }
    
    if (data.error) {
      console.error('Content fetch error:', data.error);
      throw new Error(data.error);
    }
    
    return {
      title: data.title || 'No title found',
      content: data.content || 'No content found'
    };
  } catch (error) {
    console.error('Error fetching page content:', error);
    
    toast.error("Failed to fetch content. Please try a different URL.");
    
    return {
      title: 'Error fetching content',
      content: `Unable to fetch content from the specified URL. ${error.message}`
    };
  }
};
