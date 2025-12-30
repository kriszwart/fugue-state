/**
 * Muse Previews System
 * Shows preview modals for each Muse personality
 */

class MusePreviews {
  constructor() {
    this.previews = {
      analyst: {
        title: 'Analyst',
        input: 'Email thread about project planning, meeting notes, and task assignments from the past month.',
        interpretation: 'Pattern Analysis:',
        output: 'Your communication patterns show a clear cycle: planning emails cluster on Mondays (67% of planning discussions), execution follows Tuesday-Thursday (82% of task-related emails), and reflection occurs Fridays (71% of summary emails). This suggests a structured weekly workflow.',
        color: 'indigo'
      },
      poet: {
        title: 'Poet',
        input: 'Email thread about project planning, meeting notes, and task assignments from the past month.',
        interpretation: 'Poetic Interpretation:',
        output: 'In the rhythm of Mondays, intentions bloom like morning light through windows. Tuesday through Thursday, the dance of doing—each task a verse in the song of progress. Friday arrives as a quiet pause, where the week\'s story finds its closing stanza.',
        color: 'violet'
      },
      visualist: {
        title: 'Visualist',
        input: 'Email thread about project planning, meeting notes, and task assignments from the past month.',
        interpretation: 'Visual Representation:',
        output: 'A gradient visualization where Monday emails appear as cool indigo tones (planning), mid-week as vibrant amber waves (action), and Friday as soft violet hues (reflection). The pattern forms a rhythmic wave across the timeline.',
        color: 'amber',
        hasImage: true
      },
      narrator: {
        title: 'Narrator',
        input: 'Email thread about project planning, meeting notes, and task assignments from the past month.',
        interpretation: 'Narrative Story:',
        output: 'The month began with careful planning—emails exchanged like whispers before dawn. As the weeks unfolded, each task became a character in an unfolding story. By month\'s end, patterns emerged: not just what was done, but how the rhythm of work shaped itself.',
        color: 'emerald'
      },
      synthesis: {
        title: 'Synthesis',
        input: 'Email thread about project planning, meeting notes, and task assignments from the past month.',
        interpretation: 'Synthesized Insight:',
        output: 'Combining analytical patterns (67% Monday planning), poetic rhythm (the dance of doing), visual representation (indigo-to-amber gradient), and narrative arc (the story of a month\'s work), Synthesis reveals: Your work follows a natural creative cycle that mirrors both logical structure and intuitive flow.',
        color: 'gradient'
      }
    };
    this.init();
  }

  init() {
    // Add preview buttons to Muse cards
    document.querySelectorAll('.muse-card').forEach(card => {
      const museId = card.id.replace('muse-', '');
      if (this.previews[museId]) {
        this.addPreviewButton(card, museId);
      }
    });
  }

  addPreviewButton(card, museId) {
    const previewBtn = document.createElement('button');
    previewBtn.className = 'absolute top-2 right-2 w-6 h-6 rounded-full bg-zinc-800/80 hover:bg-zinc-700 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all opacity-0 group-hover:opacity-100';
    previewBtn.innerHTML = '<i data-lucide="eye" class="w-3 h-3"></i>';
    previewBtn.onclick = (e) => {
      e.stopPropagation();
      this.showPreview(museId);
    };
    card.appendChild(previewBtn);
    
    // Refresh icons after adding
    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 100);
    }
  }

  showPreview(museId) {
    const preview = this.previews[museId];
    if (!preview) return;

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'muse-preview-overlay';
    overlay.className = 'fixed inset-0 z-[10001] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4';
    overlay.onclick = (e) => {
      if (e.target === overlay) this.closePreview();
    };

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl';
    modal.onclick = (e) => e.stopPropagation();

    const colorClass = preview.color === 'gradient' 
      ? 'bg-gradient-to-r from-indigo-600 via-violet-600 via-amber-500 to-emerald-500'
      : `bg-${preview.color}-600`;

    modal.innerHTML = `
      <div class="flex items-start justify-between mb-6">
        <div>
          <h2 class="text-2xl font-semibold text-zinc-200 mb-1">${preview.title} Preview</h2>
          <p class="text-sm text-zinc-400">See how ${preview.title} interprets your memories</p>
        </div>
        <button onclick="window.musePreviews.closePreview()" class="text-zinc-500 hover:text-zinc-400 transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="space-y-6">
        <div>
          <h3 class="text-xs uppercase tracking-widest text-zinc-500 mb-2">Example Memory Input</h3>
          <div class="p-4 rounded-lg bg-zinc-950/50 border border-white/5">
            <p class="text-sm text-zinc-300 italic">"${preview.input}"</p>
          </div>
        </div>

        <div>
          <h3 class="text-xs uppercase tracking-widest text-zinc-500 mb-2">${preview.interpretation}</h3>
          <div class="p-4 rounded-lg bg-zinc-950/50 border border-white/5">
            <p class="text-sm text-zinc-300 leading-relaxed">${preview.output}</p>
          </div>
        </div>

        ${preview.hasImage ? `
        <div>
          <h3 class="text-xs uppercase tracking-widest text-zinc-500 mb-2">Visual Output</h3>
          <div class="p-4 rounded-lg bg-zinc-950/50 border border-white/5 flex items-center justify-center h-48">
            <div class="w-full h-full bg-gradient-to-br from-indigo-500/20 via-amber-500/20 to-violet-500/20 rounded-lg flex items-center justify-center">
              <p class="text-xs text-zinc-400 italic">Visual representation would appear here</p>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="flex items-center justify-between pt-4 border-t border-white/5">
          <button onclick="window.musePreviews.closePreview()" class="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors">
            Close
          </button>
          <button onclick="window.musePreviews.selectMuse('${museId}')" class="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm text-white transition-colors flex items-center gap-2">
            <span>Select ${preview.title}</span>
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Refresh icons
    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 100);
    }
  }

  selectMuse(museId) {
    // Trigger muse selection
    if (typeof selectMuse === 'function') {
      selectMuse(museId);
    }
    this.closePreview();
  }

  closePreview() {
    const overlay = document.getElementById('muse-preview-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.musePreviews = new MusePreviews();
  });
} else {
  window.musePreviews = new MusePreviews();
}




















