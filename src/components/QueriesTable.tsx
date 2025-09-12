import { useState, useEffect, useMemo } from "react";
import { format, isValid, parseISO, isBefore, isAfter, differenceInDays } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Filter, RefreshCw, Download, Calendar, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/Spinner";
import { Progress } from "@/components/ui/progress";
import { formatDateForDisplay, getDateRangeDescription } from "@/lib/gsc/analytics";
import { SmartFilters, SmartFilter, SMART_FILTERS, SmartFilterType } from "./SmartFilters";
import { Checkbox } from "@/components/ui/checkbox";

interface QueryData {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
  occurrences: number;
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

interface QueriesTableProps {
  data: QueryData[];
  showOccurrences: boolean;
  dateRange: string;
  onDateRangeChange: (value: string, startDate?: string, endDate?: string) => void;
  isLoading?: boolean;
  actualDateRange?: DateRange | null;
}

const QueriesTable = ({ 
  data, 
  showOccurrences, 
  dateRange,
  onDateRangeChange,
  isLoading = false,
  actualDateRange
}: QueriesTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "impressions", desc: true },
  ]);
  const [filters, setFilters] = useState({
    position: { min: "", max: "" },
    impressions: { min: "", max: "" },
    clicks: { min: "", max: "" },
    ctr: { min: "", max: "" },
    occurrences: { min: "", max: "" }
  });
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [localDateRange, setLocalDateRange] = useState(dateRange);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingOperationId, setLoadingOperationId] = useState<number>(0);
  const [smartFiltersState, setSmartFiltersState] = useState<SmartFilter[]>([
    {
      id: SMART_FILTERS.lowCtr,
      name: "Low CTR",
      description: "Queries with CTR below 1%",
      active: false
    },
    {
      id: SMART_FILTERS.page2Queries,
      name: "Page 2 Queries",
      description: "Queries ranking on page 2 (positions 11-20)",
      active: false
    },
    {
      id: SMART_FILTERS.questionQueries,
      name: "Question Queries",
      description: "Queries containing question words (how, what, why, etc.)",
      active: false
    },
    {
      id: SMART_FILTERS.highImpressionLowClicks,
      name: "High Impression, Low Clicks",
      description: "Queries with 100+ impressions but low CTR",
      active: false
    },
    {
      id: SMART_FILTERS.notMentioned,
      name: "Not Mentioned Queries",
      description: "Queries with 0 mentions in content",
      active: false
    },
    {
      id: SMART_FILTERS.longTail,
      name: "Long-Tail Queries",
      description: "Queries with 3+ words",
      active: false
    }
  ]);
  
  // Update localDateRange when the parent dateRange changes
  useEffect(() => {
    console.log("Date range changed from parent:", dateRange);
    setLocalDateRange(dateRange);
  }, [dateRange]);

  // Loading effect when data is being fetched
  useEffect(() => {
    if (isLoading) {
      setIsTableLoading(true);
      setLoadingProgress(0);
      
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev < 90) {
            return prev + Math.random() * 3;
          }
          return prev;
        });
      }, 200);
      
      return () => clearInterval(interval);
    } else {
      setLoadingProgress(100);
      const timeout = setTimeout(() => {
        setIsTableLoading(false);
        setLoadingProgress(0);
      }, 400);
      
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [filters]);

  const handleDateRangeChange = (value: string) => {
    console.log(`Changing date range to: ${value}`);
    setLocalDateRange(value);
    
    const operationId = loadingOperationId + 1;
    setLoadingOperationId(operationId);
    
    setIsTableLoading(true);
    setLoadingProgress(0);
    
    // Pass the request up to the parent for data refetch
    onDateRangeChange(value);
    
    // Reset filters when date range changes
    setFilters({
      position: { min: "", max: "" },
      impressions: { min: "", max: "" },
      clicks: { min: "", max: "" },
      ctr: { min: "", max: "" },
      occurrences: { min: "", max: "" }
    });
    
    // Reset smart filters
    setSmartFiltersState(prev => 
      prev.map(filter => ({ ...filter, active: false }))
    );
    
    // Reset to first page
    setCurrentPage(0);
  };
  
  const dateRanges = [
    { value: "7", label: "Last 7 Days" },
    { value: "28", label: "Last 28 Days" },
    { value: "90", label: "Last 90 Days" },
    { value: "custom", label: "Custom Range" }
  ];

  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  
  // Get latest possible date for calendar (2 days before today)
  const latestPossibleDate = useMemo(() => {
    const today = new Date();
    return new Date(today.setDate(today.getDate() - 2));
  }, []);

  useEffect(() => {
    if (isCustomDateOpen) {
      setCustomStartDate(undefined);
      setCustomEndDate(undefined);
    }
  }, [isCustomDateOpen]);

  const handleCustomDateSelect = () => {
    if (customStartDate && customEndDate) {
      const operationId = loadingOperationId + 1;
      setLoadingOperationId(operationId);
      
      setIsTableLoading(true);
      setLoadingProgress(0);
      
      console.log("Selected custom date range:", {
        startDate: format(customStartDate, 'yyyy-MM-dd'),
        endDate: format(customEndDate, 'yyyy-MM-dd')
      });
      
      onDateRangeChange(
        'custom',
        format(customStartDate, 'yyyy-MM-dd'),
        format(customEndDate, 'yyyy-MM-dd')
      );
      setIsCustomDateOpen(false);
    }
  };

  // Smart filter toggle function
  const handleSmartFilterToggle = (filterId: string) => {
    setSmartFiltersState(prev => 
      prev.map(filter => 
        filter.id === filterId 
          ? { ...filter, active: !filter.active } 
          : filter
      )
    );
    setCurrentPage(0);
  };

  // Clear all smart filters
  const handleClearAllSmartFilters = () => {
    setSmartFiltersState(prev => 
      prev.map(filter => ({ ...filter, active: false }))
    );
  };

  // Apply smart filter logic to the data
  const applySmartFilters = (data: QueryData[]) => {
    // If no smart filters are active, return the original data
    if (!smartFiltersState.some(filter => filter.active)) {
      return data;
    }

    return data.filter(row => {
      // Apply each active filter
      for (const filter of smartFiltersState) {
        if (filter.active) {
          switch (filter.id) {
            case SMART_FILTERS.lowCtr:
              if (!(row.ctr < 0.01)) return false;
              break;
            case SMART_FILTERS.page2Queries:
              if (!(row.position >= 11 && row.position <= 20)) return false;
              break;
            case SMART_FILTERS.questionQueries:
              const questionWords = ['how', 'what', 'why', 'when', 'where', 'who', 'which', 'can', 'do', 'does', 'is', 'are'];
              const queryWords = row.query.toLowerCase().split(' ');
              if (!questionWords.some(word => queryWords.includes(word))) return false;
              break;
            case SMART_FILTERS.highImpressionLowClicks:
              if (!(row.impressions >= 100 && row.ctr < 0.02)) return false;
              break;
            case SMART_FILTERS.notMentioned:
              if (!(showOccurrences && row.occurrences === 0)) return false;
              break;
            case SMART_FILTERS.longTail:
              if (!(row.query.split(' ').length >= 3)) return false;
              break;
          }
        }
      }
      return true;
    });
  };

  // Update smart filter counts
  const updateSmartFilterCounts = (data: QueryData[]) => {
    return smartFiltersState.map(filter => {
      let count = 0;
      
      switch (filter.id) {
        case SMART_FILTERS.lowCtr:
          count = data.filter(row => row.ctr < 0.01).length;
          break;
        case SMART_FILTERS.page2Queries:
          count = data.filter(row => row.position >= 11 && row.position <= 20).length;
          break;
        case SMART_FILTERS.questionQueries:
          const questionWords = ['how', 'what', 'why', 'when', 'where', 'who', 'which', 'can', 'do', 'does', 'is', 'are'];
          count = data.filter(row => {
            const queryWords = row.query.toLowerCase().split(' ');
            return questionWords.some(word => queryWords.includes(word));
          }).length;
          break;
        case SMART_FILTERS.highImpressionLowClicks:
          count = data.filter(row => row.impressions >= 100 && row.ctr < 0.02).length;
          break;
        case SMART_FILTERS.notMentioned:
          count = showOccurrences ? data.filter(row => row.occurrences === 0).length : 0;
          break;
        case SMART_FILTERS.longTail:
          count = data.filter(row => row.query.split(' ').length >= 3).length;
          break;
      }
      
      return { ...filter, count };
    });
  };

  const renderLoadingPlaceholder = () => {
    return (
      <div className="space-y-4 py-8">
        <div className="flex justify-center items-center flex-col gap-4">
          <Spinner className="h-10 w-10 text-brand-600" />
          <p className="text-muted-foreground">Loading query data...</p>
          <Progress value={loadingProgress} className="w-1/2 h-2" />
        </div>
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render the improved date range information banner
  const renderDateRangeInfo = () => {
    if (!actualDateRange || !actualDateRange.startDate || !actualDateRange.endDate) {
      return null;
    }

    try {
      // Display date range from GSC data
      const startDateFormatted = formatDateForDisplay(actualDateRange.startDate);
      const endDateFormatted = formatDateForDisplay(actualDateRange.endDate);
      
      // Get proper description of date range based on filter
      const rangeLabel = getDateRangeDescription(
        dateRange === 'custom' ? actualDateRange.daysRequested : dateRange
      );
      
      // Calculate number of days in the actual received data
      const actualDaysInRange = differenceInDays(
        parseISO(actualDateRange.endDate),
        parseISO(actualDateRange.startDate)
      ) + 1;
      
      return (
        <div className="mt-2 mb-4 text-sm border p-3 rounded-md bg-slate-50">
          <div>
            <span className="font-medium">GSC data from {startDateFormatted} to {endDateFormatted}</span>
            <span className="ml-2 text-muted-foreground">
              ({rangeLabel} • {actualDaysInRange} days)
            </span>
            
            {dateRange !== 'custom' && actualDaysInRange !== parseInt(dateRange) && (
              <div className="mt-1 text-amber-600 flex items-center gap-1">
                <Info className="h-4 w-4" />
                <span>
                  Note: GSC data is delayed by a few days. This is the most recent data available.
                </span>
              </div>
            )}
          </div>
        </div>
      );
    } catch (error) {
      console.error("Error formatting date range info:", error);
      return null;
    }
  };

  // Filter the data based on current filter settings
  const filteredData = useMemo(() => {
    // First apply numeric filters
    const numericFiltered = data.filter(row => {
      const posMinVal = filters.position.min !== "" ? Number(filters.position.min) : null;
      const posMaxVal = filters.position.max !== "" ? Number(filters.position.max) : null;
      const impMinVal = filters.impressions.min !== "" ? Number(filters.impressions.min) : null;
      const impMaxVal = filters.impressions.max !== "" ? Number(filters.impressions.max) : null;
      const clicksMinVal = filters.clicks.min !== "" ? Number(filters.clicks.min) : null;
      const clicksMaxVal = filters.clicks.max !== "" ? Number(filters.clicks.max) : null;
      const ctrMinVal = filters.ctr.min !== "" ? Number(filters.ctr.min) : null;
      const ctrMaxVal = filters.ctr.max !== "" ? Number(filters.ctr.max) : null;
      const occMinVal = filters.occurrences.min !== "" ? Number(filters.occurrences.min) : null;
      const occMaxVal = filters.occurrences.max !== "" ? Number(filters.occurrences.max) : null;

      const isInRange = (value: number, minVal: number | null, maxVal: number | null) => {
        return (minVal === null || value >= minVal) && 
               (maxVal === null || value <= maxVal);
      };

      const positionMatch = isInRange(row.position, posMinVal, posMaxVal);
      const impressionsMatch = isInRange(row.impressions, impMinVal, impMaxVal);
      const clicksMatch = isInRange(row.clicks, clicksMinVal, clicksMaxVal);
      const ctrMatch = isInRange(row.ctr * 100, ctrMinVal, ctrMaxVal);
      const occurrencesMatch = !showOccurrences || 
        isInRange(row.occurrences, occMinVal, occMaxVal);
      
      return positionMatch && impressionsMatch && clicksMatch && ctrMatch && occurrencesMatch;
    });
    
    // Then apply smart filters
    return applySmartFilters(numericFiltered);
  }, [data, filters, showOccurrences, smartFiltersState]);

  // Update smart filter counts when data changes
  useEffect(() => {
    const filteredWithoutSmartFilters = data.filter(row => {
      const posMinVal = filters.position.min !== "" ? Number(filters.position.min) : null;
      const posMaxVal = filters.position.max !== "" ? Number(filters.position.max) : null;
      const impMinVal = filters.impressions.min !== "" ? Number(filters.impressions.min) : null;
      const impMaxVal = filters.impressions.max !== "" ? Number(filters.impressions.max) : null;
      const clicksMinVal = filters.clicks.min !== "" ? Number(filters.clicks.min) : null;
      const clicksMaxVal = filters.clicks.max !== "" ? Number(filters.clicks.max) : null;
      const ctrMinVal = filters.ctr.min !== "" ? Number(filters.ctr.min) : null;
      const ctrMaxVal = filters.ctr.max !== "" ? Number(filters.ctr.max) : null;
      const occMinVal = filters.occurrences.min !== "" ? Number(filters.occurrences.min) : null;
      const occMaxVal = filters.occurrences.max !== "" ? Number(filters.occurrences.max) : null;

      const isInRange = (value: number, minVal: number | null, maxVal: number | null) => {
        return (minVal === null || value >= minVal) && 
               (maxVal === null || value <= maxVal);
      };

      const positionMatch = isInRange(row.position, posMinVal, posMaxVal);
      const impressionsMatch = isInRange(row.impressions, impMinVal, impMaxVal);
      const clicksMatch = isInRange(row.clicks, clicksMinVal, clicksMaxVal);
      const ctrMatch = isInRange(row.ctr * 100, ctrMinVal, ctrMaxVal);
      const occurrencesMatch = !showOccurrences || 
        isInRange(row.occurrences, occMinVal, occMaxVal);
      
      return positionMatch && impressionsMatch && clicksMatch && ctrMatch && occurrencesMatch;
    });
    
    setSmartFiltersState(updateSmartFilterCounts(filteredWithoutSmartFilters));
  }, [data, filters, showOccurrences]);

  // Export filtered data to CSV
  const handleExport = () => {
    const csvContent = [
      ["Query", "Clicks", "Impressions", "Position", "CTR", ...(showOccurrences ? ["Mentions"] : [])].join(","),
      ...filteredData.map(row => [
        `"${row.query}"`,
        row.clicks,
        row.impressions,
        row.position.toFixed(1),
        (row.ctr * 100).toFixed(1) + "%",
        ...(showOccurrences ? [row.occurrences] : [])
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `search-queries-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded");
  };

  // Refresh data using current filters
  const handleRefresh = () => {
    const operationId = loadingOperationId + 1;
    setLoadingOperationId(operationId);
    
    setIsTableLoading(true);
    setLoadingProgress(0);
    
    onDateRangeChange(dateRange);
    toast.success("Data refreshed");
  };

  // Column definitions for the table with highlighting for smart filters
  const columns: ColumnDef<QueryData>[] = useMemo(() => {
    const baseColumns: ColumnDef<QueryData>[] = [
      {
        accessorKey: "query",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent flex items-center"
            >
              Search Query
              <span className="ml-2">
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="h-4 w-4" />
                ) : null}
              </span>
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const query = row.getValue("query") as string;
          const isQuestion = ['how', 'what', 'why', 'when', 'where', 'who', 'which', 'can', 'do', 'does', 'is', 'are']
            .some(word => query.toLowerCase().split(' ').includes(word));
          const isLongTail = query.split(' ').length >= 3;
          
          const smartFilterActive = smartFiltersState.some(filter => filter.active);
          
          const questionActive = smartFiltersState.find(f => f.id === SMART_FILTERS.questionQueries)?.active;
          const longTailActive = smartFiltersState.find(f => f.id === SMART_FILTERS.longTail)?.active;
          
          const highlightQuestion = questionActive && isQuestion;
          const highlightLongTail = longTailActive && isLongTail;
          
          return (
            <div className="font-medium">
              {highlightQuestion || highlightLongTail ? (
                <span 
                  className={`${
                    (highlightQuestion && highlightLongTail) 
                      ? "bg-yellow-100 border-b-2 border-yellow-400" 
                      : highlightQuestion 
                        ? "bg-green-100" 
                        : "bg-blue-100"
                  } px-1 py-0.5 rounded-sm`}
                >
                  {query}
                </span>
              ) : (
                query
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "clicks",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent flex items-center"
            >
              Clicks
              <span className="ml-2">
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="h-4 w-4" />
                ) : null}
              </span>
            </Button>
          </div>
        ),
        cell: ({ row }) => row.getValue("clicks"),
      },
      {
        accessorKey: "impressions",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent flex items-center"
            >
              Impressions
              <span className="ml-2">
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="h-4 w-4" />
                ) : null}
              </span>
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const impressions = row.getValue("impressions") as number;
          const clicks = row.getValue("clicks") as number;
          const ctr = row.getValue("ctr") as number;
          
          const highImpLowClicksActive = smartFiltersState.find(
            f => f.id === SMART_FILTERS.highImpressionLowClicks
          )?.active;
          
          const isHighImpLowClicks = impressions >= 100 && ctr < 0.02;
          const shouldHighlight = highImpLowClicksActive && isHighImpLowClicks;
          
          return (
            <span className={shouldHighlight ? "text-amber-600 font-medium" : ""}>
              {impressions}
            </span>
          );
        },
      },
      {
        accessorKey: "position",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent flex items-center"
            >
              Avg. Position
              <span className="ml-2">
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="h-4 w-4" />
                ) : null}
              </span>
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const position = row.getValue("position") as number;
          const page2Active = smartFiltersState.find(
            f => f.id === SMART_FILTERS.page2Queries
          )?.active;
          
          const isPage2 = position >= 11 && position <= 20;
          const shouldHighlight = page2Active && isPage2;
          
          return (
            <span className={shouldHighlight ? "text-blue-600 font-medium" : ""}>
              {position.toFixed(1)}
            </span>
          );
        },
      },
      {
        accessorKey: "ctr",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent flex items-center"
            >
              CTR
              <span className="ml-2">
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="h-4 w-4" />
                ) : null}
              </span>
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const ctr = row.getValue("ctr") as number;
          const lowCtrActive = smartFiltersState.find(
            f => f.id === SMART_FILTERS.lowCtr
          )?.active;
          
          const isLowCtr = ctr < 0.01;
          const shouldHighlight = lowCtrActive && isLowCtr;
          
          return (
            <span className={shouldHighlight ? "text-red-600 font-medium" : ""}>
              {(ctr * 100).toFixed(1)}%
            </span>
          );
        },
      },
    ];

    if (showOccurrences) {
      baseColumns.push({
        accessorKey: "occurrences",
        header: ({ column }) => (
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent flex items-center"
            >
              Mentions
              <span className="ml-2">
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="h-4 w-4" />
                ) : null}
              </span>
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const occurrences = row.getValue("occurrences") as number;
          const impressions = row.getValue("impressions") as number;
          
          if (occurrences === 0 && impressions > 50) {
            return (
              <div className="flex items-center">
                <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium">
                  0
                </span>
              </div>
            );
          }
          return occurrences;
        },
      });
    }

    return baseColumns;
  }, [showOccurrences, smartFiltersState]);

  // Initialize the table with our settings
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      pagination: {
        pageSize: pageSize,
        pageIndex: currentPage,
      },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: (updater) => {
      const newState = typeof updater === 'function' ? 
        updater({ pageIndex: currentPage, pageSize }) : 
        updater;
      
      setCurrentPage(newState.pageIndex);
      setPageSize(newState.pageSize);
    },
  });

  // Update filters based on user input
  const updateFilter = (
    category: keyof typeof filters,
    type: 'min' | 'max',
    value: string
  ) => {
    setFilters(prev => ({
      ...prev,
      [category]: { ...prev[category], [type]: value }
    }));
  };

  // Generate pagination links
  const renderPaginationItems = () => {
    const totalPages = table.getPageCount();
    const currentPageIndex = table.getState().pagination.pageIndex;
    
    const maxPageButtons = 5;
    
    if (totalPages <= 1) {
      return null;
    }
    
    let pageNumbers = [];
    
    if (totalPages <= maxPageButtons) {
      for (let i = 0; i < totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(0, currentPageIndex - Math.floor(maxPageButtons / 2));
      const endPage = Math.min(totalPages - 1, startPage + maxPageButtons - 1);
      
      if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(0, endPage - maxPageButtons + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }
    
    pageNumbers = [...new Set(pageNumbers)];
    
    return pageNumbers.map((pageNum) => (
      <PaginationItem key={pageNum}>
        <PaginationLink 
          isActive={currentPageIndex === pageNum}
          onClick={(e) => {
            e.preventDefault();
            table.setPageIndex(pageNum);
          }}
        >
          {pageNum + 1}
        </PaginationLink>
      </PaginationItem>
    ));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Search Query Data</h3>
        <div className="flex items-center gap-4">
          <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Filter size={16} />
                Numeric Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Position Range</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.position.min}
                        onChange={(e) => updateFilter('position', 'min', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.position.max}
                        onChange={(e) => updateFilter('position', 'max', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Impressions Range</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.impressions.min}
                        onChange={(e) => updateFilter('impressions', 'min', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.impressions.max}
                        onChange={(e) => updateFilter('impressions', 'max', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Clicks Range</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.clicks.min}
                        onChange={(e) => updateFilter('clicks', 'min', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.clicks.max}
                        onChange={(e) => updateFilter('clicks', 'max', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">CTR Range (%)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        type="number"
                        placeholder="Min %"
                        value={filters.ctr.min}
                        onChange={(e) => updateFilter('ctr', 'min', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Max %"
                        value={filters.ctr.max}
                        onChange={(e) => updateFilter('ctr', 'max', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {showOccurrences && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Mentions Range</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          type="number"
                          placeholder="Min"
                          value={filters.occurrences.min}
                          onChange={(e) => updateFilter('occurrences', 'min', e.target.value)}
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={filters.occurrences.max}
                          onChange={(e) => updateFilter('occurrences', 'max', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-muted-foreground" />
            <Select 
              value={localDateRange}
              onValueChange={(value) => {
                if (value === 'custom') {
                  setIsCustomDateOpen(true);
                } else {
                  handleDateRangeChange(value);
                }
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select range">
                  {dateRanges.find(r => r.value === localDateRange)?.label || localDateRange}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {dateRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Popover open={isCustomDateOpen} onOpenChange={setIsCustomDateOpen}>
            <PopoverTrigger asChild>
              <div></div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="end">
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Start Date</h4>
                  <CalendarComponent
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    disabled={(date) => 
                      isAfter(date, latestPossibleDate) || 
                      (customEndDate ? isAfter(date, customEndDate) : false)
                    }
                    className="rounded-md border pointer-events-auto"
                  />
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">End Date</h4>
                  <CalendarComponent
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    disabled={(date) => 
                      isAfter(date, latestPossibleDate) || 
                      (customStartDate ? isBefore(date, customStartDate) : false)
                    }
                    className="rounded-md border pointer-events-auto"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCustomDateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCustomDateSelect}
                    disabled={!customStartDate || !customEndDate}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1" 
            onClick={handleRefresh}
            disabled={isTableLoading}
          >
            <RefreshCw size={16} className={isTableLoading ? "animate-spin" : ""} />
            Refresh
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1" 
            onClick={handleExport}
            disabled={isTableLoading}
          >
            <Download size={16} />
            Export CSV
          </Button>
        </div>
      </div>

      {renderDateRangeInfo()}

      {/* Smart Filters UI */}
      <SmartFilters 
        filters={smartFiltersState}
        onFilterToggle={handleSmartFilterToggle}
        onClearAll={handleClearAllSmartFilters}
        queryCount={filteredData.length}
      />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Rows per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 rows</SelectItem>
              <SelectItem value="20">20 rows</SelectItem>
              <SelectItem value="50">50 rows</SelectItem>
              <SelectItem value="100">100 rows</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        {isTableLoading ? (
          renderLoadingPlaceholder()
        ) : (
          <div className="relative">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredData.length > 0 ? 
            `${table.getState().pagination.pageIndex * pageSize + 1} to ${Math.min((table.getState().pagination.pageIndex + 1) * pageSize, filteredData.length)} of ${filteredData.length}` : 
            '0'} results
        </div>
        
        {filteredData.length > 0 && table.getPageCount() > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Previous page</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </PaginationItem>
              
              {renderPaginationItems()}
              
              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Next page</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
};

export default QueriesTable;
