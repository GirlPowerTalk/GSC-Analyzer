
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
    const { serviceAccountKey, url } = await req.json()

    if (!serviceAccountKey) {
      throw new Error('Missing service account key')
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
    console.log('Successfully authenticated with service account')

    // Create Search Console API client
    const searchconsole = google.searchconsole({
      version: 'v1',
      auth: jwtClient
    })

    // Fetch site list
    console.log('Fetching GSC properties...')
    const response = await searchconsole.sites.list()
    
    // Extract site URLs and permission levels from the response
    const sites = response.data.siteEntry || []
    const properties = sites.map(site => ({
      siteUrl: site.siteUrl,
      permissionLevel: site.permissionLevel
    })).filter(site => site.siteUrl)
    
    console.log(`Found ${properties.length} GSC properties`)
    console.log('Properties:', properties.map(p => p.siteUrl).join(', '))
    
    // If url is provided, check if user has access to it
    let hasAccess = false
    let matchedUrl = null
    
    if (url) {
      try {
        // Normalize URL for comparison
        let normalizedUrl = url.toLowerCase().trim()
        if (!normalizedUrl.startsWith('http')) {
          normalizedUrl = `https://${normalizedUrl}`
        }
        
        const urlObj = new URL(normalizedUrl)
        const requestedDomain = urlObj.hostname.replace(/^www\./, '')
        
        console.log(`Looking for match for domain: ${requestedDomain}`)
        
        // Find matching property with better domain matching
        const matchingProperty = properties.find(property => {
          try {
            // Normalize property URL
            const normalizedPropertyUrl = property.siteUrl.toLowerCase()
            const propertyUrl = new URL(normalizedPropertyUrl)
            const propertyDomain = propertyUrl.hostname.replace(/^www\./, '')
            
            // Check different matching patterns
            const exactMatch = propertyDomain === requestedDomain
            const subdomainMatch = requestedDomain.endsWith(`.${propertyDomain}`)
            const domainContains = propertyDomain.includes(requestedDomain) || requestedDomain.includes(propertyDomain)
            
            console.log(`Comparing: "${propertyDomain}" with "${requestedDomain}":`, 
                        { exactMatch, subdomainMatch, domainContains })
            
            return exactMatch || subdomainMatch || domainContains
          } catch (e) {
            console.error('Error comparing URLs:', e)
            return false
          }
        })
        
        if (matchingProperty) {
          hasAccess = true
          matchedUrl = matchingProperty.siteUrl
          console.log(`Matched URL: ${matchedUrl}`)
        } else {
          console.log('No matching property found')
        }
      } catch (e) {
        console.error('Invalid URL format:', e)
      }
    }

    return new Response(
      JSON.stringify({
        properties: properties.map(p => p.siteUrl),
        hasAccess,
        matchedUrl
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error in gsc-properties function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        properties: [] 
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
