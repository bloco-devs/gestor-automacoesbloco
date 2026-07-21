import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

/**
 * Renderiza Markdown com sanitização (defesa XSS) e GFM
 * (tabelas, checklist, ~strike~, links auto).
 */
export function MarkdownView({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {content || ""}
      </ReactMarkdown>
    </div>
  );
}
