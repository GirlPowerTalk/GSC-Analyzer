import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "npm:googleapis@129.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { serviceAccountKey, siteUrl, pageUrl, days, startDate, endDate, user_email } = await req.json();
    if (!siteUrl || !pageUrl) {
      throw new Error("Missing required parameters");
    }
    // ✅ Step 1: Fetch service account key if not provided in request
    let keyObj = serviceAccountKey;
    if (!keyObj) {
      const { data, error } = await supabase.from("user_service_accounts").select("*").eq("client_email", user_email).single();
      if (error || !data) {
        throw new Error("Failed to fetch service account key from Supabase");
      }
      keyObj = data.service_account_key || {
        client_email: data.client_email,
        private_key: data.private_key
      };
    }
    // Ensure keyObj is an object
    keyObj = typeof keyObj === "string" ? JSON.parse(keyObj) : keyObj;
    if (!keyObj.private_key) {
      throw new Error("private_key not found for this service account");
    }
    const privateKey = keyObj.private_key.replace(/\\n/g, "\n").trim();
    // ✅ Step 3: Create and authorize JWT client
    const jwtClient = new google.auth.JWT(keyObj.client_email, undefined, privateKey, [
      "https://www.googleapis.com/auth/webmasters.readonly"
    ]);
    await jwtClient.authorize();
    console.log("Successfully authenticated for search analytics");
    const searchconsole = google.searchconsole({
      version: "v1",
      auth: jwtClient
    });
    // ✅ Step 4: Calculate date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let requestedEndDate;
    if (endDate) {
      requestedEndDate = new Date(endDate);
      console.log(`Using provided end date: ${endDate}`);
    } else {
      requestedEndDate = new Date(today);
      requestedEndDate.setDate(today.getDate() - 2);
      console.log(`Calculated end date: ${requestedEndDate.toISOString().split("T")[0]}`);
    }
    requestedEndDate.setHours(0, 0, 0, 0);
    const latestPossibleDate = new Date(today);
    latestPossibleDate.setDate(today.getDate() - 2);
    latestPossibleDate.setHours(0, 0, 0, 0);
    const actualEndDate = requestedEndDate > latestPossibleDate ? latestPossibleDate : requestedEndDate;
    let actualStartDate;
    if (startDate) {
      actualStartDate = new Date(startDate);
      console.log(`Using provided start date: ${startDate}`);
    } else {
      actualStartDate = new Date(actualEndDate);
      const daysToSubtract = parseInt(days) || 28;
      actualStartDate.setDate(actualEndDate.getDate() - (daysToSubtract - 1));
      console.log(`Calculated start date based on ${daysToSubtract} days: ${actualStartDate.toISOString().split("T")[0]}`);
    }
    actualStartDate.setHours(0, 0, 0, 0);
    console.log(`Fetching search analytics for ${pageUrl} from ${actualStartDate.toISOString().split("T")[0]} to ${actualEndDate.toISOString().split("T")[0]}`);
    // ✅ Step 5: Query Search Console
    const response = await searchconsole.searchanalytics.query({
      siteUrl: siteUrl,
      requestBody: {
        startDate: actualStartDate.toISOString().split("T")[0],
        endDate: actualEndDate.toISOString().split("T")[0],
        dimensions: [
          "query",
          "date"
        ],
        dimensionFilterGroups: [
          {
            filters: [
              {
                dimension: "page",
                operator: "equals",
                expression: pageUrl
              }
            ]
          }
        ],
        rowLimit: 500
      }
    });
    const rows = response.data.rows || [];
    let earliestDate = actualEndDate;
    let latestDate = actualStartDate;
    if (rows.length === 0) {
      earliestDate = actualStartDate;
      latestDate = actualEndDate;
    }
    const formattedData = rows.map((row)=>{
      const date = new Date(row.keys[1]);
      if (date < earliestDate) earliestDate = date;
      if (date > latestDate) latestDate = date;
      return {
        query: row.keys[0],
        date: row.keys[1],
        clicks: row.clicks,
        impressions: row.impressions,
        position: row.position,
        ctr: row.ctr
      };
    });
    const aggregatedData = formattedData.reduce((acc, curr)=>{
      const existing = acc.find((item)=>item.query === curr.query);
      if (existing) {
        existing.clicks += curr.clicks;
        existing.impressions += curr.impressions;
        existing.ctr = existing.clicks / existing.impressions;
        existing.position = (existing.position + curr.position) / 2;
      } else {
        acc.push({
          ...curr
        });
      }
      return acc;
    }, []);
    const dateRange = {
      startDate: formattedData.length > 0 ? earliestDate.toISOString().split("T")[0] : actualStartDate.toISOString().split("T")[0],
      endDate: formattedData.length > 0 ? latestDate.toISOString().split("T")[0] : actualEndDate.toISOString().split("T")[0],
      requestedStartDate: actualStartDate.toISOString().split("T")[0],
      requestedEndDate: actualEndDate.toISOString().split("T")[0],
      filterType: days === "custom" ? "custom" : `${days}-day`,
      daysRequested: parseInt(days) || 28,
      dataPointCount: formattedData.length,
      totalResults: aggregatedData.length
    };
    return new Response(JSON.stringify({
      data: aggregatedData,
      dateRange
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error in gsc-analytics function:", error);
    return new Response(JSON.stringify({
      error: error.message,
      data: [],
      dateRange: {
        startDate: "",
        endDate: "",
        requestedStartDate: "",
        requestedEndDate: "",
        filterType: "",
        daysRequested: 0,
        dataPointCount: 0,
        totalResults: 0
      }
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
