// ========== State Management ==========
const state = {
  articles: [],
  currentRoute: '',
  searchQuery: '',
  filterSource: '',
  readHistory: loadFromStorage('readHistory') || [],
  llmConfig: loadFromStorage('llmConfig') || {
    apiKey: '',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-20250514'
  }
};

// ========== Storage Helpers ==========
function loadFromStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load from storage:', e);
    return null;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
}

// ========== Data Loading ==========
async function loadArticles() {
  try {
    const response = await fetch('data/articles.json');
    if (!response.ok) throw new Error('Failed to load articles');
    const data = await response.json();
    state.articles = data.articles || [];
    return state.articles;
  } catch (e) {
    console.error('Error loading articles:', e);
    state.articles = [];
    return [];
  }
}

// ========== Router ==========
function getRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const [path, query] = hash.split('?');
  const params = new URLSearchParams(query || '');
  return { path, params };
}

function navigate(path) {
  window.location.hash = path;
}

async function router() {
  const { path, params } = getRoute();
  state.currentRoute = path;

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    const route = link.getAttribute('data-route');
    const isActive =
      (route === 'home' && path === '/') ||
      (route === 'archive' && path === '/archive') ||
      (route === 'settings' && path === '/settings');
    link.setAttribute('data-active', isActive);
  });

  // Route to appropriate view
  if (path === '/' || path === '') {
    await renderHome();
  } else if (path === '/archive') {
    await renderArchive();
  } else if (path === '/settings') {
    renderSettings();
  } else if (path.startsWith('/article/')) {
    const articleId = path.split('/article/')[1];
    await renderArticle(articleId);
  } else {
    renderNotFound();
  }

  // Scroll to top
  window.scrollTo(0, 0);
}

// ========== Render Functions ==========
async function renderHome() {
  const view = document.getElementById('view');
  const template = document.getElementById('tpl-home');
  view.innerHTML = '';
  view.appendChild(template.content.cloneNode(true));

  if (state.articles.length === 0) {
    await loadArticles();
  }

  // Get today's article (most recent unread, or most recent overall)
  const sortedArticles = [...state.articles].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );

  const unreadArticles = sortedArticles.filter(a =>
    !state.readHistory.includes(a.id)
  );

  const todayArticle = unreadArticles[0] || sortedArticles[0];

  if (todayArticle) {
    view.querySelector('[data-field="title"]').textContent = todayArticle.title;
    view.querySelector('[data-field="summary"]').textContent = todayArticle.summary;
    view.querySelector('[data-field="author"]').textContent = todayArticle.author;
    view.querySelector('[data-field="source"]').textContent = todayArticle.source;
    view.querySelector('[data-field="date"]').textContent = formatDate(todayArticle.date);

    const tagsContainer = view.querySelector('[data-field="tags"]');
    todayArticle.tags?.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = tag;
      tagsContainer.appendChild(span);
    });

    const readBtn = view.querySelector('[data-action="read"]');
    readBtn.href = `#/article/${todayArticle.id}`;
  }

  // Render recent articles grid (exclude today's article)
  const recentArticles = sortedArticles
    .filter(a => a.id !== todayArticle?.id)
    .slice(0, 6);

  const gridContainer = view.querySelector('[data-field="recent-list"]');
  recentArticles.forEach(article => {
    gridContainer.appendChild(createArticleCard(article));
  });
}

async function renderArticle(articleId) {
  const view = document.getElementById('view');
  const template = document.getElementById('tpl-article');
  view.innerHTML = '';
  view.appendChild(template.content.cloneNode(true));

  if (state.articles.length === 0) {
    await loadArticles();
  }

  const article = state.articles.find(a => a.id === articleId);

  if (!article) {
    view.innerHTML = '<div class="not-found"><h1>文章未找到</h1><p><a href="#/">返回首页</a></p></div>';
    return;
  }

  // Mark as read
  if (!state.readHistory.includes(article.id)) {
    state.readHistory.push(article.id);
    saveToStorage('readHistory', state.readHistory);
  }

  // Populate article details
  view.querySelector('[data-field="title"]').textContent = article.title;
  view.querySelector('[data-field="otitle"]').textContent = article.original_title || '';
  view.querySelector('[data-field="summary"]').textContent = article.summary;
  view.querySelector('[data-field="author"]').textContent = article.author;
  view.querySelector('[data-field="source"]').textContent = article.source;
  view.querySelector('[data-field="date"]').textContent = formatDate(article.date);

  const urlLink = view.querySelector('[data-field="url-link"]');
  urlLink.href = article.url;

  const tagsContainer = view.querySelector('[data-field="tags"]');
  article.tags?.forEach(tag => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = tag;
    tagsContainer.appendChild(span);
  });

  // Setup analysis button
  const genBtn = view.querySelector('#gen-analysis');
  const analysisBody = view.querySelector('#analysis-body');

  genBtn.addEventListener('click', async () => {
    if (!state.llmConfig.apiKey) {
      analysisBody.innerHTML = '<p class="analysis-empty">请先在<a href="#/settings">设置</a>中配置 API key</p>';
      return;
    }

    genBtn.disabled = true;
    genBtn.textContent = '生成中...';
    analysisBody.innerHTML = '<p class="analysis-empty">正在分析文章，请稍候...</p>';

    try {
      const analysis = await generateAnalysis(article, state.llmConfig);
      renderAnalysis(analysisBody, analysis);
    } catch (error) {
      analysisBody.innerHTML = `<p class="analysis-empty" style="color: var(--accent);">${error.message}</p>`;
    } finally {
      genBtn.disabled = false;
      genBtn.textContent = '重新生成分析';
    }
  });
}

async function renderArchive() {
  const view = document.getElementById('view');
  const template = document.getElementById('tpl-archive');
  view.innerHTML = '';
  view.appendChild(template.content.cloneNode(true));

  if (state.articles.length === 0) {
    await loadArticles();
  }

  // Render source filter chips
  const sources = [...new Set(state.articles.map(a => a.source))].sort();
  const chipsContainer = view.querySelector('[data-field="chips"]');

  const allChip = document.createElement('button');
  allChip.className = 'chip';
  allChip.textContent = '全部';
  allChip.setAttribute('data-active', !state.filterSource);
  allChip.addEventListener('click', () => {
    state.filterSource = '';
    filterAndRenderList();
  });
  chipsContainer.appendChild(allChip);

  sources.forEach(source => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = source;
    chip.setAttribute('data-active', state.filterSource === source);
    chip.addEventListener('click', () => {
      state.filterSource = source;
      filterAndRenderList();
    });
    chipsContainer.appendChild(chip);
  });

  // Setup search
  const searchInput = view.querySelector('#search-input');
  searchInput.value = state.searchQuery;
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    filterAndRenderList();
  });

  // Initial render
  filterAndRenderList();

  function filterAndRenderList() {
    const query = state.searchQuery.toLowerCase();
    const source = state.filterSource;

    const filtered = state.articles.filter(a => {
      const matchQuery = !query ||
        a.title.toLowerCase().includes(query) ||
        a.author.toLowerCase().includes(query) ||
        a.summary.toLowerCase().includes(query);
      const matchSource = !source || a.source === source;
      return matchQuery && matchSource;
    });

    const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    view.querySelector('[data-field="count"]').textContent =
      `共 ${sorted.length} 篇文章`;

    const listContainer = view.querySelector('[data-field="list"]');
    listContainer.innerHTML = '';

    if (sorted.length === 0) {
      listContainer.innerHTML = '<p class="analysis-empty">没有找到匹配的文章</p>';
      return;
    }

    sorted.forEach(article => {
      listContainer.appendChild(createArticleCard(article, true));
    });

    // Update chip active states
    chipsContainer.querySelectorAll('.chip').forEach(chip => {
      const isActive = chip.textContent === '全部'
        ? !state.filterSource
        : chip.textContent === state.filterSource;
      chip.setAttribute('data-active', isActive);
    });
  }
}

function renderSettings() {
  const view = document.getElementById('view');
  const template = document.getElementById('tpl-settings');
  view.innerHTML = '';
  view.appendChild(template.content.cloneNode(true));

  const form = view.querySelector('#settings-form');
  const apiKeyInput = view.querySelector('#api-key');
  const baseUrlInput = view.querySelector('#base-url');
  const modelInput = view.querySelector('#model');
  const statusP = view.querySelector('#form-status');

  // Populate current values
  apiKeyInput.value = state.llmConfig.apiKey || '';
  baseUrlInput.value = state.llmConfig.baseUrl || 'https://api.anthropic.com';
  modelInput.value = state.llmConfig.model || 'claude-sonnet-4-20250514';

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    state.llmConfig = {
      apiKey: apiKeyInput.value.trim(),
      baseUrl: baseUrlInput.value.trim(),
      model: modelInput.value.trim()
    };

    saveToStorage('llmConfig', state.llmConfig);

    statusP.textContent = '设置已保存';
    statusP.style.color = 'var(--accent)';

    setTimeout(() => {
      statusP.textContent = '';
    }, 3000);
  });
}

function renderNotFound() {
  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="not-found" style="text-align: center; padding: 4rem 2rem;">
      <h1>页面未找到</h1>
      <p><a href="#/">返回首页</a></p>
    </div>
  `;
}

// ========== Component Helpers ==========
function createArticleCard(article, isList = false) {
  const card = document.createElement('a');
  card.className = 'article-card';
  card.href = `#/article/${article.id}`;

  const isRead = state.readHistory.includes(article.id);

  card.innerHTML = `
    <h3 class="article-card-title">
      ${isRead ? '<span style="color: var(--text-tertiary);">✓ </span>' : ''}
      ${article.title}
    </h3>
    <div class="article-card-meta">
      <span>${article.author}</span>
      <span class="meta-dot">·</span>
      <span>${article.source}</span>
      <span class="meta-dot">·</span>
      <time>${formatDate(article.date)}</time>
    </div>
    <p class="article-card-summary">${article.summary}</p>
    ${article.tags ? `
      <div class="article-card-tags">
        ${article.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    ` : ''}
  `;

  return card;
}

function renderAnalysis(container, analysis) {
  container.innerHTML = `
    <div class="analysis-section">
      <h3>1. 核心论点</h3>
      <p>${analysis.coreArgument}</p>
    </div>
    <div class="analysis-section">
      <h3>2. 框架与方法</h3>
      <p>${analysis.frameworkMethod}</p>
    </div>
    <div class="analysis-section">
      <h3>3. 数据与证据</h3>
      <p>${analysis.dataEvidence}</p>
    </div>
    <div class="analysis-section">
      <h3>4. 洞见与盲点</h3>
      <p>${analysis.insightsBlindspots}</p>
    </div>
    <div class="analysis-section">
      <h3>5. 个人启发</h3>
      <p>${analysis.personalInspiration}</p>
    </div>
  `;
}

// ========== LLM Integration ==========
async function generateAnalysis(article, config) {
  const prompt = `你是一位资深金融研究分析师。请对以下文章进行系统性分析，从五个维度拆解：

文章标题：${article.title}
作者：${article.author}
来源：${article.source}
摘要：${article.summary}

请生成以下五部分分析（每部分 2-3 句话）：

1. **核心论点**：这篇文章的主要观点和结论是什么？
2. **框架与方法**：作者使用了什么分析框架或方法论？
3. **数据与证据**：关键数据点和支撑证据是什么？
4. **洞见与盲点**：有哪些独特洞见？可能忽略了什么？
5. **个人启发**：对投资决策有什么实际启发？

请用 JSON 格式返回，包含以下字段：
{
  "coreArgument": "...",
  "frameworkMethod": "...",
  "dataEvidence": "...",
  "insightsBlindspots": "...",
  "personalInspiration": "..."
}`;

  const response = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API 请求失败: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  try {
    return JSON.parse(content);
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const match = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error('无法解析 AI 返回的分析结果');
  }
}

// ========== Utility Functions ==========
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// ========== Initialize ==========
window.addEventListener('DOMContentLoaded', async () => {
  await loadArticles();
  router();
});

window.addEventListener('hashchange', router);
