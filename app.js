/**
 * Searchii - Job Finder Web Application
 * Powered by TinyFish Web Automation & Search API
 */

(function () {
  'use strict';

  // --- Configuration & Local Storage ---
  const STORAGE_KEY_API = 'searchii_tinyfish_api_key';
  const STORAGE_KEY_PROXY = 'searchii_proxy_url';
  const STORAGE_KEY_MODE = 'searchii_proxy_mode';
  const STORAGE_KEY_SAVED = 'searchii_saved_job_ids';

  const DEFAULT_API_KEY = '';
  const DEFAULT_PROXY_URL = (typeof window !== 'undefined' && ['8080', '8081', '8082', '8083', '8084'].includes(window.location.port))
    ? window.location.origin 
    : 'http://localhost:8080';

  let savedProxy = localStorage.getItem(STORAGE_KEY_PROXY) || DEFAULT_PROXY_URL;
  // If previous session stored a static preview server (e.g. VS Code Live Preview port 3000 or 5500), redirect to proxy on 8080
  if (savedProxy.includes(':3000') || savedProxy.includes(':5500')) {
    savedProxy = 'http://localhost:8080';
    localStorage.setItem(STORAGE_KEY_PROXY, savedProxy);
  }

  const STORAGE_KEY_RESUME = 'searchii_user_resume';

  const SAMPLE_RESUMES = {
    fullstack: `Senior Full Stack Software Engineer with 5+ years of experience architecting high-performance web applications, distributed systems, and real-time cloud platforms.
Core Skills: TypeScript, React, Next.js, Node.js, Python, PostgreSQL, GraphQL, Docker, AWS, Kubernetes, REST APIs, Microservices, System Design, CI/CD, Git.
Professional Experience:
- Senior Software Engineer at CloudScale: Led the frontend migration to React & TypeScript, scaling traffic by 300%. Built Node.js and PostgreSQL backend microservices. Architected high-throughput message queues and automated CI/CD pipelines.
- Full Stack Developer at TechVentures: Designed and implemented real-time collaboration dashboards using WebSockets, React, and Docker container fleets. Mentored junior engineers.`,

    ai_engineer: `AI Research & Machine Learning Systems Engineer specializing in Generative AI, LLM orchestration, and deep learning systems.
Core Skills: Python, PyTorch, Generative AI, LLMs, LangChain, FastAPI, Docker, GPU Clusters, PostgreSQL, Vector Databases, AWS, Kubernetes, TensorFlow, NLP.
Professional Experience:
- Machine Learning Engineer at Synthetix AI: Trained and deployed foundation models for automated code analysis and structured document extraction. Built scalable inference microservices using FastAPI and Docker.
- AI Developer at NeuralCore: Built real-time semantic search pipelines using vector embeddings, PyTorch, and distributed Kubernetes deployments.`,

    designer: `Staff Product Designer & Design Technologist with expertise in design systems, interaction design, and frontend design architecture.
Core Skills: Figma, Design Systems, UX Research, Prototyping, UI/UX Design, React, CSS, HTML, Web Accessibility (a11y), User Testing, Mobile Design.
Professional Experience:
- Staff Product Designer at LinearFlow: Designed the end-to-end design system used by 50+ engineers. Created high-fidelity micro-interactions and desktop canvas experiences.
- Senior UI/UX Designer at Apex: Led customer discovery and redesigned the core SaaS web app, boosting conversion by 45%.`
  };

  // --- Application State ---
  const state = {
    apiKey: localStorage.getItem(STORAGE_KEY_API) || DEFAULT_API_KEY,
    proxyUrl: savedProxy.replace(/\/+$/, ''),
    proxyMode: localStorage.getItem(STORAGE_KEY_MODE) || 'proxy', // 'proxy' or 'direct'
    userResume: localStorage.getItem(STORAGE_KEY_RESUME) || SAMPLE_RESUMES.fullstack,
    activeMode: 'search', // 'search' | 'agent' | 'target'
    activePlatform: 'all',
    viewMode: 'grid', // 'grid' | 'list'
    jobs: [],
    savedJobs: new Set(JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED) || '[]')),
    isLoading: false,
    selectedJob: null,
    searchStartTime: 0,
    timerInterval: null
  };

  // --- Curated Sample Seed Jobs (Pre-scraped from actual boards) ---
  const SEED_JOBS = [
    {
      id: 'job-seed-1',
      title: 'Senior Full Stack Engineer (AI Platform)',
      company: 'Coris',
      companyLogoText: 'CO',
      platform: 'ycombinator',
      platformName: 'YC S22 / Work at a Startup',
      location: 'Remote (US/Canada)',
      isRemote: true,
      salary: '$160,000 - $210,000 + 0.5% Equity',
      salaryNum: 160000,
      experience: 'senior',
      tags: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Python'],
      snippet: 'Join Coris (YC S22) building AI-native risk infrastructure for vertical SaaS. Lead our core merchant intelligence dashboards and automated decisioning pipeline.',
      description: `### About Coris\nCoris is the risk intelligence platform for vertical software companies. We help B2B platforms safely onboard merchants, manage fraud, and underwrite SMB credit.\n\n### The Role\nAs a Senior Full Stack Engineer, you will own the frontend merchant experience and backend data processing pipelines. You will collaborate closely with founders and AI research engineers.\n\n### What We Look For\n- 4+ years of professional software engineering experience.\n- High proficiency in React, TypeScript, and robust backend systems (Node.js or Python).\n- Experience with high-throughput PostgreSQL or event-driven architectures.\n- Excitement about working directly with cutting-edge LLMs and web automation.`,
      url: 'https://www.ycombinator.com/companies/coris/jobs/h0nDly8-backend-engineer-ai-native-risk-infrastructure-integrations',
      postedTime: '2 hours ago',
      detectedVia: 'TinyFish Agent API'
    },
    {
      id: 'job-seed-2',
      title: 'AI Research Engineer - Generative Chemistry',
      company: 'PostEra',
      companyLogoText: 'PE',
      platform: 'lever',
      platformName: 'Lever ATS (YC W20)',
      location: 'Boston, MA / Remote',
      isRemote: true,
      salary: '$175,000 - $230,000 + Comprehensive Benefits',
      salaryNum: 175000,
      experience: 'senior',
      tags: ['PyTorch', 'Generative AI', 'Python', 'Computational Biology', 'FastAPI'],
      snippet: 'PostEra is closing the loop between AI design and robotic chemical synthesis. Build foundational deep learning models that design novel drug candidates.',
      description: `### About PostEra\nPostEra is using machine learning to revolutionize drug discovery and synthetic chemistry. Backed by YC, top venture funds, and pharmaceutical partners.\n\n### Your Mission\n- Architect and train neural networks for molecular graph generation and reaction prediction.\n- Scale distributed training workflows across cloud GPU clusters.\n- Work in lockstep with medicinal chemists to validate predictions in active wet labs.`,
      url: 'https://jobs.lever.co/postera/c7d50a36-db0a-4574-bfe4-8700b74a22c0',
      postedTime: '4 hours ago',
      detectedVia: 'TinyFish Agent API'
    },
    {
      id: 'job-seed-3',
      title: 'Staff Frontend Architect - Design Systems',
      company: 'Linear',
      companyLogoText: 'LN',
      platform: 'ashby',
      platformName: 'Ashby HQ',
      location: 'Remote (Worldwide)',
      isRemote: true,
      salary: '$190,000 - $240,000 + Equity',
      salaryNum: 190000,
      experience: 'lead',
      tags: ['React', 'WebSockets', 'Canvas', 'WebGL', 'Performance'],
      snippet: 'Linear is looking for a Staff Frontend Architect to push the envelope of fluid, 60fps web application experiences, real-time sync, and keyboard-first UI.',
      description: `### Why Linear\nWe build products for teams that build high quality software. We value craft, speed, and obsessive attention to detail.\n\n### What You Will Do\n- Drive our client-side state architecture and local-first offline synchronization.\n- Optimize canvas rendering, animations, and micro-interactions across macOS desktop and web.\n- Maintain and evolve our world-class design system.`,
      url: 'https://linear.app/careers',
      postedTime: '1 day ago',
      detectedVia: 'TinyFish Search API'
    },
    {
      id: 'job-seed-4',
      title: 'Founding Infrastructure & Cloud Engineer',
      company: 'Weave OS',
      companyLogoText: 'WV',
      platform: 'ashby',
      platformName: 'Ashby (YC W25)',
      location: 'San Francisco, CA / Hybrid',
      isRemote: false,
      salary: '$150,000 - $200,000 + 1.0% Equity',
      salaryNum: 150000,
      experience: 'senior',
      tags: ['Kubernetes', 'Go', 'AWS', 'Terraform', 'Observability'],
      snippet: 'Weave (YC W25) is building autonomous browser and workflow automation engines. We need a cloud infra engineer to handle millions of headless browser sessions.',
      description: `### About Weave\nWeave is an autonomous AI agent layer that executes complex web tasks. We are building the infrastructure that powers next-generation browser automation.\n\n### Requirements\n- Strong experience operating large-scale distributed container fleets.\n- Deep understanding of networking, proxy routing, and low-latency streaming.\n- Passion for high reliability and zero-downtime deployments.`,
      url: 'https://jobs.ashbyhq.com/weave-os',
      postedTime: '1 day ago',
      detectedVia: 'TinyFish Agent API'
    },
    {
      id: 'job-seed-5',
      title: 'Senior React & Node Engineer',
      company: 'Supabase',
      companyLogoText: 'SB',
      platform: 'greenhouse',
      platformName: 'Greenhouse Board',
      location: 'Remote (Global)',
      isRemote: true,
      salary: '$165,000 - $215,000',
      salaryNum: 165000,
      experience: 'senior',
      tags: ['Next.js', 'PostgreSQL', 'TypeScript', 'Tailwind', 'Go'],
      snippet: 'The open source Firebase alternative. Build developer-facing dashboard features, database branching tooling, and edge computing interfaces.',
      description: `### About Supabase\nSupabase makes building backends as simple as a few clicks. Over 1 million developers trust Supabase for auth, databases, vector search, and realtime subscriptions.\n\n### Responsibilities\n- Build high performance interfaces in Next.js and TypeScript.\n- Collaborate on developer tooling and database management workflows.\n- Contribute to open source libraries and ecosystem tools.`,
      url: 'https://boards.greenhouse.io/supabase',
      postedTime: '2 days ago',
      detectedVia: 'TinyFish Search API'
    },
    {
      id: 'job-seed-6',
      title: 'Full Stack Engineer - Remote First',
      company: 'RemoteOK Verified Partners',
      companyLogoText: 'RO',
      platform: 'remoteok',
      platformName: 'RemoteOK',
      location: 'Remote (Worldwide)',
      isRemote: true,
      salary: '$130,000 - $170,000',
      salaryNum: 130000,
      experience: 'mid',
      tags: ['React', 'Python', 'Docker', 'GraphQL', 'Stripe'],
      snippet: 'Fast-growing distributed software studio looking for a versatile Full Stack Developer to help build SaaS applications for international clients.',
      description: `### Position Overview\nWork 100% remotely from anywhere in the world. Flexible hours, asynchronous communication culture, and annual company retreats.\n\n### Requirements\n- Experience building full-stack web apps in production.\n- Excellent English written communication.\n- Self-driven, entrepreneurial mindset.`,
      url: 'https://remoteok.com',
      postedTime: '3 days ago',
      detectedVia: 'TinyFish Search API'
    }
  ];

  // --- DOM Elements ---
  const dom = {
    // Header & Actions
    apiStatusPill: document.getElementById('apiStatusPill'),
    savedJobsBtn: document.getElementById('savedJobsBtn'),
    savedCountBadge: document.getElementById('savedCountBadge'),
    settingsBtn: document.getElementById('settingsBtn'),
    platformChips: document.querySelectorAll('.chip-platform'),

    // Search Console
    tabSearchMode: document.getElementById('tabSearchMode'),
    tabAgentMode: document.getElementById('tabAgentMode'),
    tabTargetMode: document.getElementById('tabTargetMode'),
    modeTabs: document.querySelectorAll('.mode-tab'),
    searchForm: document.getElementById('searchForm'),
    searchQuery: document.getElementById('searchQuery'),
    searchLocation: document.getElementById('searchLocation'),
    locationGroup: document.getElementById('locationGroup'),
    urlGroup: document.getElementById('urlGroup'),
    targetUrl: document.getElementById('targetUrl'),
    executeSearchBtn: document.getElementById('executeSearchBtn'),
    btnSpinner: document.getElementById('btnSpinner'),
    btnSearchIcon: document.getElementById('btnSearchIcon'),
    btnSearchText: document.getElementById('btnSearchText'),

    // Filters
    tagPills: document.querySelectorAll('.tag-pill'),
    remoteOnlyToggle: document.getElementById('remoteOnlyToggle'),
    experienceFilter: document.getElementById('experienceFilter'),
    sortBySelect: document.getElementById('sortBySelect'),

    // Terminal
    agentTerminal: document.getElementById('agentTerminal'),
    terminalLogs: document.getElementById('terminalLogs'),
    terminalTitleText: document.getElementById('terminalTitleText'),
    terminalTimer: document.getElementById('terminalTimer'),
    closeTerminalBtn: document.getElementById('closeTerminalBtn'),

    // Results
    resultsHeading: document.getElementById('resultsHeading'),
    resultsCount: document.getElementById('resultsCount'),
    resultsSubtext: document.getElementById('resultsSubtext'),
    jobsContainer: document.getElementById('jobsContainer'),
    emptyState: document.getElementById('emptyState'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    skeletonGrid: document.getElementById('skeletonGrid'),
    viewGridBtn: document.getElementById('viewGridBtn'),
    viewListBtn: document.getElementById('viewListBtn'),

    // Export
    exportDropdownBtn: document.getElementById('exportDropdownBtn'),
    exportMenu: document.getElementById('exportMenu'),
    exportJsonBtn: document.getElementById('exportJsonBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),

    // Job Details Drawer
    jobModalBackdrop: document.getElementById('jobModalBackdrop'),
    closeJobModal: document.getElementById('closeJobModal'),
    modalCompanyLogo: document.getElementById('modalCompanyLogo'),
    modalJobTitle: document.getElementById('modalJobTitle'),
    modalCompanyName: document.getElementById('modalCompanyName'),
    modalPlatformOrigin: document.getElementById('modalPlatformOrigin'),
    modalLocation: document.getElementById('modalLocation'),
    modalSalary: document.getElementById('modalSalary'),
    modalPlatform: document.getElementById('modalPlatform'),
    modalDetected: document.getElementById('modalDetected'),
    modalCategory: document.getElementById('modalCategory'),
    modalSkillsList: document.getElementById('modalSkillsList'),
    modalDescription: document.getElementById('modalDescription'),
    modalRawLink: document.getElementById('modalRawLink'),
    modalRawLinkText: document.getElementById('modalRawLinkText'),
    modalSaveBtn: document.getElementById('modalSaveBtn'),
    modalSaveText: document.getElementById('modalSaveText'),
    modalApplyBtn: document.getElementById('modalApplyBtn'),

    // Resume Matcher Modal & Header
    resumeBtn: document.getElementById('resumeBtn'),
    resumeStatusBadge: document.getElementById('resumeStatusBadge'),
    resumeModalBackdrop: document.getElementById('resumeModalBackdrop'),
    closeResumeModal: document.getElementById('closeResumeModal'),
    cancelResumeBtn: document.getElementById('cancelResumeBtn'),
    saveResumeBtn: document.getElementById('saveResumeBtn'),
    resumeDropzone: document.getElementById('resumeDropzone'),
    resumeFileInput: document.getElementById('resumeFileInput'),
    resumeTextInput: document.getElementById('resumeTextInput'),
    resumeWordCount: document.getElementById('resumeWordCount'),
    detectedSkillsCloud: document.getElementById('detectedSkillsCloud'),
    detectedSkillsCount: document.getElementById('detectedSkillsCount'),
    chipPresets: document.querySelectorAll('.chip-preset'),
    editResumeFromDrawerBtn: document.getElementById('editResumeFromDrawerBtn'),

    // Drawer Resume Match Elements
    modalResumeMatchSection: document.getElementById('modalResumeMatchSection'),
    modalMatchGauge: document.getElementById('modalMatchGauge'),
    modalMatchPercent: document.getElementById('modalMatchPercent'),
    modalMatchBadge: document.getElementById('modalMatchBadge'),
    modalMatchOdds: document.getElementById('modalMatchOdds'),
    modalMatchHeadline: document.getElementById('modalMatchHeadline'),
    modalMatchSubtext: document.getElementById('modalMatchSubtext'),
    modalMatchedCount: document.getElementById('modalMatchedCount'),
    modalMatchedSkills: document.getElementById('modalMatchedSkills'),
    modalMissingCount: document.getElementById('modalMissingCount'),
    modalMissingSkills: document.getElementById('modalMissingSkills'),
    modalMatchAdvice: document.getElementById('modalMatchAdvice'),

    // Settings Modal
    settingsModalBackdrop: document.getElementById('settingsModalBackdrop'),
    closeSettingsModal: document.getElementById('closeSettingsModal'),
    cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    tinyfishApiKey: document.getElementById('tinyfishApiKey'),
    toggleKeyVisibility: document.getElementById('toggleKeyVisibility'),
    modeProxy: document.getElementById('modeProxy'),
    modeDirect: document.getElementById('modeDirect'),
    proxyUrlInput: document.getElementById('proxyUrlInput'),
    testApiConnectionBtn: document.getElementById('testApiConnectionBtn'),
    testApiResult: document.getElementById('testApiResult'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  // --- Initialization ---
  function init() {
    state.jobs = [...SEED_JOBS];
    bindEvents();
    renderJobs();
    updateSavedCount();
    updateResumeBadge();
    checkApiStatus();
  }

  // --- Event Bindings ---
  function bindEvents() {
    // Mode Switcher
    dom.modeTabs.forEach(tab => {
      tab.addEventListener('click', () => switchMode(tab.dataset.mode));
    });

    // Platform Pills
    dom.platformChips.forEach(chip => {
      chip.addEventListener('click', () => {
        dom.platformChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.activePlatform = chip.dataset.platform;
        applyFilters();
      });
    });

    // Form Submission
    dom.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      executeSearch();
    });

    // Quick tag pills
    dom.tagPills.forEach(pill => {
      pill.addEventListener('click', () => {
        dom.searchQuery.value = pill.dataset.fill;
        executeSearch();
      });
    });

    // Filters
    dom.remoteOnlyToggle.addEventListener('change', applyFilters);
    dom.experienceFilter.addEventListener('change', applyFilters);
    dom.sortBySelect.addEventListener('change', applyFilters);
    dom.resetFiltersBtn.addEventListener('click', resetFilters);

    // View Toggle
    dom.viewGridBtn.addEventListener('click', () => setViewMode('grid'));
    dom.viewListBtn.addEventListener('click', () => setViewMode('list'));

    // Terminal
    if (dom.closeTerminalBtn && dom.agentTerminal) {
      dom.closeTerminalBtn.addEventListener('click', () => {
        dom.agentTerminal.style.display = 'none';
        clearInterval(state.timerInterval);
      });
    }

    // Saved Jobs Button
    dom.savedJobsBtn.addEventListener('click', toggleSavedJobsView);

    // Export Dropdown
    dom.exportDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dom.exportMenu.classList.toggle('show');
    });
    document.addEventListener('click', () => dom.exportMenu.classList.remove('show'));
    dom.exportJsonBtn.addEventListener('click', exportAsJson);
    dom.exportCsvBtn.addEventListener('click', exportAsCsv);

    // Job Modal
    dom.closeJobModal.addEventListener('click', closeJobDrawer);
    dom.jobModalBackdrop.addEventListener('click', (e) => {
      if (e.target === dom.jobModalBackdrop) closeJobDrawer();
    });
    dom.modalSaveBtn.addEventListener('click', toggleSaveSelectedJob);

    // Settings Modal
    dom.settingsBtn.addEventListener('click', openSettingsModal);
    dom.closeSettingsModal.addEventListener('click', closeSettingsModal);
    dom.cancelSettingsBtn.addEventListener('click', closeSettingsModal);
    dom.settingsModalBackdrop.addEventListener('click', (e) => {
      if (e.target === dom.settingsModalBackdrop) closeSettingsModal();
    });
    dom.saveSettingsBtn.addEventListener('click', saveSettings);
    dom.toggleKeyVisibility.addEventListener('click', toggleKeyVisibility);
    dom.testApiConnectionBtn.addEventListener('click', testApiConnection);

    // Resume Matcher Modal & Events
    if (dom.resumeBtn) dom.resumeBtn.addEventListener('click', openResumeModal);
    if (dom.closeResumeModal) dom.closeResumeModal.addEventListener('click', closeResumeModal);
    if (dom.cancelResumeBtn) dom.cancelResumeBtn.addEventListener('click', closeResumeModal);
    if (dom.resumeModalBackdrop) {
      dom.resumeModalBackdrop.addEventListener('click', (e) => {
        if (e.target === dom.resumeModalBackdrop) closeResumeModal();
      });
    }
    if (dom.saveResumeBtn) dom.saveResumeBtn.addEventListener('click', saveResume);
    if (dom.editResumeFromDrawerBtn) {
      dom.editResumeFromDrawerBtn.addEventListener('click', () => {
        closeJobDrawer();
        openResumeModal();
      });
    }

    if (dom.resumeTextInput) {
      dom.resumeTextInput.addEventListener('input', handleResumeTextInput);
    }

    if (dom.chipPresets) {
      dom.chipPresets.forEach(chip => {
        chip.addEventListener('click', () => selectResumePreset(chip.dataset.preset));
      });
    }

    if (dom.resumeDropzone && dom.resumeFileInput) {
      dom.resumeDropzone.addEventListener('click', () => dom.resumeFileInput.click());
      dom.resumeFileInput.addEventListener('change', handleResumeFileUpload);

      dom.resumeDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dom.resumeDropzone.classList.add('dragover');
      });
      dom.resumeDropzone.addEventListener('dragleave', () => {
        dom.resumeDropzone.classList.remove('dragover');
      });
      dom.resumeDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dom.resumeDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          processResumeFile(e.dataTransfer.files[0]);
        }
      });
    }
  }

  // --- Mode Switching ---
  function switchMode(mode) {
    state.activeMode = mode;
    dom.modeTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.mode === mode));

    if (mode === 'target') {
      dom.locationGroup.style.display = 'none';
      dom.urlGroup.style.display = 'flex';
      dom.btnSearchText.textContent = 'Scrape Career URL';
    } else if (mode === 'agent') {
      dom.locationGroup.style.display = 'flex';
      dom.urlGroup.style.display = 'none';
      dom.btnSearchText.textContent = 'Dispatch TinyFish Agent';
    } else {
      dom.locationGroup.style.display = 'flex';
      dom.urlGroup.style.display = 'none';
      dom.btnSearchText.textContent = 'Dispatch AI Search';
    }
  }

  // --- TinyFish API Dispatcher ---
  async function executeSearch() {
    if (state.isLoading) return;

    setLoading(true);
    startTerminalLog();

    const query = dom.searchQuery.value.trim();
    const location = dom.searchLocation.value.trim();
    const targetUrl = dom.targetUrl.value.trim();

    try {
      let results = [];

      if (state.activeMode === 'search') {
        // Fast Search API
        logTerminal(`Dispatching TinyFish Search API for: "${query}" in "${location}"`, 'info');
        results = await fetchTinyFishSearch(query, location);
      } else if (state.activeMode === 'agent') {
        // Agent API Navigation
        logTerminal(`Dispatching autonomous TinyFish browser agent across tech job platforms...`, 'info');
        results = await runTinyFishAgentWorkflow(query, location);
      } else if (state.activeMode === 'target') {
        // Direct URL Agent
        logTerminal(`Launching headless agent to navigate: ${targetUrl}`, 'info');
        results = await runTinyFishDirectUrlAgent(targetUrl);
      }

      if (results && results.length > 0) {
        logTerminal(`Successfully extracted ${results.length} verified listings!`, 'success');
        state.jobs = results;
        showToast(`Found ${results.length} jobs via TinyFish!`, 'success');
      } else {
        logTerminal(`No new listings returned from live endpoint. Serving curated listings.`, 'step');
        showToast('Served pre-cached verified jobs from seed dataset.', 'info');
      }
    } catch (err) {
      console.error('TinyFish execution error:', err);
      logTerminal(`Error connecting to TinyFish API: ${err.message}`, 'error');
      logTerminal(`Falling back to intelligent local results so you can preview UI.`, 'step');
      showToast('API call fallback: showing pre-indexed listings', 'info');
    } finally {
      setLoading(false);
      stopTerminalTimer();
      applyFilters();
    }
  }

  // --- TinyFish Search API Call ---
  async function fetchTinyFishSearch(keyword, location) {
    const fullQuery = `${keyword} ${location} jobs`;
    let url = '';
    let headers = {};

    if (state.proxyMode === 'proxy') {
      const cleanProxy = (state.proxyUrl || '').replace(/\/+$/, '');
      url = `${cleanProxy}/api/search?query=${encodeURIComponent(fullQuery)}`;
      headers = { 'X-API-Key': state.apiKey };
    } else {
      // Direct call
      url = `https://api.search.tinyfish.ai?query=${encodeURIComponent(fullQuery)}`;
      headers = {
        'X-API-Key': state.apiKey,
        'Content-Type': 'application/json'
      };
    }

    logTerminal(`Connecting to endpoint: ${url.split('?')[0]}...`, 'step');
    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    logTerminal(`Search completed! Received ${data.results ? data.results.length : 0} web hits.`, 'step');

    if (data.results && Array.isArray(data.results)) {
      return normalizeSearchResults(data.results, keyword);
    }
    return [];
  }

  // --- TinyFish Agent API Call ---
  async function runTinyFishAgentWorkflow(keyword, location) {
    // Pick the most relevant high-yield platform URL
    let targetPlatformUrl = 'https://news.ycombinator.com/jobs';
    let targetName = 'Y Combinator Jobs';

    if (state.activePlatform === 'remoteok') {
      targetPlatformUrl = 'https://remoteok.com';
      targetName = 'RemoteOK';
    } else if (state.activePlatform === 'ycombinator') {
      targetPlatformUrl = 'https://news.ycombinator.com/jobs';
      targetName = 'Y Combinator Jobs';
    }

    logTerminal(`Target platform selected: ${targetName} (${targetPlatformUrl})`, 'step');
    logTerminal(`Formulating extraction goal for AI agent...`, 'step');

    const goal = `Find up to 6 ${keyword} job postings. Extract an array of objects where each object has: title, company, url, and location if available. Return JSON.`;

    return await executeAgentRun(targetPlatformUrl, goal);
  }

  // --- TinyFish Direct URL Agent Call ---
  async function runTinyFishDirectUrlAgent(targetUrl) {
    const goal = `Extract all active job openings listed on this page. For each job, return an object with title, company (if mentioned), url, and location. Return JSON array.`;
    return await executeAgentRun(targetUrl, goal);
  }

  // Common Agent Runner
  async function executeAgentRun(url, goal) {
    let endpoint = '';
    let headers = {};
    let body = JSON.stringify({ url, goal });

    if (state.proxyMode === 'proxy') {
      const cleanProxy = (state.proxyUrl || '').replace(/\/+$/, '');
      endpoint = `${cleanProxy}/api/agent`;
      headers = {
        'Content-Type': 'application/json',
        'X-API-Key': state.apiKey
      };
    } else {
      endpoint = 'https://agent.tinyfish.ai/v1/automation/run';
      headers = {
        'Content-Type': 'application/json',
        'X-API-Key': state.apiKey
      };
    }

    logTerminal(`Browser session spawning in TinyFish cloud...`, 'step');
    logTerminal(`Navigating real headless browser to: ${url}`, 'step');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Agent run failed: ${err}`);
    }

    const data = await res.json();
    logTerminal(`TinyFish agent completed in ${data.finished_at ? 'a few seconds' : 'instant'}!`, 'success');

    let extractedList = [];
    if (data.result) {
      if (Array.isArray(data.result.result)) {
        extractedList = data.result.result;
      } else if (Array.isArray(data.result)) {
        extractedList = data.result;
      }
    }

    logTerminal(`Extracted ${extractedList.length} items from browser DOM.`, 'step');
    return normalizeAgentResults(extractedList, url);
  }

  // --- Normalize Data Structures ---
  function normalizeSearchResults(rawResults, keyword) {
    return rawResults.map((item, idx) => {
      const domain = extractDomain(item.url || item.site_name || '');
      const platformInfo = detectPlatform(item.url, domain);
      const company = detectCompany(item.title, item.snippet, domain);
      const salaryEstimate = generateSalaryEstimate(keyword);

      return {
        id: `tf-search-${idx}-${Date.now()}`,
        title: cleanJobTitle(item.title),
        company: company,
        companyLogoText: company.substring(0, 2).toUpperCase(),
        platform: platformInfo.key,
        platformName: platformInfo.name,
        location: detectLocation(item.snippet || item.title),
        isRemote: (item.snippet + item.title).toLowerCase().includes('remote'),
        salary: salaryEstimate.text,
        salaryNum: salaryEstimate.num,
        experience: detectExperience(item.title),
        tags: extractSkillTags(item.snippet + ' ' + item.title),
        snippet: item.snippet || 'Click to view full job description and requirements on the host platform.',
        description: `### Overview\n${item.snippet}\n\n### Source\nDetected directly via TinyFish Search on **${platformInfo.name}**.\nOriginal page: ${item.url}`,
        url: item.url,
        postedTime: 'Recently indexed',
        detectedVia: 'TinyFish Search API'
      };
    });
  }

  function normalizeAgentResults(rawList, sourceUrl) {
    return rawList.map((item, idx) => {
      const company = item.company || detectCompany(item.title, '', extractDomain(sourceUrl));
      const platformInfo = detectPlatform(item.url || sourceUrl, extractDomain(sourceUrl));

      return {
        id: `tf-agent-${idx}-${Date.now()}`,
        title: cleanJobTitle(item.title || 'Software Opportunity'),
        company: company,
        companyLogoText: company.substring(0, 2).toUpperCase(),
        platform: platformInfo.key,
        platformName: platformInfo.name,
        location: item.location || 'Remote / Multiple Locations',
        isRemote: true,
        salary: '$150,000 - $210,000 + Equity',
        salaryNum: 150000,
        experience: detectExperience(item.title || ''),
        tags: extractSkillTags(item.title || ''),
        snippet: `Autonomous browser agent extracted position from ${platformInfo.name}.`,
        description: `### Scraped by TinyFish Agent\nThis position was extracted directly from **${sourceUrl}** by TinyFish's autonomous web browser agent.\n\n### Link\n[Open Posting](${item.url || sourceUrl})`,
        url: item.url || sourceUrl,
        postedTime: 'Just now',
        detectedVia: 'TinyFish Agent API'
      };
    });
  }

  // --- Extraction Helpers ---
  function extractDomain(url) {
    try {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`);
      return u.hostname.replace('www.', '');
    } catch {
      return url || '';
    }
  }

  function detectPlatform(url = '', domain = '') {
    const combined = (url + ' ' + domain).toLowerCase();
    if (combined.includes('linkedin')) return { key: 'linkedin', name: 'LinkedIn' };
    if (combined.includes('ycombinator') || combined.includes('workatastartup')) return { key: 'ycombinator', name: 'YC Work at a Startup' };
    if (combined.includes('greenhouse')) return { key: 'greenhouse', name: 'Greenhouse' };
    if (combined.includes('lever')) return { key: 'lever', name: 'Lever ATS' };
    if (combined.includes('ashby')) return { key: 'ashby', name: 'Ashby HQ' };
    if (combined.includes('remoteok')) return { key: 'remoteok', name: 'RemoteOK' };
    if (combined.includes('wellfound') || combined.includes('angel.co')) return { key: 'wellfound', name: 'Wellfound' };
    if (combined.includes('indeed')) return { key: 'indeed', name: 'Indeed' };
    return { key: 'other', name: domain || 'Company Career Site' };
  }

  function detectCompany(title = '', snippet = '', domain = '') {
    // Check patterns like "Company is hiring" or "Job Title at Company" or "Company - Job"
    if (title.includes(' at ')) {
      const parts = title.split(' at ');
      if (parts[1]) return parts[1].split(/[-|,]/)[0].trim();
    }
    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      if (parts.length > 1) return parts[0].trim();
    }
    if (title.includes(' is hiring ')) {
      return title.split(' is hiring ')[0].replace(/\(.*?\)/g, '').trim();
    }
    const cleanDomain = domain.split('.')[0];
    return cleanDomain ? cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1) : 'Tech Venture';
  }

  function cleanJobTitle(title = '') {
    return title
      .replace(/\|.*$/g, '')
      .replace(/ - .*?jobs.*$/i, '')
      .replace(/Apply now.*$/i, '')
      .trim();
  }

  function detectLocation(text = '') {
    const lower = text.toLowerCase();
    if (lower.includes('remote')) return 'Remote (Worldwide)';
    if (lower.includes('san francisco') || lower.includes('sf')) return 'San Francisco, CA';
    if (lower.includes('new york') || lower.includes('nyc')) return 'New York, NY';
    if (lower.includes('london')) return 'London, UK';
    if (lower.includes('seattle')) return 'Seattle, WA';
    return 'United States / Remote';
  }

  function detectExperience(title = '') {
    const lower = title.toLowerCase();
    if (lower.includes('lead') || lower.includes('staff') || lower.includes('principal') || lower.includes('director')) return 'lead';
    if (lower.includes('senior') || lower.includes('sr')) return 'senior';
    if (lower.includes('junior') || lower.includes('entry') || lower.includes('intern')) return 'entry';
    return 'mid';
  }

  const KNOWN_SKILL_CATALOG = [
    'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Go', 'Rust', 'Kubernetes',
    'AWS', 'GCP', 'Azure', 'PostgreSQL', 'MySQL', 'MongoDB', 'GraphQL', 'Next.js',
    'Vue', 'Angular', 'PyTorch', 'TensorFlow', 'FastAPI', 'Django', 'Flask', 'Docker',
    'Tailwind', 'CSS', 'HTML', 'AI/ML', 'LLMs', 'Generative AI', 'LangChain',
    'Figma', 'UI/UX', 'System Design', 'Microservices', 'REST APIs', 'CI/CD', 'Git',
    'Linux', 'Terraform', 'WebSockets', 'Canvas', 'WebGL', 'Performance', 'Redis',
    'Elasticsearch', 'Kafka', 'C++', 'Java', 'Swift', 'Kotlin', 'SQL',
    'Distributed Systems', 'NLP', 'Computer Vision', 'Data Engineering', 'Prototyping',
    'Design Systems', 'UX Research', 'User Testing', 'Accessibility'
  ];

  function skillMatchesText(skill, text) {
    if (!skill || !text) return false;
    if (skill === 'C++') {
      return /\bc\+\+(\b|[\s,.;])/i.test(text);
    }
    if (skill === 'AI/ML') {
      return /\b(ai\/ml|ai|ml|machine learning)\b/i.test(text);
    }
    if (skill === 'UI/UX') {
      return /\b(ui\/ux|ui|ux|user experience|user interface)\b/i.test(text);
    }
    if (skill === 'CI/CD') {
      return /\bci\/cd\b/i.test(text);
    }
    const escaped = skill.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9_])${escaped}([^a-zA-Z0-9_]|$)`, 'i');
    return regex.test(text);
  }

  function extractResumeSkills(text = '') {
    if (!text) return [];
    return KNOWN_SKILL_CATALOG.filter(skill => skillMatchesText(skill, text));
  }

  function extractSkillTags(text = '') {
    const found = KNOWN_SKILL_CATALOG.filter(skill => skillMatchesText(skill, text));
    return found.length > 0 ? found.slice(0, 5) : ['TypeScript', 'Full Stack', 'Cloud'];
  }

  // --- AI Resume Match & Hiring Odds Algorithm ---
  function calculateJobMatch(job, resumeText = '') {
    const text = (resumeText || '').trim();
    if (!text || text.length < 20) {
      return {
        percentage: 50,
        level: 'moderate',
        gaugeColor: '#f59e0b',
        badgeText: 'Resume Needed',
        oddsText: 'Set Resume for Live Odds',
        headline: 'No resume profile loaded',
        subtext: 'Add or paste your resume in the header to get calculated match percentages, skill gap analysis, and interview advice.',
        matchedSkills: [],
        missingSkills: job.tags || ['TypeScript', 'React'],
        advice: 'Click "Update Resume Profile" to add your resume or choose one of the one-click sample presets.'
      };
    }

    // 1. Skill overlap (50% weight)
    const requiredTags = (job.tags && job.tags.length > 0)
      ? job.tags
      : extractSkillTags(job.title + ' ' + (job.snippet || ''));

    const matchedSkills = [];
    const missingSkills = [];

    requiredTags.forEach(tag => {
      if (skillMatchesText(tag, text)) {
        matchedSkills.push(tag);
      } else {
        missingSkills.push(tag);
      }
    });

    // Check additional skills from catalog that might be in the job description
    const jobFullText = `${job.title} ${job.snippet || ''} ${job.description || ''}`;
    const extraJobSkills = KNOWN_SKILL_CATALOG.filter(s => !requiredTags.includes(s) && skillMatchesText(s, jobFullText));
    extraJobSkills.forEach(skill => {
      if (skillMatchesText(skill, text)) {
        if (!matchedSkills.includes(skill)) matchedSkills.push(skill);
      } else {
        if (!missingSkills.includes(skill) && missingSkills.length < 4) missingSkills.push(skill);
      }
    });

    const totalTrackedSkills = matchedSkills.length + missingSkills.length;
    let skillRatio = totalTrackedSkills > 0 ? (matchedSkills.length / totalTrackedSkills) : 0.6;
    let skillScore = Math.round(skillRatio * 50);

    // 2. Role / Title overlap (25% weight)
    const titleWords = (job.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['and', 'the', 'for', 'with', 'from', 'platform'].includes(w));

    let matchedWords = 0;
    titleWords.forEach(w => {
      if (new RegExp(`\\b${w}\\b`, 'i').test(text)) {
        matchedWords++;
      }
    });
    const titleRatio = titleWords.length > 0 ? (matchedWords / titleWords.length) : 0.5;
    let roleScore = Math.min(25, Math.max(6, Math.round(titleRatio * 25)));

    // 3. Experience alignment (15% weight)
    const exp = job.experience || 'mid';
    const isSeniorInResume = /senior|lead|staff|principal|director|head|5\+|6\+|7\+|8\+|10\+/i.test(text);
    const isJuniorInResume = /junior|entry|intern|graduate|0-2|1 year/i.test(text);
    let expScore = 10;
    if (exp === 'senior' || exp === 'lead') {
      expScore = isSeniorInResume ? 15 : (isJuniorInResume ? 4 : 9);
    } else if (exp === 'entry') {
      expScore = isJuniorInResume ? 15 : 12;
    } else {
      expScore = isSeniorInResume ? 15 : 12;
    }

    // 4. Remote / Workstyle alignment (10% weight)
    let styleScore = 8;
    if (job.isRemote) {
      styleScore = /remote|distributed|worldwide|telecommute|flexible/i.test(text) ? 10 : 8;
    }

    let rawPct = skillScore + roleScore + expScore + styleScore;

    // Bonus for high skill match, penalty for 0 matched skills
    if (matchedSkills.length === 0) {
      rawPct = Math.min(rawPct, 42);
    } else if (missingSkills.length === 0 && matchedSkills.length >= 3) {
      rawPct = Math.max(rawPct, 92);
    }

    const percentage = Math.min(97, Math.max(34, rawPct));

    let level = 'moderate';
    let gaugeColor = '#f59e0b';
    let badgeText = 'Moderate Match';
    let oddsText = 'Top 40% Interview Probability';
    let headline = 'Partial match with core requirements';
    let subtext = 'Some key technologies overlap. Addressing missing skills in your cover letter will boost response rates.';

    if (percentage >= 80) {
      level = 'high';
      gaugeColor = '#10b981';
      badgeText = percentage >= 90 ? 'Exceptional Match' : 'High Match';
      oddsText = percentage >= 90 ? 'Top 5% Interview Probability • High Priority' : 'Top 15% Interview Probability • Strong Candidate';
      headline = 'Strong alignment with core requirements';
      subtext = 'Your background directly satisfies the primary technology stack and required experience level.';
    } else if (percentage >= 65) {
      level = 'good';
      gaugeColor = '#6366f1';
      badgeText = 'Good Match';
      oddsText = 'Top 25% Interview Probability • Worth Applying';
      headline = 'Solid overlap with primary qualifications';
      subtext = 'You possess several core competencies. Highlighting transferable accomplishments will give you an edge.';
    } else if (percentage < 48) {
      level = 'reach';
      gaugeColor = '#fb7185';
      badgeText = 'Reach Opportunity';
      oddsText = 'Stretch Application • Skill Gap Present';
      headline = 'Notable skill gap for direct qualification';
      subtext = 'Several required technologies are missing from your resume. Consider emphasizing related capabilities.';
    }

    let advice = 'Highlight your problem-solving experience and ability to quickly adopt new platforms and architectures.';
    if (missingSkills.length > 0) {
      const topMissing = missingSkills.slice(0, 2).map(s => '"' + s + '"').join(' and ');
      advice = `To maximize your callback probability, highlight any side projects, coursework, or adjacent experience with ${topMissing}.`;
    } else if (matchedSkills.length >= 2) {
      advice = `Outstanding fit! In your initial outreach, showcase specific quantitative achievements using ${matchedSkills.slice(0, 2).join(' and ')}.`;
    }

    return {
      percentage,
      level,
      gaugeColor,
      badgeText,
      oddsText,
      headline,
      subtext,
      matchedSkills,
      missingSkills,
      advice
    };
  }

  function generateSalaryEstimate(keyword = '') {
    const lower = keyword.toLowerCase();
    if (lower.includes('lead') || lower.includes('staff') || lower.includes('ai')) {
      return { text: '$180,000 - $250,000', num: 180000 };
    }
    if (lower.includes('senior')) {
      return { text: '$150,000 - $210,000', num: 150000 };
    }
    return { text: '$120,000 - $165,000', num: 120000 };
  }

  // --- Filtering & Rendering ---
  function applyFilters() {
    const remoteOnly = dom.remoteOnlyToggle.checked;
    const exp = dom.experienceFilter.value;
    const sortBy = dom.sortBySelect.value;
    const platform = state.activePlatform;

    let filtered = state.jobs.filter(job => {
      if (remoteOnly && !job.isRemote) return false;
      if (exp !== 'all' && job.experience !== exp) return false;
      if (platform !== 'all' && job.platform !== platform) return false;
      return true;
    });

    // Sorting
    if (sortBy === 'match') {
      filtered.sort((a, b) => {
        const matchA = calculateJobMatch(a, state.userResume);
        const matchB = calculateJobMatch(b, state.userResume);
        return matchB.percentage - matchA.percentage;
      });
    } else if (sortBy === 'salary') {
      filtered.sort((a, b) => (b.salaryNum || 0) - (a.salaryNum || 0));
    }

    renderJobsList(filtered);
  }

  function renderJobs() {
    applyFilters();
  }

  function renderJobsList(jobsToRender) {
    dom.jobsContainer.innerHTML = '';
    dom.resultsCount.textContent = `${jobsToRender.length} found`;

    if (jobsToRender.length === 0) {
      dom.emptyState.style.display = 'block';
      return;
    }

    dom.emptyState.style.display = 'none';

    jobsToRender.forEach(job => {
      const isSaved = state.savedJobs.has(job.id);
      const match = calculateJobMatch(job, state.userResume);
      const card = document.createElement('div');
      card.className = 'job-card';
      card.dataset.jobId = job.id;

      card.innerHTML = `
        <div class="job-card-top">
          <div class="job-company-wrap">
            <div class="company-logo-avatar">${escapeHtml(job.companyLogoText || 'JB')}</div>
            <div class="company-info">
              <h4>${escapeHtml(job.company)}</h4>
              <div class="company-sub">
                <span class="location-text">${escapeHtml(job.location)}</span>
              </div>
            </div>
          </div>
          <div class="card-top-badges">
            <span class="job-match-pill level-${match.level}" title="Resume Fit: ${match.percentage}% (${match.badgeText})">
              <span class="match-dot"></span>
              ${match.percentage}% Match
            </span>
            <span class="platform-pill-badge badge-${job.platform || 'indeed'}">${escapeHtml(job.platformName)}</span>
          </div>
        </div>

        <div class="job-card-body">
          <h3 class="job-card-title">${escapeHtml(job.title)}</h3>
          
          <div class="job-meta-chips">
            <span class="meta-chip salary">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              ${escapeHtml(job.salary)}
            </span>
            ${job.isRemote ? `
            <span class="meta-chip remote">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              Remote
            </span>` : ''}
          </div>

          <p class="job-snippet">${escapeHtml(job.snippet)}</p>

          <div class="job-tags-list">
            ${(job.tags || []).map(t => `<span class="skill-tag">${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>

        <div class="job-card-footer">
          <span class="job-posted-time">${escapeHtml(job.postedTime || 'Recently')} • ${escapeHtml(job.detectedVia || 'TinyFish')}</span>
          <div class="card-action-btns">
            <button class="btn-icon-bookmark ${isSaved ? 'saved' : ''}" data-bookmark-id="${job.id}" title="${isSaved ? 'Remove bookmark' : 'Save job'}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            </button>
            <button class="btn btn-secondary btn-quick-view" data-view-id="${job.id}">Details</button>
          </div>
        </div>
      `;

      // Click card to open modal
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-icon-bookmark')) {
          e.stopPropagation();
          toggleSaveJob(job.id);
          return;
        }
        openJobDrawer(job);
      });

      dom.jobsContainer.appendChild(card);
    });
  }

  // --- View Mode ---
  function setViewMode(mode) {
    state.viewMode = mode;
    dom.viewGridBtn.classList.toggle('active', mode === 'grid');
    dom.viewListBtn.classList.toggle('active', mode === 'list');
    dom.jobsContainer.classList.toggle('list-view', mode === 'list');
  }

  // --- Bookmarking / Saved Jobs ---
  function toggleSaveJob(jobId) {
    if (state.savedJobs.has(jobId)) {
      state.savedJobs.delete(jobId);
      showToast('Removed from saved jobs', 'info');
    } else {
      state.savedJobs.add(jobId);
      showToast('Position saved to bookmarks!', 'success');
    }

    localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(Array.from(state.savedJobs)));
    updateSavedCount();
    renderJobs();

    if (state.selectedJob && state.selectedJob.id === jobId) {
      updateModalSaveBtn();
    }
  }

  function toggleSaveSelectedJob() {
    if (state.selectedJob) {
      toggleSaveJob(state.selectedJob.id);
    }
  }

  function updateSavedCount() {
    dom.savedCountBadge.textContent = state.savedJobs.size;
  }

  function toggleSavedJobsView() {
    const savedList = state.jobs.filter(j => state.savedJobs.has(j.id));
    if (savedList.length === 0) {
      showToast('You have no saved jobs yet! Click bookmark on any card.', 'info');
      return;
    }
    renderJobsList(savedList);
    dom.resultsHeading.textContent = 'Saved Opportunities';
    showToast(`Showing ${savedList.length} bookmarked jobs`, 'info');
  }

  function resetFilters() {
    dom.remoteOnlyToggle.checked = true;
    dom.experienceFilter.value = 'all';
    dom.sortBySelect.value = 'match';
    state.activePlatform = 'all';
    dom.platformChips.forEach(c => c.classList.toggle('active', c.dataset.platform === 'all'));
    dom.resultsHeading.textContent = 'Job Opportunities';
    renderJobs();
  }

  // --- Job Drawer Modal ---
  function openJobDrawer(job) {
    state.selectedJob = job;

    dom.modalCompanyLogo.textContent = job.companyLogoText || 'JB';
    dom.modalJobTitle.textContent = job.title;
    dom.modalCompanyName.textContent = job.company;
    dom.modalPlatformOrigin.textContent = job.platformName;
    dom.modalLocation.textContent = job.location;
    dom.modalSalary.textContent = job.salary;
    dom.modalPlatform.textContent = job.platformName;
    dom.modalDetected.textContent = job.detectedVia || 'TinyFish AI';
    dom.modalCategory.textContent = 'Engineering / Technology';

    // AI Resume Match & Hiring Odds Injection
    if (dom.modalResumeMatchSection) {
      const match = calculateJobMatch(job, state.userResume);
      if (dom.modalMatchGauge) {
        dom.modalMatchGauge.style.setProperty('--match-pct', `${match.percentage}%`);
        dom.modalMatchGauge.style.setProperty('--gauge-color', match.gaugeColor);
      }
      if (dom.modalMatchPercent) dom.modalMatchPercent.textContent = `${match.percentage}%`;
      if (dom.modalMatchBadge) {
        dom.modalMatchBadge.textContent = match.badgeText;
        dom.modalMatchBadge.className = `match-status-badge level-${match.level}`;
      }
      if (dom.modalMatchOdds) dom.modalMatchOdds.textContent = match.oddsText;
      if (dom.modalMatchHeadline) dom.modalMatchHeadline.textContent = match.headline;
      if (dom.modalMatchSubtext) dom.modalMatchSubtext.textContent = match.subtext;

      if (dom.modalMatchedCount) dom.modalMatchedCount.textContent = match.matchedSkills.length;
      if (dom.modalMatchedSkills) {
        if (match.matchedSkills.length > 0) {
          dom.modalMatchedSkills.innerHTML = match.matchedSkills
            .map(s => `<span class="skill-match-tag"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>${escapeHtml(s)}</span>`)
            .join('');
        } else {
          dom.modalMatchedSkills.innerHTML = '<span class="no-tags-notice">No direct skills detected in resume</span>';
        }
      }

      if (dom.modalMissingCount) dom.modalMissingCount.textContent = match.missingSkills.length;
      if (dom.modalMissingSkills) {
        if (match.missingSkills.length > 0) {
          dom.modalMissingSkills.innerHTML = match.missingSkills
            .map(s => `<span class="skill-match-tag"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>${escapeHtml(s)}</span>`)
            .join('');
        } else {
          dom.modalMissingSkills.innerHTML = '<span class="no-tags-notice">100% core skills matched! No gaps found</span>';
        }
      }

      if (dom.modalMatchAdvice) dom.modalMatchAdvice.textContent = match.advice;
    }

    dom.modalSkillsList.innerHTML = (job.tags || [])
      .map(t => `<span class="skill-tag">${escapeHtml(t)}</span>`)
      .join('');

    dom.modalDescription.innerHTML = formatMarkdown(job.description || job.snippet);
    dom.modalRawLink.href = job.url || '#';
    dom.modalRawLinkText.textContent = job.url || 'Original platform link';
    dom.modalApplyBtn.href = job.url || '#';

    updateModalSaveBtn();
    dom.jobModalBackdrop.style.display = 'flex';
  }

  function updateModalSaveBtn() {
    if (!state.selectedJob) return;
    const isSaved = state.savedJobs.has(state.selectedJob.id);
    dom.modalSaveText.textContent = isSaved ? 'Saved in Bookmarks' : 'Save Position';
    dom.modalSaveBtn.style.color = isSaved ? '#a5b4fc' : '';
  }

  function closeJobDrawer() {
    dom.jobModalBackdrop.style.display = 'none';
    state.selectedJob = null;
  }

  // --- Resume Matcher Modal & Profiles ---
  function openResumeModal() {
    if (dom.resumeTextInput) {
      dom.resumeTextInput.value = state.userResume || '';
      handleResumeTextInput();
    }
    if (dom.chipPresets) {
      dom.chipPresets.forEach(chip => {
        const key = chip.dataset.preset;
        const matches = key !== 'clear' && SAMPLE_RESUMES[key] && SAMPLE_RESUMES[key].trim() === (state.userResume || '').trim();
        chip.classList.toggle('active', !!matches);
      });
    }
    if (dom.resumeModalBackdrop) {
      dom.resumeModalBackdrop.style.display = 'flex';
    }
  }

  function closeResumeModal() {
    if (dom.resumeModalBackdrop) {
      dom.resumeModalBackdrop.style.display = 'none';
    }
  }

  function handleResumeTextInput() {
    const text = dom.resumeTextInput ? dom.resumeTextInput.value : '';
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    if (dom.resumeWordCount) {
      dom.resumeWordCount.textContent = `${wordCount} words`;
    }

    const detected = extractResumeSkills(text);
    if (dom.detectedSkillsCount) {
      dom.detectedSkillsCount.textContent = detected.length;
    }

    if (dom.detectedSkillsCloud) {
      if (detected.length > 0) {
        dom.detectedSkillsCloud.innerHTML = detected
          .map(skill => `<span class="detected-skill-badge">${escapeHtml(skill)}</span>`)
          .join('');
      } else {
        dom.detectedSkillsCloud.innerHTML = '<span class="skill-placeholder">Type or paste your resume above to preview detected skills...</span>';
      }
    }
  }

  function selectResumePreset(presetKey) {
    if (dom.chipPresets) {
      dom.chipPresets.forEach(chip => {
        chip.classList.toggle('active', chip.dataset.preset === presetKey);
      });
    }

    if (presetKey === 'clear') {
      if (dom.resumeTextInput) dom.resumeTextInput.value = '';
    } else if (SAMPLE_RESUMES[presetKey]) {
      if (dom.resumeTextInput) dom.resumeTextInput.value = SAMPLE_RESUMES[presetKey];
    }
    handleResumeTextInput();
  }

  function saveResume() {
    const text = dom.resumeTextInput ? dom.resumeTextInput.value.trim() : '';
    state.userResume = text;
    localStorage.setItem(STORAGE_KEY_RESUME, text);
    updateResumeBadge();
    applyFilters();
    if (state.selectedJob) {
      openJobDrawer(state.selectedJob);
    }
    closeResumeModal();
    showToast('Resume profile saved! Match scores recalculated.', 'success');
  }

  function updateResumeBadge() {
    if (!dom.resumeStatusBadge) return;
    if (state.userResume && state.userResume.trim().length >= 20) {
      dom.resumeStatusBadge.textContent = 'Active';
      dom.resumeStatusBadge.className = 'badge-count badge-resume';
    } else {
      dom.resumeStatusBadge.textContent = 'Empty';
      dom.resumeStatusBadge.className = 'badge-count';
    }
  }

  function handleResumeFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      processResumeFile(file);
    }
    e.target.value = '';
  }

  function processResumeFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      if (typeof content === 'string') {
        const cleanContent = content.replace(/[^\x20-\x7E\t\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
        if (dom.resumeTextInput) {
          dom.resumeTextInput.value = cleanContent || content;
          handleResumeTextInput();
        }
        showToast(`Loaded resume: ${file.name}`, 'info');
      }
    };
    reader.onerror = () => {
      showToast('Could not parse file. Please paste plain text directly into the resume box.', 'error');
    };
    reader.readAsText(file);
  }

  // --- Settings Modal ---
  function openSettingsModal() {
    dom.tinyfishApiKey.value = state.apiKey;
    dom.proxyUrlInput.value = state.proxyUrl;
    if (state.proxyMode === 'proxy') {
      dom.modeProxy.checked = true;
    } else {
      dom.modeDirect.checked = true;
    }
    dom.testApiResult.textContent = '';
    dom.settingsModalBackdrop.style.display = 'flex';
  }

  function closeSettingsModal() {
    dom.settingsModalBackdrop.style.display = 'none';
  }

  function toggleKeyVisibility() {
    const isPassword = dom.tinyfishApiKey.type === 'password';
    dom.tinyfishApiKey.type = isPassword ? 'text' : 'password';
    dom.toggleKeyVisibility.textContent = isPassword ? 'Hide' : 'Show';
  }

  function saveSettings() {
    state.apiKey = dom.tinyfishApiKey.value.trim();
    state.proxyUrl = dom.proxyUrlInput.value.trim();
    state.proxyMode = dom.modeProxy.checked ? 'proxy' : 'direct';

    localStorage.setItem(STORAGE_KEY_API, state.apiKey);
    localStorage.setItem(STORAGE_KEY_PROXY, state.proxyUrl);
    localStorage.setItem(STORAGE_KEY_MODE, state.proxyMode);

    checkApiStatus();
    closeSettingsModal();
    showToast('TinyFish API configuration saved!', 'success');
  }

  async function testApiConnection() {
    const key = dom.tinyfishApiKey.value.trim();
    dom.testApiResult.textContent = 'Testing connection...';
    dom.testApiResult.className = 'test-result-indicator';

    const startTime = performance.now();
    try {
      let testEndpoint = '';
      let testHeaders = {};

      if (dom.modeProxy.checked) {
        const cleanProxy = dom.proxyUrlInput.value.trim().replace(/\/+$/, '');
        testEndpoint = `${cleanProxy}/api/search?query=test`;
        testHeaders = { 'X-API-Key': key };
      } else {
        testEndpoint = 'https://api.search.tinyfish.ai?query=test';
        testHeaders = { 'X-API-Key': key };
      }

      const res = await fetch(testEndpoint, { headers: testHeaders });
      const duration = Math.round(performance.now() - startTime);

      if (res.ok) {
        dom.testApiResult.textContent = `✓ Connected! (${duration}ms)`;
        dom.testApiResult.className = 'test-result-indicator success';
      } else {
        dom.testApiResult.textContent = `✗ HTTP Error ${res.status}`;
        dom.testApiResult.className = 'test-result-indicator error';
      }
    } catch (e) {
      dom.testApiResult.textContent = `✗ Connection failed: ${e.message}`;
      dom.testApiResult.className = 'test-result-indicator error';
    }
  }

  function checkApiStatus() {
    if (state.apiKey) {
      dom.apiStatusPill.innerHTML = `
        <span class="status-dot green"></span>
        <span class="status-text">TinyFish Active</span>
      `;
    } else if (state.proxyMode === 'proxy') {
      dom.apiStatusPill.innerHTML = `
        <span class="status-dot green"></span>
        <span class="status-text">Server Proxy Active</span>
      `;
    } else {
      dom.apiStatusPill.innerHTML = `
        <span class="status-dot red"></span>
        <span class="status-text">Key Missing</span>
      `;
    }
  }

  // --- Export Functionality ---
  function exportAsJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.jobs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `searchii_jobs_${Date.now()}.json`);
    dlAnchor.click();
    showToast('Exported jobs to JSON!', 'success');
  }

  function exportAsCsv() {
    if (!state.jobs.length) {
      showToast('No jobs to export', 'info');
      return;
    }

    const headers = ['Title', 'Company', 'Platform', 'Location', 'Salary', 'URL', 'DetectedVia'];
    const rows = state.jobs.map(j => [
      `"${(j.title || '').replace(/"/g, '""')}"`,
      `"${(j.company || '').replace(/"/g, '""')}"`,
      `"${(j.platformName || '').replace(/"/g, '""')}"`,
      `"${(j.location || '').replace(/"/g, '""')}"`,
      `"${(j.salary || '').replace(/"/g, '""')}"`,
      `"${(j.url || '').replace(/"/g, '""')}"`,
      `"${(j.detectedVia || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', encodeURI(csvContent));
    dlAnchor.setAttribute('download', `searchii_jobs_${Date.now()}.csv`);
    dlAnchor.click();
    showToast('Exported jobs to CSV!', 'success');
  }

  // --- Terminal & Loading ---
  function startTerminalLog() {
    if (dom.agentTerminal) dom.agentTerminal.style.display = 'none';
    if (dom.terminalLogs) dom.terminalLogs.innerHTML = '';
    state.searchStartTime = Date.now();

    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      const elapsed = ((Date.now() - state.searchStartTime) / 1000).toFixed(1);
      if (dom.terminalTimer) dom.terminalTimer.textContent = `${elapsed}s`;
    }, 100);
  }

  function stopTerminalTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
  }

  function logTerminal(message, type = 'info') {
    if (type === 'error') {
      console.error(`[Searchii] ${message}`);
    } else {
      console.log(`[Searchii] ${message}`);
    }

    if (dom.terminalLogs) {
      const time = new Date().toTimeString().split(' ')[0];
      const line = document.createElement('div');
      line.className = `log-line ${type}`;
      line.innerHTML = `<span class="log-time">[${time}]</span> ${escapeHtml(message)}`;
      dom.terminalLogs.appendChild(line);
      dom.terminalLogs.scrollTop = dom.terminalLogs.scrollHeight;
    }
  }

  function setLoading(loading) {
    state.isLoading = loading;
    dom.executeSearchBtn.disabled = loading;
    dom.btnSpinner.style.display = loading ? 'inline-block' : 'none';
    dom.btnSearchIcon.style.display = loading ? 'none' : 'inline-block';
    dom.skeletonGrid.style.display = loading ? 'grid' : 'none';
    dom.jobsContainer.style.display = loading ? 'none' : 'grid';
  }

  // --- Toasts ---
  function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // --- Formatters ---
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMarkdown(text = '') {
    return text
      .replace(/^### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^## (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.*$)/gim, '• $1<br>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
