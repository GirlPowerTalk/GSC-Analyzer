import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle, Save, X, Edit, Undo2, Redo2, Copy, Download, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { findTextDifferences, TextChange, formatTextWithChanges, convertToHighlightedHTML } from "@/lib/diffUtils";
import TextOverlay from "@/components/TextOverlay";
import { toast } from "sonner";
import { useDebouncedCallback } from "@/hooks/useDebounceCallback";
import { useThrottleCallback } from "@/hooks/useThrottleCallback";

interface QueryData {
  query: string;
  impressions: number;
  occurrences: number;
}

interface PageContentProps {
  pageData: {
    title: string;
    content: string;
  };
  queryData: QueryData[];
  onSave?: (newContent: string) => void;
  onContentChanged?: (content: string) => void;
}

// Create debounce hook
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

const PageContent = ({ pageData, queryData, onSave, onContentChanged }: PageContentProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  
  // Three content states:
  // - initialContent: original content from page load (never changes unless pageData changes)
  // - originalContent: current saved content (changes when saving)
  // - editedContent: current editing state (changes during editing)
  const [initialContent, setInitialContent] = useState(pageData.content);
  const [originalContent, setOriginalContent] = useState(pageData.content);
  const [editedContent, setEditedContent] = useState(pageData.content);
  const [textChanges, setTextChanges] = useState<TextChange[]>([]);
  // Initialize showHighlights to true by default so changes are visible immediately
  const [showHighlights, setShowHighlights] = useState(true);
  
  // History state for undo/redo functionality
  const [history, setHistory] = useState<string[]>([pageData.content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Update content when pageData changes
  useEffect(() => {
    console.log("PageData changed, resetting content states");
    setInitialContent(pageData.content);
    setOriginalContent(pageData.content);
    setEditedContent(pageData.content);
    setTextChanges([]);
    
    setHistory([pageData.content]);
    setHistoryIndex(0);
    // Always keep showHighlights true when loading new content
    setShowHighlights(true);
  }, [pageData]);
  
  // Use debounced content for diff calculation to improve performance
  const debouncedEditedContent = useDebounce(editedContent, 100);
  
  // Calculate differences with debouncing to avoid performance issues during typing
// Calculate differences on the entire text instead of per-line
useEffect(() => {
  if (originalContent === debouncedEditedContent) {
    setTextChanges([]);
    return;
  }

  // findTextDifferences should return an array of changes (insertions/deletions)
  // based on *full text*, not per line.
  const changes: TextChange[] = findTextDifferences(
    originalContent,
    debouncedEditedContent
  );

  setTextChanges(changes);

  if (onContentChanged) {
    onContentChanged(debouncedEditedContent);
  }
}, [debouncedEditedContent, originalContent, onContentChanged]);



  
  // Get top queries with impressions but no occurrences
  const topMissedQueries = queryData
    .filter(q => q.impressions > 50 && q.occurrences === 0)
    .slice(0, 5)
    .map(q => q.query);
    
  const handleHighlightQuery = (query: string) => {
    setActiveQuery(query === activeQuery ? null : query);
    setSearchTerm(query === activeQuery ? "" : query);
  };
  
  // Improved helper function to extract heading information
  const parseHeading = (block: string) => {
    const headingMatch = block.match(/^(#+)\s+(.*)/);
    if (headingMatch) {
      const prefix = headingMatch[1];
      const headingLevel = prefix.length;
      const headingText = headingMatch[2];
      return { 
        isHeading: true, 
        level: headingLevel, 
        prefix, 
        text: headingText,
        fullText: block 
      };
    }
    return { isHeading: false, fullText: block };
  };

  // Helper function to highlight search term in text
  const highlightText = (text: string, searchTerm: string): React.ReactNode => {
    if (!searchTerm.trim()) return text;
    
    try {
      const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
      return (
        <>
          {parts.map((part, i) => 
            part.toLowerCase() === searchTerm.toLowerCase() ? (
              <mark key={i} className="bg-yellow-200 text-yellow-800">{part}</mark>
            ) : (
              part
            )
          )}
        </>
      );
    } catch (e) {
      // If regex fails (e.g., for special characters), return unmodified text
      return text;
    }
  };
const handleSaveChanges = () => {
  if (onSave) onSave(editedContent);

  // Keep originalContent for highlighting current changes
  // setOriginalContent(editedContent); // don't do this immediately

  setEditMode(false);
  setShowHighlights(true);

  // Optionally, reset history
  setHistory([editedContent]);
  setHistoryIndex(0);

  toast.success("Changes saved successfully");
};

const renderPlainContent = useCallback(
  (content: string) => {
    const blockRegex = /\n{2,}/g;
    const blocks: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = blockRegex.exec(content)) !== null) {
      const block = content.slice(lastIndex, match.index);
      if (block.trim()) blocks.push(block);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      const block = content.slice(lastIndex);
      if (block.trim()) blocks.push(block);
    }

    return blocks.map((block, i) => {
      const heading = parseHeading(block);
      if (heading.isHeading) {
        const HeadingTag = `h${heading.level}` as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag
            key={i}
            className={`font-bold ${
              heading.level === 1 ? 'text-2xl mt-6 mb-3' :
              heading.level === 2 ? 'text-xl mt-5 mb-2' :
              'text-lg mt-4 mb-2'
            }`}
          >
            {highlightText(heading.text, searchTerm)}
          </HeadingTag>
        );
      }
      return (
        <p key={i} className="mb-4">
          {highlightText(block, searchTerm)}
        </p>
      );
    });
  },
  [searchTerm]
);

  const handleDiscardChanges = () => {
    setEditedContent(originalContent);
    setHistory([...history.slice(0, historyIndex + 1), originalContent]);
    setHistoryIndex(historyIndex + 1);
    setEditMode(false);
    // Don't hide highlights when discarding changes
    toast.info("Changes discarded");
  };
  
  // Use throttled callback for content changes to improve performance
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    
    // Add to history if different from current content
    if (newContent !== editedContent) {
      // Slice history to remove any forward history entries when making a new change
      const newHistory = [...history.slice(0, historyIndex + 1), newContent];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setEditedContent(newContent);
    }
  }, [editedContent, history, historyIndex]);
  
  // Throttle content changes for better performance - reduced from 10ms to 5ms for faster response
  const throttledContentChange = useCallback(
    useThrottleCallback(handleContentChange, 5),
    [handleContentChange]
  );
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setEditedContent(history[historyIndex - 1]);
    }
  };
  
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setEditedContent(history[historyIndex + 1]);
    }
  };
  
  // Toggle showing changes
  const toggleShowChanges = () => {
    console.log("Toggling showHighlights:", !showHighlights);
    setShowHighlights(!showHighlights);
  };
  
  // Copy content with highlights to clipboard
  const copyWithHighlights = () => {
    const html = convertToHighlightedHTML(editedContent, textChanges);
    
    // Create a hidden element with our HTML
    const element = document.createElement('div');
    element.innerHTML = html;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    document.body.appendChild(element);
    
    // Select the element
    window.getSelection()?.selectAllChildren(element);
    
    // Copy HTML content to clipboard
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success('Content with highlights copied to clipboard');
      } else {
        toast.error('Failed to copy content');
      }
    } catch (err) {
      toast.error('Failed to copy content');
    }
    
    // Clean up
    document.body.removeChild(element);
    window.getSelection()?.removeAllRanges();
  };
  
  // Export content with highlights as HTML file
  const exportWithHighlights = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${pageData.title}</title>
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      line-height: 1.5;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1, h2, h3, h4, h5, h6 { margin-top: 2rem; margin-bottom: 1rem; }
    p { margin-bottom: 1rem; }
  </style>
</head>
<body>
  <h1>${pageData.title}</h1>
  ${convertToHighlightedHTML(editedContent, textChanges)}
</body>
</html>`;
    
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pageData.title.replace(/\s+/g, '_')}_with_changes.html`;
    
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    toast.success('Content with highlights exported as HTML');
  };

// Render content with text changes highlighting directly in view mode
const renderContentWithChanges = useCallback((content: string, changes: TextChange[]) => {
  const blockRegex = /\n{2,}/g;
  const blocks: string[] = [];
  const blockPositions: number[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(content)) !== null) {
    const block = content.slice(lastIndex, match.index);
    if (block.trim()) {
      blocks.push(block);
      blockPositions.push(lastIndex);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const block = content.slice(lastIndex);
    if (block.trim()) {
      blocks.push(block);
      blockPositions.push(lastIndex);
    }
  }

  return blocks.map((block, idx) => {
    const blockStart = blockPositions[idx];

    const headingInfo = parseHeading(block);

    // Filter changes relevant to this block
    const relevantChanges = changes
      .filter(change => {
        const pos = change.type === "deletion" && change.originalPosition !== undefined 
          ? change.originalPosition 
          : change.position;
        return pos >= blockStart && pos < blockStart + block.length;
      })
      .map(change => ({
        ...change,
        position: (change.type === "deletion" && change.originalPosition !== undefined
          ? change.originalPosition
          : change.position) - blockStart
      }));

    if (headingInfo.isHeading) {
      const HeadingTag = `h${headingInfo.level}` as keyof JSX.IntrinsicElements;

      if (showHighlights && relevantChanges.length > 0) {
        return (
          <HeadingTag
            key={idx}
            className={`font-bold ${
              headingInfo.level === 1 ? 'text-2xl mt-6 mb-3' :
              headingInfo.level === 2 ? 'text-xl mt-5 mb-2' :
              'text-lg mt-4 mb-2'
            }`}
          >
            {formatTextWithChanges(headingInfo.text, relevantChanges)}
          </HeadingTag>
        );
      }

      return (
        <HeadingTag
          key={idx}
          className={`font-bold ${
            headingInfo.level === 1 ? 'text-2xl mt-6 mb-3' :
            headingInfo.level === 2 ? 'text-xl mt-5 mb-2' :
            'text-lg mt-4 mb-2'
          }`}
        >
          {highlightText(headingInfo.text, searchTerm)}
        </HeadingTag>
      );
    }

    // Regular paragraph
    if (showHighlights && relevantChanges.length > 0) {
      return (
        <p key={idx} className="mb-4">
          {formatTextWithChanges(block, relevantChanges)}
        </p>
      );
    }

    // No changes or highlights disabled, just highlight search terms
    return (
      <p key={idx} className="mb-4">
        {highlightText(block, searchTerm)}
      </p>
    );
  });
}, [showHighlights, searchTerm]);

  
  const isError = pageData.title.toLowerCase().includes('error');
  const hasChanges = originalContent !== editedContent;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  
  // Determine when to show the text overlay only in edit mode
  const shouldShowOverlay = editMode && textChanges.length > 0 && showHighlights;
  
  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center gap-2">
        <div className="relative flex-grow">
          <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search in content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        {!isError && (
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className="flex items-center gap-1"
                  title="Undo"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className="flex items-center gap-1"
                  title="Redo"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDiscardChanges}
                  className="flex items-center gap-1"
                >
                  <X className="h-4 w-4" /> Cancel
                </Button>
                <Button
                  variant={hasChanges ? "default" : "outline"}
                  size="sm"
                  onClick={handleSaveChanges}
                  disabled={!hasChanges}
                  className="flex items-center gap-1"
                >
                  <Save className="h-4 w-4" /> Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyWithHighlights}
                  className="flex items-center gap-1"
                  title="Copy with highlights"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportWithHighlights}
                  className="flex items-center gap-1"
                  title="Export with highlights"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleShowChanges}
                  className="flex items-center gap-1"
                >
                  {showHighlights ? (
                    <>
                      <EyeOff className="h-4 w-4" /> Hide Changes
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" /> Show Changes
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-4 w-4" /> Edit
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      
      {topMissedQueries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {topMissedQueries.map((query) => (
            <Badge
              key={query}
              variant={activeQuery === query ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleHighlightQuery(query)}
            >
              {query}
            </Badge>
          ))}
        </div>
      )}
      
      <Card>
  <CardContent className="pt-6">
    <h2 className="text-xl font-bold mb-4">{pageData.title}</h2>
    <div className="prose max-w-none">
      {isError ? (
        <Alert className="bg-amber-50 text-amber-800 border-amber-200 mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{pageData.content}</AlertDescription>
        </Alert>
      ) : (
        <div
          className="bg-white p-4 rounded-md border text-sm leading-relaxed max-h-[600px] overflow-y-auto relative"
          ref={contentContainerRef}
        >
          {editMode ? (
            // ✨ EDIT MODE — textarea only, no overlay
            <Textarea
              ref={textareaRef}
              value={editedContent}
              onChange={throttledContentChange}
              className="min-h-[400px] h-full w-full p-0 border-0 shadow-none font-mono whitespace-pre-wrap leading-relaxed focus-visible:ring-0 bg-transparent"
              style={{ resize: "none", outline: "none" }}
            />
          ) : (
            // ✨ VIEW MODE — render with or without highlights
           <div className="relative">
  {showHighlights
    ? renderContentWithChanges(editedContent, textChanges)
    : renderPlainContent(originalContent)}
</div>

          )}
        </div>
      )}
    </div>
  </CardContent>
</Card>
    </div>
  );
};

export default PageContent;
