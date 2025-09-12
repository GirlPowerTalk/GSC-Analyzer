import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import GscSettings from "@/components/GscSettings";
import LoadingState from "@/components/LoadingState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { scrapePageContent } from "@/lib/api";
import { fetchGscProperties } from "@/lib/gsc";
import { fetchSearchAnalytics, getDefaultDateRange, formatDateForDisplay, getDateRangeDescription } from "@/lib/gsc/analytics";
import PageContent from "@/components/PageContent";
import QueriesTable from "@/components/QueriesTable";
import { RefreshCw, Calendar } from "lucide-react";

const Analyze = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const urlParam = searchParams.get("url");
  const type = searchParams.get("type") || "full";
  
  const [url, setUrl] = useState(urlParam || "");
  const [days, setDays] = useState("28");
  const [actualDateRange, setActualDateRange] = useState<{
    startDate: string;
    endDate: string;
    requestedStartDate: string;
    requestedEndDate: string;
    filterType: string;
    daysRequested: number;
    dataPointCount: number;
    totalResults: number;
  } | null>(null);

  const defaultDateRange = getDefaultDateRange();
  const [customStartDate, setCustomStartDate] = useState<string | undefined>(defaultDateRange.startDate);
  const [customEndDate, setCustomEndDate] = useState<string | undefined>(defaultDateRange.endDate);
  const [isScrapingContent, setIsScrapingContent] = useState(false);
  const [pageContent, setPageContent] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [credentials, setCredentials] = useState<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [gscMode, setGscMode] = useState<"api" | "oauth" | null>(null);
  const [properties, setProperties] = useState<string[]>([]);
  const [hasShownFetchingToast, setHasShownFetchingToast] = useState(false);
  const [dataRefetchKey, setDataRefetchKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshIntervalRef = useRef<number | null>(null);
  const prevUrlRef = useRef<string | null>(null);
  const lastFetchTimeRef = useRef<number>(Date.now());
  
  // Force refetch when URL changes
  useEffect(() => {
    if (urlParam && urlParam !== prevUrlRef.current) {
      // URL has changed, increment refetch key to force data refresh
      setDataRefetchKey(prev => prev + 1);
      prevUrlRef.current = urlParam;
      
      // Clear page content when URL changes
      setPageContent(null);
      
      // Reset date range to default when URL changes
      const freshDateRange = getDefaultDateRange();
      setCustomStartDate(freshDateRange.startDate);
      setCustomEndDate(freshDateRange.endDate);
      
      toast.info("Loading data for new URL...");
      console.log("URL changed, triggering data refresh");
    }
  }, [urlParam]);
  
  // Check if we need to refresh data based on date change
  useEffect(() => {
    const checkForDateChange = () => {
      const today = new Date().toDateString();
      const lastFetchDate = localStorage.getItem('gscLastFetchDate');
      
      if (!lastFetchDate || lastFetchDate !== today) {
        // Store the current date as last fetch date
        localStorage.setItem('gscLastFetchDate', today);
        
        // Also update the default date range to reflect the new current date
        const freshDateRange = getDefaultDateRange();
        setCustomStartDate(freshDateRange.startDate);
        setCustomEndDate(freshDateRange.endDate);
        
        // Increment refetch key to trigger a fresh data fetch
        setDataRefetchKey(prev => prev + 1);
        console.log("Date changed since last fetch. Triggering refetch with fresh date range:", freshDateRange);
      }
    };
    
    // Check immediately on component mount
    checkForDateChange();
    
    // Set up interval to regularly check and refresh data for active users (every 6 hours)
    refreshIntervalRef.current = window.setInterval(() => {
      checkForDateChange();
    }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds
    
    return () => {
      // Clean up interval on component unmount
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);
  
  // Manual refresh function
  const handleRefreshData = () => {
    setIsRefreshing(true);
    
    // Clear local storage dates to force fresh calculation
    localStorage.removeItem('gscLastFetchDate');
    
    // Reset date states to current calculation
    const freshDateRange = getDefaultDateRange();
    setCustomStartDate(freshDateRange.startDate);
    setCustomEndDate(freshDateRange.endDate);
    
    // Update the last fetch time
    lastFetchTimeRef.current = Date.now();
    
    // Force data refetch
    setDataRefetchKey(prev => prev + 1);
    
    toast.success("Refreshing data with latest dates");
    console.log("Manual refresh triggered with fresh date range:", freshDateRange);
    
    // Reset refreshing state after a short delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };
  
  const extractDomain = (urlString: string): string => {
    try {
      const url = new URL(urlString);
      return url.hostname.replace(/^www\./, '');
    } catch (e) {
      return urlString.replace(/^(https?:\/\/)?(www\.)?/, '');
    }
  };
  
  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const { data: serviceAccountData, error: serviceAccountError } = await supabase
          .from("gsc_credentials")
          .select("service_account_key")
          .limit(1);
        
        if (serviceAccountData && serviceAccountData.length > 0) {
          setCredentials(serviceAccountData[0]);
          setGscMode("api");
          return;
        }
        
        const { data: oauthData, error: oauthError } = await supabase
          .from("gsc_oauth_credentials")
          .select("*")
          .limit(1);
        
        if (oauthData && oauthData.length > 0) {
          setCredentials(oauthData[0]);
          setGscMode("oauth");
          return;
        }
        
        setGscMode(null);
      } catch (error) {
        console.error("Error fetching GSC credentials:", error);
        toast.error("Failed to fetch GSC credentials");
      }
    };
    
    fetchCredentials();
  }, []);
  
  useEffect(() => {
    const fetchGSCProperties = async () => {
      if (!credentials || !gscMode) return;
      
      try {
        if (!hasShownFetchingToast) {
          toast.info("Fetching your GSC properties...");
          setHasShownFetchingToast(true);
        }
        
        const { data: verifiedDomainsData } = await supabase
          .from('verified_domains')
          .select('domain');
        
        const verifiedDomains = (verifiedDomainsData || []).map(d => d.domain);
        
        if (verifiedDomains.length === 0) {
          toast.error("No domains found. Please add domains in the Account settings.");
          return;
        }
        
        let propertiesData: string[] = [];
        
        if (gscMode === "api" && credentials.service_account_key) {
          propertiesData = await fetchGscProperties(credentials.service_account_key);
        } else if (gscMode === "oauth") {
          toast.error("OAuth property fetching not implemented yet");
          return;
        }
        
        if (!propertiesData || propertiesData.length === 0) {
          toast.error("Failed to fetch GSC properties or no properties found");
          return;
        }
        
        console.log("Fetched properties:", propertiesData);
        console.log("Verified domains:", verifiedDomains);
        
        const filteredProperties = propertiesData.filter(property => {
          const propertyDomain = extractDomain(property);
          
          return verifiedDomains.some(vd => {
            const verifiedDomain = vd.toLowerCase();
            const exactMatch = propertyDomain === verifiedDomain;
            const subdomainMatch = propertyDomain.endsWith(`.${verifiedDomain}`);
            const domainContains = propertyDomain.includes(verifiedDomain) || 
                                  verifiedDomain.includes(propertyDomain);
            
            console.log(`Comparing: "${propertyDomain}" with "${verifiedDomain}":`, 
                        { exactMatch, subdomainMatch, domainContains });
            
            return exactMatch || subdomainMatch || domainContains;
          });
        });
        
        console.log("Filtered properties:", filteredProperties);
        
        if (filteredProperties.length > 0) {
          setProperties(filteredProperties);
          
          if (url) {
            const urlDomain = extractDomain(url);
            
            const matchingProperty = filteredProperties.find(property => {
              const propDomain = extractDomain(property);
              return urlDomain === propDomain || urlDomain.includes(propDomain) || propDomain.includes(urlDomain);
            });
            
            if (matchingProperty) {
              setSelectedProperty(matchingProperty);
              toast.success(`Selected property: ${matchingProperty}`);
            } else {
              toast.info("No matching GSC property found for this URL");
            }
          }
        } else {
          toast.error("No GSC properties found matching your domains. Make sure you've granted access to the service account in GSC for these domains.");
        }
      } catch (error) {
        console.error("Error fetching GSC properties:", error);
        toast.error("Failed to fetch GSC properties");
      }
    };
    
    if (credentials && gscMode) {
      fetchGSCProperties();
    }
  }, [credentials, gscMode, url, hasShownFetchingToast]);
  
  const [editedContent, setEditedContent] = useState<string | null>(null);
  
  const { data: queryData, isLoading: isLoadingQueries, refetch: refetchQueries } = useQuery({
    queryKey: ['gscQueries', url, selectedProperty, days, customStartDate, customEndDate, dataRefetchKey],
    queryFn: async () => {
      if (!selectedProperty || !credentials) {
        return [];
      }
      
      try {
        let queries: any[] = [];
        
        if (gscMode === "api" && credentials.service_account_key) {
          console.log(`Fetching GSC data at ${new Date().toISOString()}`);
          console.log(`Using date filter: ${days} days`);
          console.log(`Custom date range: ${customStartDate} to ${customEndDate}`);
          
          const gscResponse = await fetchSearchAnalytics(
            credentials.service_account_key,
            selectedProperty,
            url,
            days,
            days === 'custom' ? customStartDate : undefined,
            days === 'custom' ? customEndDate : undefined
          );
          
          if (gscResponse.dateRange) {
            setActualDateRange(gscResponse.dateRange);
            console.log("Actual date range from GSC:", gscResponse.dateRange);
            
            // Log the full date range details
            console.log("Date range details:", {
              actual: {
                start: gscResponse.dateRange.startDate, 
                end: gscResponse.dateRange.endDate
              },
              requested: {
                start: gscResponse.dateRange.requestedStartDate, 
                end: gscResponse.dateRange.requestedEndDate
              },
              filterType: gscResponse.dateRange.filterType,
              days: gscResponse.dateRange.daysRequested,
              dataPoints: gscResponse.dateRange.dataPointCount
            });
          }
          
          queries = gscResponse.data || [];
        } else {
          toast.error("OAuth mode not fully implemented");
          return [];
        }
        
        if (type === "full" && pageContent) {
          // Use editedContent if available, otherwise use pageContent.content
          const contentToAnalyze = editedContent || pageContent.content;
          
          return queries.map(query => {
            const escapedQuery = query.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const queryRegex = new RegExp(escapedQuery, "gi");
            const matches = contentToAnalyze.match(queryRegex) || [];
            return {
              ...query,
              occurrences: matches.length
            };
          });
        }
        
        return queries.map(query => ({
          ...query,
          occurrences: 0
        }));
      } catch (error) {
        console.error("Error fetching GSC data:", error);
        toast.error("Failed to fetch GSC data");
        return [];
      }
    },
    enabled: Boolean(selectedProperty && credentials && url),
    // Reduce stale time to ensure fresher data
    staleTime: 1 * 60 * 60 * 1000, // 1 hour in milliseconds
  });
  
  useEffect(() => {
    const getPageContent = async () => {
      if (type === "full" && url && !pageContent && !isScrapingContent) {
        setIsScrapingContent(true);
        try {
          const content = await scrapePageContent(url);
          setPageContent(content);
        } catch (error) {
          console.error("Error fetching page content:", error);
          toast.error("Failed to fetch page content");
          setPageContent({
            title: "Error fetching content",
            content: `Failed to fetch content from ${url}`
          });
        } finally {
          setIsScrapingContent(false);
        }
      }
    };
    
    getPageContent();
  }, [url, type, pageContent, isScrapingContent]);
  
  const handleBackClick = () => {
    navigate("/");
  };
  
  const handleDateRangeChange = (value: string, startDate?: string, endDate?: string) => {
    console.log(`Date range change requested: ${value} (${startDate} to ${endDate})`);
    setDays(value);
    
    if (value === 'custom' && startDate && endDate) {
      console.log(`Setting custom date range: ${startDate} to ${endDate}`);
      setCustomStartDate(startDate);
      setCustomEndDate(endDate);
    } else {
      // For non-custom ranges, let the analytics library calculate the dates based on the days
      console.log(`Setting standard date range for ${value} days`);
      const defaultDates = getDefaultDateRange();
      setCustomStartDate(defaultDates.startDate);
      setCustomEndDate(defaultDates.endDate);
    }
    
    // Force data refetch with new parameters
    setDataRefetchKey(prev => prev + 1);
    
    // Show a toast to indicate data is being refreshed
    toast.info(`Updating data for ${value === 'custom' ? 'custom date range' : `last ${value} days`}...`);
  };
  
  const handleContentChanged = (content: string) => {
    setEditedContent(content);
    
  };
  
  const handleContentSaved = (content: string) => {
    setEditedContent(content);
    // Refetch queries to update the occurrences
    refetchQueries();
    toast.info("Updating query occurrences based on new content...");
  };
  
  if (!gscMode) {
    return <LoadingState message="Loading Google Search Console integration..." />;
  }
  
  if (!credentials) {
    return <GscSettings />;
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <Button variant="outline" onClick={handleBackClick}>
          Back to Home
        </Button>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          
          {properties.length > 0 && (
            <Select 
              value={selectedProperty || ""}
              onValueChange={setSelectedProperty}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select GSC property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property} value={property}>
                    {property}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2 justify-between">
            <div>
              <span>Analyzing: </span>
              <span className="font-normal text-brand-600">{url}</span>
            </div>
            {actualDateRange && (
              <div className="text-sm font-normal flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Filter: {getDateRangeDescription(days === 'custom' ? 'custom' : days)}
                </span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {isScrapingContent ? (
            <div className="py-10">
              <LoadingState message="Scraping page content..." />
            </div>
          ) : (
            <>
              {pageContent && (
                <PageContent 
                  pageData={pageContent} 
                  queryData={queryData || []} 
                  onSave={handleContentSaved}
                  onContentChanged={handleContentChanged}
                />
              )}
              
              <QueriesTable 
                data={queryData || []} 
                showOccurrences={type === "full"} 
                dateRange={days}
                onDateRangeChange={handleDateRangeChange}
                isLoading={isLoadingQueries}
                actualDateRange={actualDateRange}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Analyze;
