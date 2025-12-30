/**
 * Journey Progress Indicator
 * Shows user progress through onboarding and key milestones
 */

class JourneyProgress {
  constructor() {
    this.milestones = [
      { id: 'landing', label: 'Landing', completed: true },
      { id: 'about', label: 'About', completed: false },
      { id: 'what-this-is', label: 'What This Is', completed: false },
      { id: 'guide', label: 'How It Works', completed: false },
      { id: 'initialize', label: 'Initialize', completed: false },
      { id: 'studio', label: 'Studio', completed: false }
    ];
    this.init();
  }

  init() {
    this.loadProgress();
    this.updateCurrentMilestone();
    this.render();
  }

  loadProgress() {
    const saved = localStorage.getItem('fuguestate_journey_progress');
    if (saved) {
      try {
        const progress = JSON.parse(saved);
        this.milestones.forEach(milestone => {
          if (progress[milestone.id] !== undefined) {
            milestone.completed = progress[milestone.id];
          }
        });
      } catch (e) {
        console.error('Error loading journey progress:', e);
      }
    }
  }

  saveProgress() {
    const progress = {};
    this.milestones.forEach(milestone => {
      progress[milestone.id] = milestone.completed;
    });
    localStorage.setItem('fuguestate_journey_progress', JSON.stringify(progress));
  }

  updateCurrentMilestone() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    
    const milestoneMap = {
      'index.html': 'landing',
      'about.html': 'about',
      'what-this-is.html': 'what-this-is',
      'guide.html': 'guide',
      'workspace.html': 'studio'
    };

    const currentId = milestoneMap[filename];
    if (currentId) {
      // Mark current and all previous milestones as completed
      const currentIndex = this.milestones.findIndex(m => m.id === currentId);
      if (currentIndex >= 0) {
        for (let i = 0; i <= currentIndex; i++) {
          this.milestones[i].completed = true;
        }
        this.saveProgress();
      }
    }
  }

  render() {
    const container = document.getElementById('journey-progress-container');
    if (!container) return;

    const completedCount = this.milestones.filter(m => m.completed).length;
    const totalCount = this.milestones.length;
    const percentage = Math.round((completedCount / totalCount) * 100);

    container.innerHTML = `
      <div class="journey-progress">
        <div class="journey-progress-header">
          <h3 class="journey-progress-title">Your Journey</h3>
          <button class="journey-progress-close" onclick="window.journeyProgress.hide()" aria-label="Close">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>
        <div class="journey-progress-bar">
          <div class="journey-progress-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="journey-progress-milestones">
          ${this.milestones.map((milestone, index) => `
            <div class="journey-milestone ${milestone.completed ? 'completed' : ''} ${index === this.milestones.length - 1 ? 'last' : ''}">
              <div class="journey-milestone-indicator">
                ${milestone.completed ? '<i data-lucide="check" class="w-4 h-4"></i>' : '<span class="journey-milestone-number">' + (index + 1) + '</span>'}
              </div>
              <span class="journey-milestone-label">${milestone.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 100);
    }
  }

  show() {
    let container = document.getElementById('journey-progress-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'journey-progress-container';
      container.className = 'journey-progress-container';
      document.body.appendChild(container);
    }
    container.classList.add('visible');
    this.render();
  }

  hide() {
    const container = document.getElementById('journey-progress-container');
    if (container) {
      container.classList.remove('visible');
    }
  }

  completeMilestone(milestoneId) {
    const milestone = this.milestones.find(m => m.id === milestoneId);
    if (milestone && !milestone.completed) {
      milestone.completed = true;
      this.saveProgress();
      this.render();
    }
  }
}

// Add CSS for journey progress
const journeyProgressStyles = `
.journey-progress-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  max-width: 320px;
  transform: translateY(100px);
  opacity: 0;
  pointer-events: none;
  transition: all 0.3s ease-out;
}

.journey-progress-container.visible {
  transform: translateY(0);
  opacity: 1;
  pointer-events: all;
}

.journey-progress {
  background: rgba(24, 24, 27, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.journey-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.journey-progress-title {
  font-size: 14px;
  font-weight: 600;
  color: #f4f4f5;
  margin: 0;
}

.journey-progress-close {
  background: none;
  border: none;
  color: #71717a;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
}

.journey-progress-close:hover {
  color: #f4f4f5;
}

.journey-progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 16px;
}

.journey-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  transition: width 0.3s ease-out;
}

.journey-progress-milestones {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.journey-milestone {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #71717a;
  transition: color 0.2s;
}

.journey-milestone.completed {
  color: #a1a1aa;
}

.journey-milestone-indicator {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.journey-milestone.completed .journey-milestone-indicator {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
}

.journey-milestone-number {
  font-size: 10px;
  font-weight: 600;
}

.journey-milestone-label {
  flex: 1;
}

@media (max-width: 640px) {
  .journey-progress-container {
    bottom: 16px;
    right: 16px;
    left: 16px;
    max-width: none;
  }
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = journeyProgressStyles;
document.head.appendChild(styleSheet);

// Initialize
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.journeyProgress = new JourneyProgress();
    });
  } else {
    window.journeyProgress = new JourneyProgress();
  }
}



















