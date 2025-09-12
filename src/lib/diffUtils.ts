
/**
 * A utility module for detecting differences between text strings
 */
import React from 'react';

/**
 * Represents a change in text
 */
export interface TextChange {
  type: 'insertion' | 'deletion';
  text: string;
  position: number;
  originalPosition?: number; // Position in the original text
  isGrouped?: boolean; // Flag to indicate this is part of a grouped change
  isReplacement?: boolean; // Flag to indicate if this is part of a replace operation
  replacementGroup?: string; // Identifier to link related insert/delete in a replacement
}

/**
 * Find differences between original text and edited text
 * Uses character-level diffing for more accurate results
 */
export function findTextDifferences(
  originalText: string,
  editedText: string
): TextChange[] {
  if (originalText === editedText) return [];

  const originalWords = originalText.split(/\b/); // split by word boundaries
  const editedWords = editedText.split(/\b/);

  const changes: TextChange[] = [];
  let oIndex = 0, eIndex = 0;
  let oPos = 0, ePos = 0;

  while (oIndex < originalWords.length || eIndex < editedWords.length) {
    const oWord = originalWords[oIndex] ?? "";
    const eWord = editedWords[eIndex] ?? "";

    if (oWord === eWord) {
      oPos += oWord.length;
      ePos += eWord.length;
      oIndex++;
      eIndex++;
    } else if (oWord && !editedWords.slice(eIndex).includes(oWord)) {
      // deletion
      changes.push({
        type: "deletion",
        text: oWord,
        position: oPos,
        originalPosition: oPos,
      });
      oPos += oWord.length;
      oIndex++;
    } else if (eWord && !originalWords.slice(oIndex).includes(eWord)) {
      // insertion
      changes.push({
        type: "insertion",
        text: eWord,
        position: ePos,
      });
      ePos += eWord.length;
      eIndex++;
    } else {
      // replacement
      if (oWord) {
        changes.push({
          type: "deletion",
          text: oWord,
          position: oPos,
          originalPosition: oPos,
          isReplacement: true,
        });
        oPos += oWord.length;
        oIndex++;
      }
      if (eWord) {
        changes.push({
          type: "insertion",
          text: eWord,
          position: ePos,
          isReplacement: true,
        });
        ePos += eWord.length;
        eIndex++;
      }
    }
  }

  return changes;
}
/**
 * Format text with highlighted changes
 * Returns HTML with appropriate highlighting
 */
export function formatTextWithChanges(
  text: string,
  changes: TextChange[]
): React.ReactNode[] {
  if (!changes.length) return [text];

  const result: React.ReactNode[] = [];
  let lastPos = 0;

  const sorted = changes.slice().sort((a, b) => {
    const pa = a.type === "deletion" && a.originalPosition !== undefined
      ? a.originalPosition
      : a.position;
    const pb = b.type === "deletion" && b.originalPosition !== undefined
      ? b.originalPosition
      : b.position;
    return pa - pb;
  });

  sorted.forEach((change, i) => {
    const pos = change.type === "deletion" && change.originalPosition !== undefined
      ? change.originalPosition
      : change.position;

    // Add unchanged text before this change
    if (pos > lastPos) {
      result.push(text.slice(lastPos, pos));
    }

    if (change.type === "deletion") {
      result.push(
        React.createElement(
          "span",
          {
            key: `del-${i}`,
            className: "line-through text-red-700 bg-red-100 px-0.5 rounded",
          },
          change.text
        )
      );
      lastPos = pos + change.text.length;
    } else if (change.type === "insertion") {
      result.push(
        React.createElement(
          "span",
          {
            key: `ins-${i}`,
            className: "bg-green-200 text-green-900 px-0.5 rounded",
          },
          change.text
        )
      );
      // insertions don't consume original text
    }
  });

  if (lastPos < text.length) {
    result.push(text.slice(lastPos));
  }

  return result;
}
/**
 * Convert content with highlights to HTML for export/copying
 */
export function convertToHighlightedHTML(content: string, changes: TextChange[]): string {
  // Split content into lines instead of paragraphs
  const lines = content.split('\n');
  const linePositions: number[] = [];
  let pos = 0;

  lines.forEach(line => {
    linePositions.push(pos);
    pos += line.length + 1; // +1 for the newline character
  });

  let html = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStartPos = linePositions[i];

    // Get changes for this line
    const lineChanges = changes.filter(change => {
      if (change.type === 'insertion') {
        return change.position >= lineStartPos && change.position <= lineStartPos + line.length;
      } else if (change.originalPosition !== undefined) {
        return change.originalPosition >= lineStartPos && change.originalPosition <= lineStartPos + line.length;
      }
      return false;
    });

    // Adjust change positions relative to line start
    const adjustedChanges = lineChanges.map(change => ({
      ...change,
      position: change.type === 'insertion'
        ? change.position - lineStartPos
        : (change.originalPosition !== undefined
          ? change.originalPosition - lineStartPos
          : change.position)
    }));

    if (adjustedChanges.length > 0) {
      html += `<p>${formatTextToHTML(line, adjustedChanges)}</p>\n`;
    } else {
      html += `<p>${line}</p>\n`;
    }
  }

  return html;
}


/**
 * Helper function to format a single paragraph to HTML with highlights
 */
function formatTextToHTML(text: string, changes: TextChange[]): string {
  const replacementGroups: Map<string, TextChange[]> = new Map();
  const positionChanges: Map<number, TextChange[]> = new Map();

  // Group changes
  changes.forEach(change => {
    if (change.isReplacement && change.replacementGroup) {
      const group = replacementGroups.get(change.replacementGroup) || [];
      group.push(change);
      replacementGroups.set(change.replacementGroup, group);
    } else {
      const position = change.position;
      const existing = positionChanges.get(position) || [];
      existing.push(change);
      positionChanges.set(position, existing);
    }
  });

  let html = '';
  let lastPos = 0;

  const allPositions = Array.from(new Set([
    ...Array.from(positionChanges.keys()),
    ...Array.from(replacementGroups.values()).flatMap(group => {
      const insertChange = group.find(c => c.type === 'insertion');
      return insertChange ? [insertChange.position] : [];
    })
  ])).sort((a, b) => a - b);

  for (const position of allPositions) {
    if (position > lastPos) {
      html += text.substring(lastPos, position);
    }

    let handledReplacement = false;

    replacementGroups.forEach(group => {
      const insertChange = group.find(c => c.type === 'insertion');
      const deleteChange = group.find(c => c.type === 'deletion');

      if (insertChange && insertChange.position === position) {
        if (deleteChange) {
          html += `<span style="color:#ef4444;text-decoration:line-through;background-color:#fef2f2;">${deleteChange.text}</span>`;
        }
        html += `<span style="background-color:#d1fae5;color:#065f46;">${insertChange.text}</span>`;
        const deletedLength = deleteChange?.text.length || 0;
        const insertedLength = insertChange.text.length;
        lastPos = position + Math.max(deletedLength, insertedLength);
        handledReplacement = true;
      }
    });

    if (!handledReplacement && positionChanges.has(position)) {
      const changesAtPos = positionChanges.get(position)!;
      const deletions = changesAtPos.filter(c => c.type === 'deletion');
      const insertions = changesAtPos.filter(c => c.type === 'insertion');

      deletions.forEach(deletion => {
        html += `<span style="color:#ef4444;text-decoration:line-through;background-color:#fef2f2;">${deletion.text}</span>`;
      });

      insertions.forEach(insertion => {
        html += `<span style="background-color:#d1fae5;color:#065f46;">${insertion.text}</span>`;
      });

      const deletedLength = deletions.reduce((sum, del) => sum + (del.text?.length || 0), 0);
      const insertedLength = insertions.reduce((sum, ins) => sum + (ins.text?.length || 0), 0);
      lastPos = position + Math.max(deletedLength, insertedLength);
    }
  }

  if (lastPos < text.length) {
  result.push(text.slice(lastPos));
}

// Add this to catch insertions beyond the lastPos
sorted.forEach((change, i) => {
  if (change.type === "insertion" && change.position >= lastPos) {
    result.push(
      React.createElement(
        "span",
        {
          key: `ins-end-${i}`,
          className: "bg-green-200 text-green-900 px-0.5 rounded",
        },
        change.text
      )
    );
    lastPos = change.position + change.text.length;
  }
});


  return html;
}


