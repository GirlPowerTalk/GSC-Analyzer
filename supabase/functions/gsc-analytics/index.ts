
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { google } from "npm:googleapis@129.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { serviceAccountKey, siteUrl, pageUrl, days, startDate, endDate } = await req.json()

    if (!serviceAccountKey || !siteUrl || !pageUrl) {
      throw new Error('Missing required parameters')
    }

    // Create JWT client using service account credentials
    const jwtClient = new google.auth.JWT(
      serviceAccountKey.client_email,
      undefined,
      serviceAccountKey.private_key,
      ['https://www.googleapis.com/auth/webmasters.readonly']
    )

    // Authenticate
    await jwtClient.authorize()
    console.log('Successfully authenticated for search analytics')

    // Create Search Console API client
    const searchconsole = google.searchconsole({
      version: 'v1',
      auth: jwtClient
    })
    
    // Calculate date range - this happens dynamically every time the function is called
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Default: end date is 2 days before today (GSC data is typically delayed)
    let requestedEndDate
    if (endDate) {
      requestedEndDate = new Date(endDate)
      console.log(`Using provided end date: ${endDate}`)
    } else {
      requestedEndDate = new Date(today)
      requestedEndDate.setDate(today.getDate() - 2)
      console.log(`Calculated end date: ${requestedEndDate.toISOString().split('T')[0]}`)
    }
    requestedEndDate.setHours(0, 0, 0, 0)
    
    // Safety check: GSC data is typically delayed by 2-3 days
    const latestPossibleDate = new Date(today)
    latestPossibleDate.setDate(today.getDate() - 2) // Using 2 days for more recent data
    latestPossibleDate.setHours(0, 0, 0, 0)
    
    // If requested end date is after the latest possible date, adjust it
    // This ensures we always get the most recent available data
    const actualEndDate = requestedEndDate > latestPossibleDate ? 
      latestPossibleDate : requestedEndDate
    
    console.log(`Latest possible GSC date: ${latestPossibleDate.toISOString().split('T')[0]}`)
    console.log(`Requested end date: ${requestedEndDate.toISOString().split('T')[0]}`)
    console.log(`Using actual end date for query: ${actualEndDate.toISOString().split('T')[0]}`)
    
    // Calculate start date: either provided start date or N days before end date
    let actualStartDate
    if (startDate) {
      actualStartDate = new Date(startDate)
      console.log(`Using provided start date: ${startDate}`)
    } else {
      actualStartDate = new Date(actualEndDate)
      const daysToSubtract = parseInt(days) || 28
      actualStartDate.setDate(actualEndDate.getDate() - (daysToSubtract - 1))
      console.log(`Calculated start date based on ${daysToSubtract} days: ${actualStartDate.toISOString().split('T')[0]}`)
    }
    actualStartDate.setHours(0, 0, 0, 0)

    // Log the date range we're fetching
    console.log(`Fetching search analytics for ${pageUrl} from ${actualStartDate.toISOString().split('T')[0]} to ${actualEndDate.toISOString().split('T')[0]}`)
    console.log(`Original days parameter from request: ${days}`)
    
    // Make the search analytics query
    const response = await searchconsole.searchanalytics.query({
      siteUrl: siteUrl,
      requestBody: {
        startDate: actualStartDate.toISOString().split('T')[0],
        endDate: actualEndDate.toISOString().split('T')[0],
        dimensions: ['query', 'date'],
        dimensionFilterGroups: [{
          filters: [{
            dimension: 'page',
            operator: 'equals',
            expression: pageUrl
          }]
        }],
        rowLimit: 500
      }
    })

    // Process the data and detect actual date range from results
    const rows = response.data.rows || []
    let earliestDate = actualEndDate
    let latestDate = actualStartDate
    
    // Reset if we have no data to avoid incorrect date ranges
    if (rows.length === 0) {
      earliestDate = actualStartDate
      latestDate = actualEndDate
    }
    
    const formattedData = rows.map(row => {
      const date = new Date(row.keys[1])
      if (date < earliestDate) earliestDate = date
      if (date > latestDate) latestDate = date
      
      return {
        query: row.keys[0],
        date: row.keys[1],
        clicks: row.clicks,
        impressions: row.impressions,
        position: row.position,
        ctr: row.ctr,
      }
    })

    // Aggregate data by query
    const aggregatedData = formattedData.reduce((acc, curr) => {
      const existing = acc.find(item => item.query === curr.query)
      if (existing) {
        existing.clicks += curr.clicks
        existing.impressions += curr.impressions
        existing.ctr = existing.clicks / existing.impressions
        existing.position = (existing.position + curr.position) / 2
      } else {
        acc.push({
          query: curr.query,
          clicks: curr.clicks,
          impressions: curr.impressions,
          position: curr.position,
          ctr: curr.ctr,
        })
      }
      return acc
    }, [])

    // Complete date range metadata information
    // This includes BOTH the requested range and the actual data range
    const dateRange = {
      // Actual date range from the data
      startDate: formattedData.length > 0 ? earliestDate.toISOString().split('T')[0] : actualStartDate.toISOString().split('T')[0],
      endDate: formattedData.length > 0 ? latestDate.toISOString().split('T')[0] : actualEndDate.toISOString().split('T')[0],
      
      // Requested date range (what was asked for)
      requestedStartDate: actualStartDate.toISOString().split('T')[0],
      requestedEndDate: actualEndDate.toISOString().split('T')[0],
      
      // Filter information
      filterType: days === 'custom' ? 'custom' : `${days}-day`,
      daysRequested: parseInt(days) || 28,
      
      // Data points information
      dataPointCount: formattedData.length,
      totalResults: aggregatedData.length
    }

    // Add detailed logging of what we're sending back to the client
    console.log(`Sending response with actual date range: ${dateRange.startDate} to ${dateRange.endDate}`)
    console.log(`Requested date range was: ${dateRange.requestedStartDate} to ${dateRange.requestedEndDate}`)
    console.log(`Filter used: ${dateRange.filterType}`)
    console.log(`Found ${aggregatedData.length} queries across ${formattedData.length} data points`)

    return new Response(
      JSON.stringify({
        data: aggregatedData,
        dateRange: dateRange
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error in gsc-analytics function:', error)
    return new Response(
      JSON.stringify({ 
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
