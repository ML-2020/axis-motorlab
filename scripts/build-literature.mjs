/**
 * Build a separately served, UTF-8 HTML version of the engineering memo.
 * The raw Markdown remains the editable source, while the HTML page fixes
 * browser encoding ambiguity (text/markdown has no charset parameter) and
 * gives the document a readable, printable layout.
 */
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const root = process.cwd();
const sourcePath = path.join(root, 'docs', 'literature.md');
const outputDir = path.join(root, 'public', 'docs');
const outputHtmlPath = path.join(outputDir, 'literature.html');
const outputMdPath = path.join(outputDir, 'literature.md');

const markdown = fs.readFileSync(sourcePath, 'utf8');
const titleMatch = markdown.match(/^#\s+(.+)$/m);
const title = titleMatch ? titleMatch[1].trim() : '工程建模依据';
const contentMarkdown = markdown.replace(/^#\s+.+\r?\n/, '');

marked.use({ gfm: true, breaks: false });
let body = marked.parse(contentMarkdown);

// Build a small table of contents from section headings.
const toc = [];
let sectionIndex = 0;
body = body.replace(/<h2>(.*?)<\/h2>/g, (_, heading) => {
  sectionIndex += 1;
  const id = `section-${sectionIndex}`;
  const text = heading.replace(/<[^>]+>/g, '').replace(/^\s*\d+\s+/, '');
  toc.push({ id, text });
  return `<h2 id="${id}"><span class="section-no">${String(sectionIndex).padStart(2, '0')}</span>${text}</h2>`;
});

// Allow wide reference tables to scroll instead of breaking the page.
body = body
  .replace(/<table>/g, '<div class="table-wrap"><table>')
  .replace(/<\/table>/g, '</table></div>')
  .replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noreferrer"');

const tocHtml = toc
  .map((item) => `<a href="#${item.id}"><span>${item.id.replace('section-', '').padStart(2, '0')}</span>${item.text}</a>`)
  .join('');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#070b0c" />
  <meta name="description" content="AXIS MOTORLAB — YE3-132S-4 三相异步电动机 3D 模型的工程建模依据、参数取舍与文献来源。" />
  <title>${title} · AXIS MOTORLAB</title>
  <style>
    :root {
      --bg: #070b0c;
      --panel: #0b1214;
      --ink: #e9e7df;
      --muted: #a4b0af;
      --dim: #6d7d7f;
      --faint: #425255;
      --line: rgba(157, 183, 184, 0.18);
      --line-strong: rgba(157, 183, 184, 0.32);
      --accent: #e4a04d;
      --cyan: #7cc9d2;
      --sans: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Hiragino Sans GB", sans-serif;
      --mono: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; background: var(--bg); }
    body {
      margin: 0;
      color: var(--ink);
      background:
        radial-gradient(circle at 78% 5%, rgba(35, 75, 81, 0.22), transparent 32rem),
        linear-gradient(rgba(124, 201, 210, 0.025) 1px, transparent 1px) 0 0 / 100% 80px,
        linear-gradient(90deg, rgba(124, 201, 210, 0.018) 1px, transparent 1px) 0 0 / 80px 100%,
        var(--bg);
      font-family: var(--sans);
      -webkit-font-smoothing: antialiased;
      line-height: 1.85;
    }
    ::selection { color: #121719; background: var(--accent); }
    a { color: var(--cyan); text-decoration: none; border-bottom: 1px solid rgba(124, 201, 210, 0.28); transition: color .2s, border-color .2s; }
    a:hover { color: var(--accent); border-color: var(--accent); }
    .topbar {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      max-width: 1320px;
      margin: 0 auto;
      padding: 26px 40px;
      border-bottom: 1px solid var(--line);
    }
    .brand { display: flex; align-items: center; gap: 13px; color: var(--ink); border: 0; }
    .brand-mark {
      position: relative; width: 28px; height: 32px;
      clip-path: polygon(50% 0, 100% 24%, 100% 76%, 50% 100%, 0 76%, 0 24%);
      background:
        linear-gradient(90deg, transparent calc(50% - .7px), rgba(228,160,77,.95) calc(50% - .7px), rgba(228,160,77,.95) calc(50% + .7px), transparent calc(50% + .7px)),
        linear-gradient(180deg, transparent 0 62%, rgba(228,160,77,.95) 62% 64%, transparent 64%),
        #0c1719;
      box-shadow: inset 0 0 0 1px rgba(144,178,181,.3);
      flex: 0 0 auto;
    }
    .brand strong { display: block; font-size: 15px; font-weight: 650; letter-spacing: .18em; line-height: 1.1; }
    .brand-copy { display: block; }
    .brand-copy span { display: block; margin-top: 3px; color: var(--dim); font: 7px/1.2 var(--mono); letter-spacing: .24em; }
    .top-actions { display: flex; align-items: center; gap: 22px; }
    .top-actions a { border: 0; color: var(--muted); font: 9px/1.2 var(--mono); letter-spacing: .08em; }
    .top-actions a:hover { color: var(--accent); }
    .top-actions .back { color: var(--ink); border-bottom: 1px solid var(--line-strong); padding-bottom: 5px; }
    main { max-width: 1320px; margin: 0 auto; padding: 0 40px 90px; }
    .doc-hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 280px;
      gap: 48px;
      padding: 74px 0 54px;
      border-bottom: 1px solid var(--line-strong);
    }
    .kicker { color: var(--accent); font: 9px/1.5 var(--mono); letter-spacing: .22em; text-transform: uppercase; }
    .doc-hero h1 {
      max-width: 870px;
      margin: 18px 0 0;
      font-size: clamp(38px, 5vw, 70px);
      font-weight: 620;
      line-height: 1.12;
      letter-spacing: -.04em;
    }
    .doc-hero .lead {
      max-width: 720px;
      margin: 24px 0 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 2;
    }
    .doc-meta {
      align-self: end;
      border-top: 1px solid var(--line);
      padding-top: 17px;
      color: var(--dim);
      font: 8px/1.9 var(--mono);
      letter-spacing: .06em;
    }
    .doc-meta b { display: block; color: var(--ink); font-weight: 400; }
    .doc-meta em { font-style: normal; color: var(--dim); }
    .doc-meta span { display: flex; justify-content: space-between; gap: 16px; padding: 5px 0; border-bottom: 1px solid rgba(157,183,184,.08); }
    .layout { display: grid; grid-template-columns: 230px minmax(0, 920px); gap: 70px; align-items: start; padding-top: 58px; }
    .toc { position: sticky; top: 30px; }
    .toc-title { margin-bottom: 16px; color: var(--dim); font: 8px/1.4 var(--mono); letter-spacing: .16em; }
    .toc a {
      display: flex; gap: 10px; padding: 8px 0;
      color: var(--dim); border: 0; border-bottom: 1px solid rgba(157,183,184,.08);
      font-size: 10px; line-height: 1.5;
    }
    .toc a span { color: var(--faint); font: 7px/1.6 var(--mono); }
    .toc a:hover { color: var(--accent); }
    .prose { min-width: 0; }
    .prose > p:first-of-type { color: var(--muted); font-size: 14px; }
    .prose h2 {
      display: flex; align-items: baseline; gap: 12px;
      margin: 52px 0 18px; padding-top: 18px;
      border-top: 1px solid var(--line-strong);
      font-size: 24px; font-weight: 550; line-height: 1.4; letter-spacing: -.015em;
    }
    .prose h2 .section-no { color: var(--accent); font: 8px/1 var(--mono); letter-spacing: .08em; }
    .prose h3 { margin: 30px 0 10px; color: var(--ink); font-size: 16px; font-weight: 550; }
    .prose p { margin: 0 0 17px; color: var(--muted); font-size: 12.5px; line-height: 2; }
    .prose strong { color: var(--ink); font-weight: 550; }
    .prose code { padding: 2px 5px; color: var(--accent); background: rgba(228,160,77,.07); border: 1px solid rgba(228,160,77,.12); font: 10px/1.5 var(--mono); }
    .prose ul, .prose ol { color: var(--muted); font-size: 12px; line-height: 1.9; padding-left: 22px; }
    .prose li { margin: 5px 0; }
    .prose blockquote {
      margin: 24px 0; padding: 14px 18px;
      border-left: 2px solid var(--accent);
      background: rgba(228,160,77,.045);
      color: var(--dim); font-size: 11px;
    }
    .table-wrap { overflow-x: auto; margin: 24px 0 28px; border: 1px solid var(--line); -webkit-overflow-scrolling: touch; }
    .prose table { width: 100%; min-width: 760px; border-collapse: collapse; font-size: 10px; line-height: 1.65; }
    .prose th, .prose td { padding: 10px 11px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); vertical-align: top; text-align: left; }
    .prose th { color: var(--ink); background: rgba(124,201,210,.045); font-weight: 500; white-space: nowrap; }
    .prose td { color: var(--dim); }
    .prose td:nth-child(5) { word-break: break-all; }
    .prose tr:last-child td { border-bottom: 0; }
    .prose th:last-child, .prose td:last-child { border-right: 0; }
    .doc-footer {
      display: flex; justify-content: space-between; gap: 30px;
      max-width: 1320px; margin: 0 auto; padding: 26px 40px 38px;
      border-top: 1px solid var(--line-strong);
      color: var(--faint); font: 8px/1.7 var(--mono); letter-spacing: .06em;
    }
    .doc-footer a { color: var(--dim); border: 0; }
    @media (max-width: 980px) {
      .topbar { padding: 20px 24px; }
      main { padding: 0 24px 60px; }
      .doc-hero { grid-template-columns: 1fr; gap: 26px; padding: 45px 0 38px; }
      .doc-meta { max-width: 360px; align-self: start; }
      .layout { grid-template-columns: 1fr; gap: 0; padding-top: 36px; }
      .toc { display: none; }
      .doc-footer { padding: 22px 24px 30px; flex-direction: column; gap: 10px; }
    }
    @media (max-width: 560px) {
      body { line-height: 1.8; }
      .topbar { align-items: flex-start; flex-direction: column; gap: 15px; }
      .top-actions { gap: 16px; }
      .brand strong { font-size: 13px; }
      .doc-hero h1 { font-size: 34px; }
      .doc-hero .lead { font-size: 12px; }
      .prose h2 { font-size: 20px; margin-top: 38px; }
      .prose p { font-size: 12px; }
    }
    @media print {
      body { background: #fff; color: #111; }
      .topbar, .toc, .doc-footer { display: none; }
      main { padding: 0; max-width: none; }
      .doc-hero { padding: 0 0 24px; border-bottom: 1px solid #ccc; }
      .layout { display: block; padding: 20px 0 0; }
      .prose p, .prose td, .prose li { color: #222; }
      .prose h2 { border-color: #ccc; }
      .table-wrap { border-color: #aaa; }
      .prose table { min-width: 0; }
      .prose th, .prose td { border-color: #bbb; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/" aria-label="返回 AXIS MOTORLAB">
      <span class="brand-mark" aria-hidden="true"></span>
      <span class="brand-copy"><strong>AXIS / MOTORLAB</strong><span>ENGINEERING MEMO</span></span>
    </a>
    <nav class="top-actions">
      <a href="/docs/literature.md" download>下载 Markdown</a>
      <a class="back" href="/">返回 3D 档案 ↗</a>
    </nav>
  </header>
  <main>
    <section class="doc-hero">
      <div>
        <div class="kicker">DOC.AX-3D-2026 / MODELING BASIS · 建模依据</div>
        <h1>${title}</h1>
        <p class="lead">从额定参数、支承布置到绕组与冷却风路，记录本模型的设计假设、典型值取舍与可核对文献。目的在于说明“模型为什么这样建”，并界定它不能替代哪些制造文件。</p>
      </div>
      <aside class="doc-meta">
        <span><em>DOCUMENT</em><b>建模说明 / V1.0</b></span>
        <span><em>MODEL</em><b>YE3-132S-4</b></span>
        <span><em>SOURCES</em><b>${toc.length} sections · 12 references</b></span>
        <span><em>ENCODING</em><b>UTF-8 · HTML</b></span>
      </aside>
    </section>
    <div class="layout">
      <nav class="toc" aria-label="文档目录">
        <div class="toc-title">CONTENTS / 目录</div>
        ${tocHtml}
      </nav>
      <article class="prose">
        ${body}
      </article>
    </div>
  </main>
  <footer class="doc-footer">
    <span>AXIS MOTORLAB · INDUSTRIAL MOTION OBSERVATORY</span>
    <span>工程可视化重建 · 非制造图纸 · 数据以铭牌与制造商文件为准</span>
    <a href="#">返回顶部 ↑</a>
  </footer>
</body>
</html>
`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputHtmlPath, html, 'utf8');
// A UTF-8 BOM also makes the raw Markdown view decode reliably in browsers
// that default to a legacy encoding for text/markdown responses.
fs.writeFileSync(outputMdPath, `\uFEFF${markdown}`, 'utf8');

console.log(`[docs] ${path.relative(root, outputHtmlPath)} (${Buffer.byteLength(html, 'utf8')} bytes)`);
console.log(`[docs] ${path.relative(root, outputMdPath)} (UTF-8 with BOM)`);
