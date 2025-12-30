/**
 * Muse Tooltips System
 * Provides hover tooltips explaining each Muse personality
 */

class MuseTooltips {
  constructor() {
    this.tooltips = {
      analyst: {
        title: 'Analyst',
        description: 'Finds patterns, analyzes data, provides logical insights.',
        bestFor: 'Research, analysis, structured thinking.',
        example: 'Example: "Your emails show a recurring theme of creative projects every spring. This pattern suggests seasonal inspiration cycles."',
        color: 'indigo'
      },
      poet: {
        title: 'Poet',
        description: 'Interprets memories through metaphor and verse.',
        bestFor: 'Creative writing, emotional reflection, artistic expression.',
        example: 'Example: "Your memories flow like ink on paper, each moment a verse in the poem of your digital existence."',
        color: 'violet'
      },
      visualist: {
        title: 'Visualist',
        description: 'Creates visual representations and color-based interpretations.',
        bestFor: 'Visual artists, designers, visual thinkers.',
        example: 'Example: Generates abstract visualizations where each memory becomes a color, forming patterns and gradients.',
        color: 'amber'
      },
      narrator: {
        title: 'Narrator',
        description: 'Tells stories, creates narratives, uses voice.',
        bestFor: 'Storytellers, podcasters, narrative creators.',
        example: 'Example: "In the quiet hours of morning, your thoughts crystallized into decisions that would shape months to come..."',
        color: 'emerald'
      },
      synthesis: {
        title: 'Synthesis',
        description: 'Combines all approaches for comprehensive interpretation.',
        bestFor: 'Those who want everything - patterns, poetry, visuals, and narratives.',
        example: 'Example: Provides multi-modal insights combining analytical patterns, poetic metaphors, visual representations, and narrative storytelling.',
        color: 'gradient'
      }
    };
    this.activeTooltip = null;
    this.init();
  }

  init() {
    // Add tooltip containers to each Muse card
    document.querySelectorAll('.muse-card').forEach(card => {
      const museId = card.id.replace('muse-', '');
      if (this.tooltips[museId]) {
        this.attachTooltip(card, museId);
      }
    });
  }

  attachTooltip(card, museId) {
    const tooltipData = this.tooltips[museId];
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = `muse-tooltip muse-tooltip-${museId} hidden`;
    tooltip.innerHTML = `
      <div class="muse-tooltip-content">
        <h4 class="muse-tooltip-title">${tooltipData.title}</h4>
        <p class="muse-tooltip-description">${tooltipData.description}</p>
        <p class="muse-tooltip-bestfor"><strong>Best for:</strong> ${tooltipData.bestFor}</p>
        <p class="muse-tooltip-example">${tooltipData.example}</p>
      </div>
    `;
    document.body.appendChild(tooltip);

    // Show tooltip on hover
    let showTimeout;
    let hideTimeout;

    card.addEventListener('mouseenter', () => {
      clearTimeout(hideTimeout);
      showTimeout = setTimeout(() => {
        this.showTooltip(tooltip, card, museId);
      }, 300);
    });

    card.addEventListener('mouseleave', () => {
      clearTimeout(showTimeout);
      hideTimeout = setTimeout(() => {
        this.hideTooltip(tooltip);
      }, 100);
    });

    // Also handle tooltip hover
    tooltip.addEventListener('mouseenter', () => {
      clearTimeout(hideTimeout);
    });

    tooltip.addEventListener('mouseleave', () => {
      hideTimeout = setTimeout(() => {
        this.hideTooltip(tooltip);
      }, 100);
    });
  }

  showTooltip(tooltip, card, museId) {
    if (this.activeTooltip && this.activeTooltip !== tooltip) {
      this.hideTooltip(this.activeTooltip);
    }

    this.activeTooltip = tooltip;
    const rect = card.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Position tooltip
    let top = rect.top - tooltipRect.height - 10;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

    // Adjust for mobile (show below instead)
    if (window.innerWidth < 768) {
      top = rect.bottom + 10;
    }

    // Keep tooltip in viewport
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    if (top < 10) {
      top = rect.bottom + 10; // Show below if no room above
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.classList.remove('hidden');
    
    // Trigger animation
    setTimeout(() => {
      tooltip.classList.add('visible');
    }, 10);
  }

  hideTooltip(tooltip) {
    if (tooltip) {
      tooltip.classList.remove('visible');
      setTimeout(() => {
        tooltip.classList.add('hidden');
        this.activeTooltip = null;
      }, 200);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.museTooltips = new MuseTooltips();
  });
} else {
  window.museTooltips = new MuseTooltips();
}




















