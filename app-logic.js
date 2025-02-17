let currentApp = null;
const appCache = new Map();
let currentBannerIndex = 0;
let bannerData = null;
let bannerInterval = null;

async function loadBannerData() {
  const response = await fetch('./banner.json');
  bannerData = await response.json();
  initializeBanner();
}

function initializeBanner() {
  const bannerSection = document.querySelector('.banner-section');
  bannerSection.innerHTML = bannerData.banners.map((banner, index) => `
    <div class="banner ${index === 0 ? 'active' : ''}" 
         style="background-image: url('${banner.background}')">
      <div class="banner-content" style="color: ${banner.textColor}">
        <h2>${banner.title}</h2>
        <p>${banner.subtitle}</p>
        <div class="banner-actions">
          ${banner.actions.map(action => `
            <button class="banner-btn" 
                    style="background-color: ${action.color}"
                    onclick="${action.script}">
              ${action.label}
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');

  startBannerRotation();
}

function startBannerRotation() {
  if (bannerInterval) {
    clearInterval(bannerInterval);
  }
  
  bannerInterval = setInterval(() => {
    const banners = document.querySelectorAll('.banner');
    banners[currentBannerIndex].classList.remove('active');
    currentBannerIndex = (currentBannerIndex + 1) % banners.length;
    banners[currentBannerIndex].classList.add('active');
  }, bannerData.rotationInterval);
}

const categories = ['All', 'Photography', 'Productivity', 'Games', 'Health'];

async function loadAppDetails(appId) {
  if (appCache.has(appId)) {
    return appCache.get(appId);
  }
  try {
    const response = await fetch(`./apps/${appId}.json`);
    if (!response.ok) throw new Error('App details not found');
    const data = await response.json();
    appCache.set(appId, data);
    return data;
  } catch (err) {
    console.error(`Error loading app ${appId}:`, err);
    return null;
  }
}

async function renderApps(filteredApps) {
  const container = document.getElementById('appGrid');
  const noResults = document.getElementById('noResults');
  
  if (filteredApps.length === 0) {
    noResults.style.display = 'block';
    container.innerHTML = '';
    return;
  }
  
  noResults.style.display = 'none';
  
  const appDetails = await Promise.all(
    filteredApps.map(app => loadAppDetails(app.id))
  );
  
  const validApps = appDetails.filter(app => app !== null);
  
  container.innerHTML = validApps.map(app => `
    <div class="app-card" data-app-id="${app.id}">
      <div class="app-icon" style="background-image: url('${app.icon}')"></div>
      <h3>${app.name}</h3>
      <p class="developer">${app.developer}</p>
     
      <div class="action-buttons">
        ${app.actions.slice(0, 2).map(action => `
          <button class="action-btn" 
                  style="background-color: ${action.color}"
                  data-app-id="${app.id}"
                  data-action-label="${action.label}">
            ${action.label}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
}

async function showAppDetails(appId) {
  try {
    currentApp = await loadAppDetails(appId);
    renderAppModal();
    document.getElementById('appModal').style.display = 'block';
  } catch (err) {
    console.error('Error loading app details:', err);
  }
}

function renderAppModal() {
  const modal = document.getElementById('appModal');
  
  modal.querySelector('.header-icon').style.backgroundImage = `url('${currentApp.icon}')`;
  modal.querySelector('.app-title').textContent = currentApp.name;
  modal.querySelector('.app-developer').textContent = currentApp.developer;
  modal.querySelector('.app-description').innerHTML = `<h2>Description</h2><p>${currentApp.description}</p>`;
  
  renderModalActions();
  renderScreenshots(modal.querySelector('.screenshots-container'));
  renderTechnicalDetails(modal.querySelector('.technical-details'));
}

function renderModalActions() {
  const container = document.querySelector('.header-actions');
  container.innerHTML = `
    <div class="modal-actions">
      ${currentApp.actions.map(action => `
        <button class="action-btn" 
                style="background-color: ${action.color}"
                data-action-label="${action.label}">
          ${action.label}
        </button>
      `).join('')}
    </div>
  `;
}

function renderScreenshots(container) {
  container.innerHTML = currentApp.screenshots.map(img => `
    <div class="screenshot-item" style="background-image: url(${img})"></div>
  `).join('');
}

function renderTechnicalDetails(container) {
  container.innerHTML = `
    <div class="detail-card">
      <h3>App Size</h3>
      <p>${currentApp.technicalDetails.size}</p>
    </div>
    <div class="detail-card">
      <h3>Last Updated</h3>
      <p>${currentApp.technicalDetails.updated}</p>
    </div>
  `;
}

function filterApps(category = 'All', searchQuery = '') {
  let filtered = apps;
  
  if (category !== 'All') {
    filtered = filtered.filter(app => app.category === category);
  }
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(app => 
      app.name.toLowerCase().includes(query) ||
      app.developer.toLowerCase().includes(query)
    );
  }
  
  renderApps(filtered);
}

function renderCategories() {
  const container = document.getElementById('categoryTabs');
  container.innerHTML = categories.map(cat => `
    <button class="category-tab ${cat === 'All' ? 'active' : ''}" 
            data-category="${cat}">
      ${cat}
    </button>
  `).join('');
}

document.addEventListener('click', async e => {
  if (e.target.classList.contains('action-btn')) {
    const appId = e.target.dataset.appId;
    const actionLabel = e.target.dataset.actionLabel;
    const app = appId ? await loadAppDetails(appId) : currentApp;
    const action = app.actions.find(a => a.label === actionLabel);
    
    if (action) {
      try {
        const script = new Function(action.script);
        await script();
      } catch (err) {
        console.error('Action failed:', err);
      }
    }
  }
  
  if (e.target.classList.contains('category-tab')) {
    document.querySelectorAll('.category-tab').forEach(btn => 
      btn.classList.remove('active'));
    e.target.classList.add('active');
    filterApps(e.target.dataset.category, 
      document.getElementById('searchInput').value);
  }
  
  if (e.target.closest('.app-card')) {
    const appId = e.target.closest('.app-card').querySelector('.action-btn').dataset.appId;
    showAppDetails(parseInt(appId));
  }
  
  if (e.target.classList.contains('close-btn') || e.target.classList.contains('modal-overlay')) {
    document.getElementById('appModal').style.display = 'none';
  }
});

document.getElementById('searchInput').addEventListener('input', e => {
  //const activeCategory = document.querySelector('.category-tab.active').dataset.category;
  filterApps(categories.ALL, e.target.value);
});

// Initialize the banner
loadBannerData();

// Initialize apps
filterApps();
