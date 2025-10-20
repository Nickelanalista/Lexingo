import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

// Minimal Markdown to React renderer supporting headings, paragraphs, lists, bold, and links.
// Keeps styles consistent by letting parent wrap with Tailwind prose classes.
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');

  type Block =
    | { type: 'h1' | 'h2' | 'h3' | 'p'; text: string }
    | { type: 'ul'; items: string[] }
    | { type: 'hr' };

  const blocks: Block[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] | null = null;

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      const text = paragraphBuffer.join(' ').trim();
      if (text) blocks.push({ type: 'p', text });
      paragraphBuffer = [];
    }
  };

  const flushList = () => {
    if (listBuffer && listBuffer.length) {
      blocks.push({ type: 'ul', items: listBuffer });
    }
    listBuffer = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^---+$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'hr' });
      continue;
    }

    if (line.startsWith('# ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h1', text: line.slice(2).trim() });
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h2', text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h3', text: line.slice(4).trim() });
      continue;
    }

    if (/^(-|\*)\s+/.test(line)) {
      // list item
      const item = line.replace(/^(-|\*)\s+/, '').trim();
      if (!listBuffer) {
        flushParagraph();
        listBuffer = [];
      }
      listBuffer.push(item);
      continue;
    }

    // default paragraph text; accumulate
    paragraphBuffer.push(line.trim());
  }

  // Flush remaining
  flushParagraph();
  flushList();

  // Inline formatting: bold **text** and links [text](url)
  const renderInline = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let remaining = text;
    let keyIndex = 0;

    const pushText = (t: string) => {
      if (!t) return;
      // Split bold segments first
      const parts = t.split(/(\*\*[^*]+\*\*)/g);
      parts.forEach((part) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const inner = part.slice(2, -2);
          nodes.push(
            <strong key={`b-${keyIndex++}`}>{inner}</strong>
          );
        } else if (part) {
          nodes.push(part);
        }
      });
    };

    // Process links greedily
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    while ((match = linkRegex.exec(remaining)) !== null) {
      const [full, textLabel, url] = match;
      pushText(remaining.slice(lastIndex, match.index));
      nodes.push(
        <a key={`a-${keyIndex++}`} href={url} target="_blank" rel="noopener noreferrer" className="text-purple-300 underline">
          {textLabel}
        </a>
      );
      lastIndex = match.index + full.length;
    }
    pushText(remaining.slice(lastIndex));

    return nodes;
  };

  return (
    <div className="prose prose-invert max-w-none">
      {blocks.map((block, i) => {
        if (block.type === 'h1') return <h1 key={i}>{renderInline(block.text)}</h1>;
        if (block.type === 'h2') return <h2 key={i}>{renderInline(block.text)}</h2>;
        if (block.type === 'h3') return <h3 key={i}>{renderInline(block.text)}</h3>;
        if (block.type === 'p') return <p key={i}>{renderInline(block.text)}</p>;
        if (block.type === 'ul')
          return (
            <ul key={i} className="list-disc pl-6">
              {block.items.map((it, j) => (
                <li key={`${i}-${j}`}>{renderInline(it)}</li>
              ))}
            </ul>
          );
        if (block.type === 'hr') return <hr key={i} className="my-8 border-gray-700" />;
        return null;
      })}
    </div>
  );
};

export default MarkdownRenderer;

