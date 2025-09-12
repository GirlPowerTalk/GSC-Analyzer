
import { MouseEvent } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface SmartFilter {
  id: string;
  name: string;
  description: string;
  active: boolean;
  count?: number;
}

export const SMART_FILTERS = {
  lowCtr: "lowCtr",
  page2Queries: "page2Queries",
  questionQueries: "questionQueries",
  highImpressionLowClicks: "highImpressionLowClicks",
  notMentioned: "notMentioned",
  longTail: "longTail",
};

export type SmartFilterType = keyof typeof SMART_FILTERS;

interface SmartFiltersProps {
  filters: SmartFilter[];
  onFilterToggle: (filterId: string) => void;
  onClearAll: () => void;
  queryCount: number;
}

export const SmartFilters = ({
  filters,
  onFilterToggle,
  onClearAll,
  queryCount,
}: SmartFiltersProps) => {
  const handleFilterClick = (e: MouseEvent, filterId: string) => {
    e.preventDefault();
    onFilterToggle(filterId);
  };

  const activeFilters = filters.filter((f) => f.active);

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Smart Filters
              {activeFilters.length > 0 && (
                <Badge className="ml-2 bg-brand-600" variant="secondary">
                  {activeFilters.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72">
            <DropdownMenuLabel>Apply smart filters</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {filters.map((filter) => (
              <DropdownMenuItem
                key={filter.id}
                className="flex items-center justify-between cursor-pointer"
                onClick={(e) => handleFilterClick(e, filter.id)}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{filter.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {filter.description}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {filter.count !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {filter.count}
                    </span>
                  )}
                  {filter.active && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
            ))}
            {activeFilters.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-center text-sm text-muted-foreground cursor-pointer"
                  onClick={() => onClearAll()}
                >
                  Clear all filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {activeFilters.length > 0 && (
          <div className="flex gap-1 items-center flex-wrap">
            <span className="text-sm text-muted-foreground">Active:</span>
            {activeFilters.map((filter) => (
              <Badge
                key={filter.id}
                className="flex gap-1 items-center cursor-pointer"
                variant="outline"
                onClick={() => onFilterToggle(filter.id)}
              >
                {filter.name}
                {filter.count !== undefined && (
                  <span className="text-xs">({filter.count})</span>
                )}
                <span className="text-xs ml-1">×</span>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={onClearAll}
            >
              Clear all
            </Button>
          </div>
        )}
        
        {queryCount > 0 && (
          <span className="text-sm text-muted-foreground ml-auto">
            {queryCount} matching {queryCount === 1 ? "query" : "queries"}
          </span>
        )}
      </div>
    </div>
  );
};
