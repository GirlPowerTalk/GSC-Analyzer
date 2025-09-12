
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

interface GSCQueryData {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
  occurrences?: number;
}

interface DateRange {
  startDate: string;
  endDate: string;
  requestedStartDate: string;
  requestedEndDate: string;
  filterType: string;
  daysRequested: number;
  dataPointCount: number;
  totalResults: number;
}

interface GSCResponse {
  data: GSCQueryData[];
  dateRange: DateRange;
}

/**
 * Calculates the default date range for GSC queries
 * End date is 2 days before today, start date is 27 days before end date (28 days total)
 * This calculation happens DYNAMICALLY each time this function is called
 */
export function getDefaultDateRange(): { startDate: string, endDate: string } {
  console.log("Calculating default date range dynamically based on current date");
  const today = new Date();
  const endDate = subDays(today, 2);
  const startDate = subDays(endDate, 27);
  
  const result = {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd')
  };
  
  console.log("Calculated default date range:", result);
  return result;
}

/**
 * Calculates a date range for a specific number of days
 * End date is 2 days before today, start date is (days-1) days before end date
 */
export function getDateRangeForDays(days: number): { startDate: string, endDate: string } {
  console.log(`Calculating date range for ${days} days dynamically based on current date`);
  const today = new Date();
  const endDate = subDays(today, 2);
  const startDate = subDays(endDate, days - 1);
  
  const result = {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd')
  };
  
  console.log("Calculated date range:", result);
  return result;
}

/**
 * Formats a date string from yyyy-MM-dd format to human-readable format (e.g. Apr 28, 2025)
 */
export function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return format(date, 'MMM d, yyyy');
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateStr;
  }
}

/**
 * Gets a readable description of the date range type
 */
export function getDateRangeDescription(days: string | number): string {
  const daysNum = typeof days === 'string' ? parseInt(days, 10) : days;
  
  switch (daysNum) {
    case 7: return 'Last 7 Days';
    case 28: return 'Last 28 Days';
    case 90: return 'Last 90 Days';
    default: 
      return days === 'custom' ? 'Custom Range' : `Last ${daysNum} Days`;
  }
}

/**
 * Analyzes keywords to determine if they contain question words
 */
export function isQuestionQuery(query: string): boolean {
  const questionWords = ['how', 'what', 'why', 'when', 'where', 'who', 'which', 'can', 'do', 'does', 'is', 'are'];
  const queryWords = query.toLowerCase().split(' ');
  return questionWords.some(word => queryWords.includes(word));
}

/**
 * Determines if a query is a long-tail keyword (3+ words)
 */
export function isLongTailQuery(query: string): boolean {
  return query.trim().split(/\s+/).length >= 3;
}

/**
 * Fetches search analytics data from Google Search Console via Supabase Edge Function
 */
export async function fetchSearchAnalytics(
  serviceAccountKey: any,
  siteUrl: string,
  pageUrl: string,
  days: string,
  startDate?: string,
  endDate?: string
): Promise<GSCResponse> {
  try {
    // Calculate date range based on the selected number of days or use provided custom range
    let finalStartDate = startDate;
    let finalEndDate = endDate;
    
    if (!startDate || !endDate) {
      if (days !== 'custom') {
        const daysNum = parseInt(days);
        console.log(`Using dynamic date range for ${daysNum} days`);
        const dateRange = getDateRangeForDays(daysNum);
        finalStartDate = dateRange.startDate;
        finalEndDate = dateRange.endDate;
      } else {
        console.log("No custom dates provided, falling back to default 28-day range");
        const defaultDates = getDefaultDateRange();
        finalStartDate = defaultDates.startDate;
        finalEndDate = defaultDates.endDate;
      }
    }
    
    console.log(`[GSC Analytics] Fetching data for page ${pageUrl}`);
    console.log(`[GSC Analytics] Using date range: ${finalStartDate} to ${finalEndDate}`);
    console.log(`[GSC Analytics] Selected filter days parameter: ${days}`);

    // Call the Supabase Edge Function to fetch GSC data
    const { data, error } = await supabase.functions.invoke('gsc-analytics', {
      body: {
        serviceAccountKey,
        siteUrl,
        pageUrl,
        days: days === 'custom' ? 28 : parseInt(days) || 28, // Default to 28 days for custom ranges
        startDate: finalStartDate,
        endDate: finalEndDate
      }
    });
    
    if (error) {
      console.error('Function invocation error:', error);
      throw new Error(`Function error: ${error.message}`);
    }
    
    if (!data || !data.data) {
      throw new Error('No data returned from GSC');
    }
    
    // Log the actual date range we received from GSC
    console.log(`[GSC Analytics] Received data with actual date range: ${data.dateRange.startDate} to ${data.dateRange.endDate}`);
    console.log(`[GSC Analytics] Requested date range was: ${data.dateRange.requestedStartDate} to ${data.dateRange.requestedEndDate}`);
    console.log(`[GSC Analytics] Filter type: ${data.dateRange.filterType}, Days: ${data.dateRange.daysRequested}`);
    console.log(`[GSC Analytics] Data points: ${data.dateRange.dataPointCount}, Total results: ${data.dateRange.totalResults}`);
    
    return {
      data: data.data,
      dateRange: data.dateRange
    };
  } catch (error) {
    console.error('Error fetching GSC analytics:', error);
    throw error;
  }
}

/**
 * Groups and categorizes GSC queries based on smart filter criteria
 */
export function categorizeQueries(queries: GSCQueryData[]) {
  return {
    lowCtr: queries.filter(q => q.ctr < 0.01),
    page2Queries: queries.filter(q => q.position >= 11 && q.position <= 20),
    questionQueries: queries.filter(q => isQuestionQuery(q.query)),
    highImpressionLowClicks: queries.filter(q => q.impressions >= 100 && q.ctr < 0.02),
    notMentioned: queries.filter(q => q.occurrences === 0),
    longTail: queries.filter(q => isLongTailQuery(q.query))
  };
}
