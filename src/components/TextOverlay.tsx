import React from "react";
import { TextChange, formatTextWithChanges } from "@/lib/diffUtils";

interface TextDisplayProps {
  originalText: string;
  editedText: string;
  changes: TextChange[];
  isVisible: boolean;
  editMode?: boolean;
}

const parseHeading = (text: string) => {
  const match = text.match(/^(#+)\s+(.*)/);
  if (!match) return { isHeading: false };

  return {
    isHeading: true,
    prefix: match[1],
    level: match[1].length,
    content: match[2],
  };
};

const TextDisplay: React.FC<TextDisplayProps> = ({
  editedText,
  changes,
  isVisible,
  editMode = false,
}) => {
  if (!isVisible || changes.length === 0 || !editMode) return null;

  const normalizedText = editedText.replace(/\r\n/g, "\n");
  const lines = normalizedText.split("\n");

  let currentPosition = 0;

  return (
    <div className="font-mono text-base leading-snug space-y-1">
      {lines.map((line, index) => {
        const lineStart = currentPosition;
        currentPosition += line.length + 1; // +1 for newline

        // Filter changes relevant to this line
        const relevantChanges = changes.filter((change) => {
          const pos =
            change.type === "deletion" ? change.originalPosition ?? -1 : change.position;
          return pos >= lineStart && pos <= lineStart + line.length;

        });

        if (relevantChanges.length === 0) {
          const headingInfo = parseHeading(line);
          if (headingInfo.isHeading) {
            const HeadingTag = `h${headingInfo.level}` as keyof JSX.IntrinsicElements;
            return (
              <HeadingTag key={index} className="font-bold text-gray-800">
                {line}
              </HeadingTag>
            );
          }
          return <p key={index} className="text-gray-800">{line}</p>;
        }

        // Adjust positions relative to line start
        const adjustedChanges = relevantChanges.map((change) => {
          const basePos =
            change.type === "deletion" && change.originalPosition !== undefined
              ? change.originalPosition
              : change.position;
          return { ...change, position: basePos - lineStart };
        });

        const headingInfo = parseHeading(line);
        if (headingInfo.isHeading) {
          const { level, prefix, content } = headingInfo;
          const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
          return (
            <HeadingTag key={index} className="font-bold text-gray-800">
              <span className="text-gray-400">{prefix} </span>
              {formatTextWithChanges(content, adjustedChanges)}
            </HeadingTag>
          );
        }

        return (
          <p key={index} className="text-gray-800">
            {formatTextWithChanges(line, adjustedChanges)}
          </p>
        );
      })}
    </div>
  );
};

export default React.memo(TextDisplay);
