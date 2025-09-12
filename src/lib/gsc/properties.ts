
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches Google Search Console properties using service account authentication
 * @param serviceAccountKey The service account key JSON object
 * @returns Array of GSC properties
 */
const fetchGscProperties = async (serviceAccountKey: any) => {
  try {
    const { data, error } = await supabase.functions.invoke('gsc-properties', {
      body: { serviceAccountKey }
    });

    if (error) throw error;
    
    if (!data || !data.properties) {
      console.error('No properties returned from GSC properties function');
      return [];
    }
    
    return data.properties;
  } catch (error) {
    console.error('Error fetching GSC properties:', error);
    throw new Error('Failed to fetch GSC properties');
  }
};

/**
 * Checks if the user has access to a specific URL in Google Search Console
 * @param url The URL to check access for
 * @param serviceAccountKey The service account key JSON object
 * @returns Object with access status and matched property information
 */
const hasAccessToUrl = async (url: string, serviceAccountKey: any) => {
  try {
    const { data, error } = await supabase.functions.invoke('gsc-properties', {
      body: { serviceAccountKey, url }
    });

    if (error) throw error;
    
    return {
      hasAccess: data.hasAccess || false,
      properties: data.properties || [],
      matchedUrl: data.matchedUrl
    };
  } catch (error) {
    console.error('Error checking URL access:', error);
    return {
      hasAccess: false,
      properties: [],
      matchedUrl: null
    };
  }
};

export { fetchGscProperties, hasAccessToUrl };
