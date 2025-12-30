/**
 * Enhanced markdown to HTML converter for Dameris messages
 * Converts markdown syntax to beautifully formatted HTML with proper styling
 */
function renderMarkdown(text) {
  if (!text) return '';
  
  let html = text;
  
  // Escape HTML first to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Headers (### Header -> <h3>Header</h3>)
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold text-violet-200 mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold text-violet-100 mt-5 mb-3">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-semibold text-violet-50 mt-6 mb-4">$1</h1>');
  
  // Bold (**text** or __text__) - but not if it's part of a list
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong class="font-semibold text-violet-200">$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong class="font-semibold text-violet-200">$1</strong>');
  
  // Italic (*text* or _text_) - but not if it's a list marker
  // Match italic only when not at start of line followed by space
  html = html.replace(/(?<!^)\*([^*\n]+?)\*(?!\*)/g, '<em class="italic text-violet-300">$1</em>');
  html = html.replace(/(?<!^)_([^_\n]+?)_(?!_)/g, '<em class="italic text-violet-300">$1</em>');
  
  // Code blocks (```code```)
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 my-2 overflow-x-auto"><code class="text-xs text-emerald-300 font-mono">$1</code></pre>');
  
  // Inline code (`code`)
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-zinc-900/50 text-emerald-300 px-1.5 py-0.5 rounded text-xs font-mono border border-zinc-700">$1</code>');
  
  // Horizontal rules (---)
  html = html.replace(/^---$/gim, '<hr class="border-zinc-700 my-4">');
  
  // Unordered lists (* item or - item) - must be at start of line
  // Process lists line by line to handle properly
  const lines = html.split('\n');
  const processedLines = [];
  let inList = false;
  let listItems = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listMatch = line.match(/^(\*|-)\s+(.+)$/);
    
    if (listMatch) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(`<li class="ml-4 mb-1.5 text-zinc-300 leading-relaxed">${listMatch[2]}</li>`);
    } else {
      if (inList && listItems.length > 0) {
        processedLines.push(`<ul class="list-disc list-inside space-y-1 my-3 ml-2">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      processedLines.push(line);
    }
  }
  
  // Close any remaining list
  if (inList && listItems.length > 0) {
    processedLines.push(`<ul class="list-disc list-inside space-y-1 my-3 ml-2">${listItems.join('')}</ul>`);
  }
  
  html = processedLines.join('\n');
  
  // Ordered lists (1. item)
  html = html.replace(/^(\d+)\.\s+(.+)$/gim, '<li class="ml-4 mb-1.5 text-zinc-300 list-decimal">$2</li>');
  // Wrap consecutive ordered list items
  html = html.replace(/(<li class="ml-4 mb-1.5 text-zinc-300 list-decimal">.*<\/li>\n?)+/g, (match) => {
    return '<ol class="list-decimal list-inside space-y-1 my-3 ml-2">' + match + '</ol>';
  });
  
  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-violet-400 hover:text-violet-300 underline transition-colors" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Blockquotes (> text)
  html = html.replace(/^>\s+(.+)$/gim, '<blockquote class="border-l-4 border-violet-500/50 pl-4 my-3 italic text-zinc-400">$1</blockquote>');
  
  // Line breaks (double newline -> paragraph break)
  html = html.replace(/\n\n+/g, '</p><p class="mb-2 leading-relaxed">');
  
  // Single newlines -> <br> (but preserve in code blocks)
  html = html.replace(/(?<!<\/code>)\n(?!<code)/g, '<br>');
  
  // Wrap in paragraph if not already wrapped in block elements
  if (!html.trim().startsWith('<')) {
    html = '<p class="mb-2 leading-relaxed">' + html + '</p>';
  } else if (!html.includes('<p') && !html.includes('<h') && !html.includes('<ul') && !html.includes('<ol') && !html.includes('<pre') && !html.includes('<blockquote')) {
    html = '<div class="leading-relaxed">' + html + '</div>';
  }
  
  return html;
}

// Make it globally available
if (typeof window !== 'undefined') {
  window.renderMarkdown = renderMarkdown;
}









