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

// Debounce hook
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
};

const PageContent = ({ pageData, queryData, onSave, onContentChanged }: PageContentProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Content states:
  // - initialContent: original content from page load (only changes if pageData changes)
  // - comparisonBase: previous saved content (used as the 'before' for diffs)
  // - originalContent: current saved content
  // - editedContent: content being edited (in editor)
  const [initialContent, setInitialContent] = useState(pageData.content);
  const [comparisonBase, setComparisonBase] = useState(pageData.content);
  const [originalContent, setOriginalContent] = useState(pageData.content);
  const [editedContent, setEditedContent] = useState(pageData.content);
  const [textChanges, setTextChanges] = useState<TextChange[]>([]);
  const [showHighlights, setShowHighlights] = useState(true);
const [accumulatedChanges, setAccumulatedChanges] = useState<TextChange[]>([]);

  const [history, setHistory] = useState<string[]>([pageData.content]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const contentContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update content when pageData changes
  useEffect(() => {
    setInitialContent(pageData.content);
    setOriginalContent(pageData.content);
    setEditedContent(pageData.content);
    setComparisonBase(pageData.content);
    setTextChanges([]);
    setHistory([pageData.content]);
    setHistoryIndex(0);
    setShowHighlights(true);
  }, [pageData]);

  const debouncedEditedContent = useDebounce(editedContent, 100);

  // Calculate text differences.
  // When editing: compare comparisonBase (previous saved) -> editedContent
  // When viewing (not editing): compare comparisonBase (previous saved) -> originalContent (current saved)
  useEffect(() => {
    // Choose the base (previous saved) and target (current edited or saved) depending on mode
    const base = comparisonBase;
    const target = editMode ? debouncedEditedContent : originalContent;

    if (!showHighlights) {
      // If highlights are hidden, clear changes
      setTextChanges([]);
      return;
    }

    if (base === target) {
      // no diffs
      setTextChanges([]);
      return;
    }

    const changes = findTextDifferences(base, target);
    setTextChanges(changes);

    // Notify parent about content change during editing (preserve existing behavior)
    if (onContentChanged && originalContent !== debouncedEditedContent) {
      onContentChanged(debouncedEditedContent);
    }
  }, [comparisonBase, debouncedEditedContent, originalContent, onContentChanged, showHighlights, editMode]);

  const topMissedQueries = queryData
    .filter(q => q.impressions > 50 && q.occurrences === 0)
    .slice(0, 5)
    .map(q => q.query);

  const handleHighlightQuery = (query: string) => {
    setActiveQuery(query === activeQuery ? null : query);
    setSearchTerm(query === activeQuery ? "" : query);
  };

  const parseHeading = (block: string) => {
    const headingMatch = block.match(/^(#+)\s+(.*)/);
    if (headingMatch) {
      const prefix = headingMatch[1];
      const headingLevel = prefix.length;
      const headingText = headingMatch[2];
      return { isHeading: true, level: headingLevel, prefix, text: headingText, fullText: block };
    }
    return { isHeading: false, fullText: block };
  };

  const highlightText = (text: string, searchTerm: string): React.ReactNode => {
    if (!searchTerm.trim()) return text;
    try {
      const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
      return (
        <>
          {parts.map((part, i) =>
            part.toLowerCase() === searchTerm.toLowerCase() ? (
              <mark key={i} className="bg-yellow-200 text-yellow-800">{part}</mark>
            ) : part
          )}
        </>
      );
    } catch {
      return text;
    }
  };

  const handleSaveChanges = () => {
  if (onSave) onSave(editedContent);

  // Compute diff between initial content (or previous accumulated) and current edited content
  const newChanges = findTextDifferences(initialContent, editedContent);

  // Merge with existing accumulated changes
  setAccumulatedChanges(prev => mergeChanges(prev, newChanges));

  // Update saved content
  setOriginalContent(editedContent);
  setEditMode(false);
  setShowHighlights(true);

  toast.success("Changes saved successfully");
};


 const handleDiscardChanges = () => {
  // Revert everything to the initial page content
  setEditedContent(initialContent);       // textarea content
  setOriginalContent(initialContent);     // saved content
  setComparisonBase(initialContent);      // base for diff
  setTextChanges([]);                     // clear all highlights
  setHistory([initialContent]);           // reset history
  setHistoryIndex(0);
  setEditMode(false);                     // exit edit mode
  setShowHighlights(true);                // show highlights if needed
  toast.info("Changes discarded. Reverted to original content");
};





  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent !== editedContent) {
      const newHistory = [...history.slice(0, historyIndex + 1), newContent];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setEditedContent(newContent);
    }
  }, [editedContent, history, historyIndex]);

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

  const toggleShowChanges = () => {
  setShowHighlights(prev => {
    if (prev) {
      // Hiding changes -> show initial content
      setEditedContent(initialContent);
      setTextChanges([]);  // remove highlighted diffs
    } else {
      // Showing changes -> recompute diffs against comparisonBase
      const changes = findTextDifferences(comparisonBase, editedContent);
      setTextChanges(changes);
    }
    return !prev;
  });
};


const mergeChanges = (oldChanges: TextChange[], newChanges: TextChange[]): TextChange[] => {
  const map = new Map<string, TextChange>();
  [...oldChanges, ...newChanges].forEach(c => {
    const key = `${c.type}-${c.position}-${c.text ?? c.originalText}`;
    map.set(key, c);
  });
  return Array.from(map.values());
};

  const copyWithHighlights = () => {
    // When viewing, copy current saved (originalContent) with highlights;
    // When editing, copy edited content with overlayed highlights
    const contentToCopy = editMode ? editedContent : originalContent;
    const html = convertToHighlightedHTML(contentToCopy, textChanges);
    const element = document.createElement('div');
    element.innerHTML = html;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    document.body.appendChild(element);
    window.getSelection()?.selectAllChildren(element);
    try {
      document.execCommand('copy') ? toast.success('Content with highlights copied') : toast.error('Failed to copy');
    } catch { toast.error('Failed to copy'); }
    document.body.removeChild(element);
    window.getSelection()?.removeAllRanges();
  };

  const exportWithHighlights = () => {
    const contentToExport = editMode ? editedContent : originalContent;
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${pageData.title}</title><style>
body{font-family:system-ui,-apple-system,sans-serif;line-height:1.5;max-width:800px;margin:0 auto;padding:2rem}
h1,h2,h3,h4,h5,h6{margin-top:2rem;margin-bottom:1rem}p{margin-bottom:1rem}
</style></head><body>
<h1>${pageData.title}</h1>
${convertToHighlightedHTML(contentToExport, textChanges)}
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pageData.title.replace(/\s+/g, '_')}_with_changes.html`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
    toast.success('Content exported with highlights');
  };

  const renderContentWithChanges = useCallback((content: string, changes: TextChange[]) => {
    const blocks = content.split('\n\n');
    let currentPosition = 0;
    return blocks.map((block, idx) => {
      if (!block.trim()) { currentPosition += block.length + 2; return null; }
      const blockStart = currentPosition;
      const blockLength = block.length;
      const headingInfo = parseHeading(block);
      const relevantChanges = changes.filter(change => {
        if (change.type === 'insertion') return change.position >= blockStart && change.position < (blockStart + blockLength);
        else if (change.type === 'deletion' && change.originalPosition !== undefined) return change.originalPosition >= blockStart && change.originalPosition < (blockStart + blockLength);
        return false;
      });
      const adjustedChanges = relevantChanges.map(change => {
  const pos = change.type === 'deletion' && change.originalPosition !== undefined
    ? change.originalPosition
    : change.position;
  return { ...change, position: pos - blockStart - (headingInfo.isHeading ? headingInfo.prefix.length : 0) };
});

      currentPosition += blockLength + 2;

     if (headingInfo.isHeading) {
  const HeadingTag = `h${headingInfo.level}` as keyof JSX.IntrinsicElements;

  if (showHighlights && adjustedChanges.length > 0) {
    const headingTextChanges = adjustedChanges
      .filter(change => change.position >= headingInfo.prefix.length) // only after prefix
      .map(change => ({
        ...change,
        // Subtract prefix once — fix extra letter duplication
        position: change.position - headingInfo.prefix.length
      }))
      // ignore any change outside heading text
      .filter(change => change.position < headingInfo.text.length);

    return (
      <HeadingTag
        key={idx}
        className={`font-bold ${
          headingInfo.level === 1 ? 'text-2xl mt-6 mb-3' :
          headingInfo.level === 2 ? 'text-xl mt-5 mb-2' :
          'text-lg mt-4 mb-2'
        }`}
      >
        {formatTextWithChanges(headingInfo.text, headingTextChanges)}
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



      if (showHighlights && adjustedChanges.length > 0) return <p key={idx} className="mb-4">{formatTextWithChanges(block, adjustedChanges)}</p>;
      return <p key={idx} className="mb-4">{highlightText(block, searchTerm)}</p>;
    });
  }, [showHighlights, searchTerm]);

  const isError = pageData.title.toLowerCase().includes('error');
  const hasChanges = originalContent !== editedContent;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const shouldShowOverlay = editMode && textChanges.length > 0 && showHighlights;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center gap-2">
        <div className="relative flex-grow">
          <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input type="text" placeholder="Search in content..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
        </div>
        {!isError && (
          <div className="flex gap-2">
            {editMode ? <>
              <Button variant="outline" size="sm" onClick={handleUndo} disabled={!canUndo} className="flex items-center gap-1" title="Undo"><Undo2 className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={handleRedo} disabled={!canRedo} className="flex items-center gap-1" title="Redo"><Redo2 className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={handleDiscardChanges} className="flex items-center gap-1"><X className="h-4 w-4" /> Discard</Button>
              <Button variant={hasChanges?"default":"outline"} size="sm" onClick={handleSaveChanges} disabled={!hasChanges} className="flex items-center gap-1"><Save className="h-4 w-4" /> Save</Button>
            </> : <>
              <Button variant="outline" size="sm" onClick={copyWithHighlights} className="flex items-center gap-1" title="Copy with highlights"><Copy className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={exportWithHighlights} className="flex items-center gap-1" title="Export with highlights"><Download className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={toggleShowChanges} className="flex items-center gap-1">{showHighlights ? <><EyeOff className="h-4 w-4" /> Hide Changes</> : <><Eye className="h-4 w-4" /> Show Changes</>}</Button>
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="flex items-center gap-1"><Edit className="h-4 w-4" /> Edit</Button>
            </>}
          </div>
        )}
      </div>

      {topMissedQueries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {topMissedQueries.map((query) => (
            <Badge key={query} variant={activeQuery===query?"default":"outline"} className="cursor-pointer" onClick={()=>handleHighlightQuery(query)}>{query}</Badge>
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
              <div className="bg-white p-4 rounded-md border text-sm leading-relaxed max-h-[600px] overflow-y-auto relative" ref={contentContainerRef}>
                {editMode ? (
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      value={editedContent}
                      onChange={throttledContentChange}
                      className="min-h-[400px] h-full w-full p-0 border-0 shadow-none font-mono whitespace-pre-wrap leading-relaxed focus-visible:ring-0"
                      style={{ resize: "none", outline: "none", position: "relative", zIndex: 10, backgroundColor: "transparent" }}
                    />
                    <TextOverlay originalText={comparisonBase} editedText={editedContent} changes={textChanges} isVisible={shouldShowOverlay} scrollContainer={contentContainerRef} editMode={false} />
                  </div>
                ) : (
                  <div className="relative">
                    {renderContentWithChanges(originalContent, textChanges)}
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
