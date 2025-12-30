/**
 * Curatorial Mode Interactions (UI-first)
 * - Exhibit selection (visual + copy)
 * - Gallery hover/selection inspector
 * - Lightweight search filtering
 * - Empty state reveal if no items exist
 */

(function () {
  const SELECTED_CLASS = 'ring-2 ring-indigo-500/40 shadow-[0_0_0_6px_rgba(99,102,241,0.08)]';

  function q(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const el = q(id);
    if (el) el.textContent = value;
  }

  function normalize(s) {
    return String(s || '').toLowerCase().trim();
  }

  function getGalleryAnchors() {
    const mode = q('mode-curatorial');
    if (!mode) return [];
    const grid = mode.querySelector('.grid');
    if (!grid) return [];
    return Array.from(grid.querySelectorAll('a'));
  }

  function readAnchorMeta(a) {
    const img = a.querySelector('img');
    const titleEl = a.querySelector('.absolute.bottom-0 p-3 p, .absolute.bottom-0 p');
    const metaEl = a.querySelector('.absolute.bottom-0 span');
    const title = (img && img.getAttribute('alt')) || (titleEl && titleEl.textContent) || 'Untitled';
    const meta = (metaEl && metaEl.textContent) || '';
    return { title: title.trim(), meta: meta.trim(), type: 'Image' };
  }

  function clearSelection(anchors) {
    anchors.forEach((a) => a.classList.remove(...SELECTED_CLASS.split(' ')));
  }

  function selectAnchor(a, anchors) {
    clearSelection(anchors);
    a.classList.add(...SELECTED_CLASS.split(' '));
    const { title, meta, type } = readAnchorMeta(a);
    setText('curatorial-inspector-title', title);
    setText('curatorial-inspector-meta', `${type} · ${meta || '—'}`);
  }

  function applySearchFilter(anchors, query) {
    const qn = normalize(query);
    if (!qn) {
      anchors.forEach((a) => (a.style.display = ''));
      return;
    }

    anchors.forEach((a) => {
      const { title, meta } = readAnchorMeta(a);
      const hay = `${title} ${meta}`.toLowerCase();
      a.style.display = hay.includes(qn) ? '' : 'none';
    });
  }

  function initEmptyState() {
    const empty = q('curatorial-empty');
    if (!empty) return;
    const anchors = getGalleryAnchors();
    if (anchors.length === 0) empty.classList.remove('hidden');
  }

  function initExhibits() {
    const wrap = q('curatorial-exhibits');
    if (!wrap) return;

    const buttons = Array.from(wrap.querySelectorAll('.curatorial-exhibit'));
    if (buttons.length === 0) return;

    const setActive = (btn) => {
      buttons.forEach((b) => {
        b.classList.remove('border-indigo-500/40', 'border-violet-500/40', 'border-amber-500/40');
        b.classList.remove('bg-white/10');
      });

      btn.classList.add('bg-white/10');

      const exhibit = btn.getAttribute('data-exhibit') || 'exhibit';
      // UI-first: just update the inspector header copy to feel alive
      if (exhibit === 'coastal-solitude') {
        setText('curatorial-inspector-title', 'Coastal Solitude');
        setText('curatorial-inspector-meta', 'Exhibit · A quiet thread of recurring shoreline memories');
      } else if (exhibit === 'digital-dreams') {
        setText('curatorial-inspector-title', 'Digital Dreams');
        setText('curatorial-inspector-meta', 'Exhibit · Neon fragments and synthetic echoes');
      } else if (exhibit === 'unfinished-threads') {
        setText('curatorial-inspector-title', 'Unfinished Threads');
        setText('curatorial-inspector-meta', 'Exhibit · Drafts and half-formed patterns');
      }
    };

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => setActive(btn));
    });
  }

  function initGalleryInspector() {
    const anchors = getGalleryAnchors();
    if (anchors.length === 0) return;

    anchors.forEach((a) => {
      // Hover updates inspector without breaking navigation
      a.addEventListener('mouseenter', () => {
        selectAnchor(a, anchors);
      });
      // Click also selects, but allow navigation to continue normally
      a.addEventListener('click', () => {
        selectAnchor(a, anchors);
      });
    });
  }

  function initSearch() {
    const input = q('curatorial-search');
    if (!input) return;
    const anchors = getGalleryAnchors();
    if (anchors.length === 0) return;

    input.addEventListener('input', () => applySearchFilter(anchors, input.value));
  }

  function init() {
    // Only run if the curatorial mode exists on the page
    if (!q('mode-curatorial')) return;

    initEmptyState();
    initExhibits();
    initGalleryInspector();
    initSearch();

    // Keep icons consistent
    if (window.lucide) window.lucide.createIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();




















