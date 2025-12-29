function mockFetch() {
  global.fetch = jest.fn(async (url) => {
    const u = String(url);

    if (u.startsWith('/api/memories?')) {
      return {
        ok: true,
        json: async () => ({ memories: [] }),
      };
    }

    if (u === '/api/memories/analyze') {
      return {
        ok: true,
        json: async () => ({}),
      };
    }

    if (u.startsWith('/api/export')) {
      return {
        ok: true,
        json: async () => ({}),
      };
    }

    return {
      ok: false,
      json: async () => ({}),
    };
  });
}

function loadScriptFresh() {
  jest.resetModules();
  require('../public/js/onboarding-progress.js');
}

describe('OnboardingProgress smart setup pill', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    mockFetch();
    window.lucide = undefined;
  });

  test('renders collapsed pill when progress is 1–99 and not snoozed', () => {
    window.history.pushState({}, '', '/studio/workspace.html');
    localStorage.setItem(
      'fuguestate_onboarding_progress',
      JSON.stringify({ dataSourcesConnected: true })
    );

    loadScriptFresh();

    const root = document.getElementById('onboarding-progress-ui');
    expect(root).not.toBeNull();

    const pill = document.getElementById('onboarding-progress-pill');
    expect(pill).not.toBeNull();

    const panel = document.getElementById('onboarding-progress-panel');
    expect(panel).not.toBeNull();
    expect(panel.classList.contains('hidden')).toBe(true);
  });

  test('does not render pill when progress is 0', () => {
    window.history.pushState({}, '', '/studio/workspace.html');

    loadScriptFresh();

    expect(document.getElementById('onboarding-progress-ui')).toBeNull();
  });

  test('does not render pill when snoozed', () => {
    window.history.pushState({}, '', '/studio/workspace.html');
    localStorage.setItem(
      'fuguestate_onboarding_progress',
      JSON.stringify({ dataSourcesConnected: true })
    );
    localStorage.setItem(
      'fuguestate_onboarding_progress_snoozed_until',
      new Date(Date.now() + 60 * 60 * 1000).toISOString()
    );

    loadScriptFresh();

    expect(document.getElementById('onboarding-progress-ui')).toBeNull();
  });

  test('clicking the pill toggles the expanded panel', () => {
    window.history.pushState({}, '', '/studio/workspace.html');
    localStorage.setItem(
      'fuguestate_onboarding_progress',
      JSON.stringify({ dataSourcesConnected: true })
    );

    loadScriptFresh();

    const pill = document.getElementById('onboarding-progress-pill');
    const panel = document.getElementById('onboarding-progress-panel');
    expect(pill).not.toBeNull();
    expect(panel).not.toBeNull();

    pill.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(panel.classList.contains('hidden')).toBe(false);

    pill.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(panel.classList.contains('hidden')).toBe(true);
  });

  test('does not render pill on initialization pages', () => {
    window.history.pushState({}, '', '/initialization/index.html');
    localStorage.setItem(
      'fuguestate_onboarding_progress',
      JSON.stringify({ dataSourcesConnected: true })
    );

    loadScriptFresh();

    expect(document.getElementById('onboarding-progress-ui')).toBeNull();
  });
});


















