
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to decode HTML entities
function decodeHTMLEntities(text) {
  const entities = {
    '&quot;': '"',
    '&apos;': "'",
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&#8220;': '"',
    '&#8221;': '"',
    '&#8216;': "'",
    '&#8217;': "'",
    '&#8230;': '...',
    '&#8211;': '–',
    '&#8212;': '—',
    '&nbsp;': ' ',
  };
  
  return text.replace(/&(#?\w+);/g, (match, entity) => {
    const decoded = entities[match];
    if (decoded) {
      return decoded;
    } else if (entity.charAt(0) === '#') {
      // Handle numeric entities
      const code = entity.charAt(1) === 'x' 
        ? parseInt(entity.substring(2), 16)
        : parseInt(entity.substring(1), 10);
      return String.fromCharCode(code);
    }
    return match;
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()

    if (!url) {
      throw new Error('URL is required')
    }

    console.log(`Fetching content from URL: ${url}`)
    
    // Fetch the content from the URL with improved headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Mode': 'navigate',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'follow'
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    console.log(`Successfully fetched ${html.length} bytes of content`)
    
    // Parse HTML content on the server side with improved extraction
    const title = html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1] || '';
    const decodedTitle = decodeHTMLEntities(title);
    
    // Try to extract structured content with headings and paragraphs preserved
    let extractedContent = '';
    
    // Strategy 1: Try to get main content container
    const contentContainers = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<div[^>]*class="[^"]*(?:content|post-content|entry-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id="[^"]*(?:content|main-content|post-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    ];
    
    for (const selector of contentContainers) {
      const match = html.match(selector);
      if (match && match[1]) {
        extractedContent = match[1];
        console.log(`Found content using selector: ${selector}`);
        break;
      }
    }
    
    // Fallback to body content if no specific content container was found
    if (!extractedContent) {
      console.log('No content container found, falling back to body content');
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/is);
      if (bodyMatch && bodyMatch[1]) {
        extractedContent = bodyMatch[1];
      }
    }
    
    // Clean up the content by removing scripts, styles, and other non-content elements
    const cleanedContent = extractedContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    
    // HTML Structure extraction - preserve headings and paragraphs
    const fullStructureRegex = /<(h[1-6]|p)[^>]*>([\s\S]*?)<\/\1>/gi;
    const structureMatches = [...cleanedContent.matchAll(fullStructureRegex)];
    
    let formattedContent = '';
    
    if (structureMatches.length > 0) {
      console.log(`Found ${structureMatches.length} heading/paragraph elements`);
      
      // Combine all the structured content with proper spacing
      structureMatches.forEach(match => {
        const tagName = match[1].toLowerCase();
        let content = match[2].replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
        
        // Decode HTML entities
        content = decodeHTMLEntities(content);
        
        if (content.length > 10) { // Skip very short or empty tags
          if (tagName.startsWith('h')) {
            // Preserve headings with ## markdown syntax
            const headingLevel = tagName[1];
            formattedContent += '#'.repeat(parseInt(headingLevel)) + ' ' + content + '\n\n';
          } else {
            // Regular paragraphs
            formattedContent += content + '\n\n';
          }
        }
      });
    } else {
      // Fallback to simple text extraction
      console.log('No structured content found, extracting text');
      const textContent = cleanedContent.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
      
      // Split into paragraphs based on sentence clusters and decode entities
      const sentences = textContent.split(/\.(?=\s|[A-Z])/).filter(Boolean);
      
      for (let i = 0; i < sentences.length; i += 3) {
        const paragraph = sentences.slice(i, i + 3).join('. ');
        if (paragraph.length > 30) {
          formattedContent += decodeHTMLEntities(paragraph + (paragraph.endsWith('.') ? '' : '.')) + '\n\n';
        }
      }
    }
    
    console.log(`Extracted ${formattedContent.length} characters of formatted content`);
    
    return new Response(
      JSON.stringify({
        title: decodedTitle || 'No title found', 
        content: formattedContent.trim() || 'No content found'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('Error in fetch-url function:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message,
        title: 'Error fetching content',
        content: `Unable to fetch content from the specified URL. ${error.message}`
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
