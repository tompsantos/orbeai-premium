import { cn } from "@/lib/utils";

/**
 * Lightweight Markdown renderer for chat / artifact previews.
 * Suporta: # ## ###, **bold**, *italic*, `inline code`, ```fenced code```,
 * - lists, > blockquotes, --- separators, links.
 * Sem dependências externas, sem dangerouslySetInnerHTML não controlado.
 */
function escape(html: string) {
  return html
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(text: string): string {
  let s = escape(text);
  s = s.replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-[0.85em] font-mono">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|\s)\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="text-[var(--orbe-blue)] underline underline-offset-2" target="_blank" rel="noreferrer" href="$2">$1</a>');
  return s;
}

export function MessageRenderer({ content, className }: { content: string; className?: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = content.split("\n");
  let i = 0;
  let listBuf: string[] = [];
  let quoteBuf: string[] = [];

  const flushList = () => {
    if (!listBuf.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1 my-2">
        {listBuf.map((l, k) => <li key={k} dangerouslySetInnerHTML={{ __html: renderInline(l) }} />)}
      </ul>
    );
    listBuf = [];
  };
  const flushQuote = () => {
    if (!quoteBuf.length) return;
    blocks.push(
      <blockquote key={`q-${blocks.length}`} className="border-l-2 border-[var(--orbe-blue)]/50 pl-3 my-2 text-muted-foreground italic"
        dangerouslySetInnerHTML={{ __html: renderInline(quoteBuf.join(" ")) }} />
    );
    quoteBuf = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      flushList(); flushQuote();
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { buf.push(lines[i]); i++; }
      blocks.push(
        <div key={`code-${blocks.length}`} className="my-3 rounded-xl border border-border/70 overflow-hidden bg-[color-mix(in_oklch,var(--muted)_60%,var(--card))]">
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/60 bg-muted/40">
            <span className="size-2 rounded-full bg-destructive/40" />
            <span className="size-2 rounded-full bg-[var(--warning)]/50" />
            <span className="size-2 rounded-full bg-[var(--success)]/50" />
            {lang && <span className="ml-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{lang}</span>}
          </div>
          <pre className="p-3.5 overflow-x-auto text-[12.5px] leading-relaxed font-mono">
            <code>{buf.join("\n")}</code>
          </pre>
        </div>
      );
      i++; continue;
    }
    if (/^#{1,3}\s/.test(line)) {
      flushList(); flushQuote();
      const level = line.match(/^(#{1,3})/)![1].length;
      const txt = line.replace(/^#{1,3}\s/, "");
      const cls = level === 1 ? "text-lg font-semibold mt-3" : level === 2 ? "text-base font-semibold mt-3" : "text-sm font-semibold mt-2";
      blocks.push(<div key={`h-${i}`} className={cls} dangerouslySetInnerHTML={{ __html: renderInline(txt) }} />);
      i++; continue;
    }
    if (line.startsWith("> ")) { quoteBuf.push(line.slice(2)); i++; continue; }
    if (/^\s*[-*]\s/.test(line)) { flushQuote(); listBuf.push(line.replace(/^\s*[-*]\s/, "")); i++; continue; }
    if (/^---+\s*$/.test(line)) { flushList(); flushQuote(); blocks.push(<hr key={`hr-${i}`} className="my-3 border-border/60" />); i++; continue; }
    if (line.trim() === "") { flushList(); flushQuote(); blocks.push(<div key={`sp-${i}`} className="h-1" />); i++; continue; }
    flushList(); flushQuote();
    blocks.push(<p key={`p-${i}`} className="my-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderInline(line) }} />);
    i++;
  }
  flushList(); flushQuote();

  return <div className={cn("text-sm", className)}>{blocks}</div>;
}
