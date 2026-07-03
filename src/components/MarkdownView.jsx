import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

// One markdown renderer for the whole app (inspector + doc reader). GFM tables,
// heading anchors (deep-linkable), and syntax highlighting — all themed by
// .prose-hz in horizon-ui.css. External links open in a new tab.

const rehypePlugins = [
  rehypeSlug,
  rehypeHighlight,
  [rehypeAutolinkHeadings, { behavior: "append", properties: { className: ["hz-anchor"], ariaHidden: true, tabIndex: -1 }, content: { type: "text", value: "#" } }],
];

export default function MarkdownView({ children, className = "" }) {
  return (
    <div className={`prose-hz ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={rehypePlugins}
        components={{
          a({ href, children, ...props }) {
            const external = href && /^https?:/.test(href);
            return (
              <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer noopener" : undefined} {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {children || ""}
      </ReactMarkdown>
    </div>
  );
}

// GitHub-compatible slugify for building a table of contents whose anchors line
// up with the ids rehype-slug emits.
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function extractToc(md) {
  if (!md) return [];
  const lines = md.split("\n");
  const toc = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = /^(#{1,4})\s+(.*)$/.exec(line);
    if (m) {
      const depth = m[1].length;
      const text = m[2].replace(/[#*`]/g, "").trim();
      if (text) toc.push({ depth, text, id: slugify(text) });
    }
  }
  return toc;
}
