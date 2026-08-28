/**
 * SADAK-SURAKSHA AI Frontend Client Controller
 * Multimodal AI Road Hazard Detection & Infrastructure Maintenance Prioritization
 * Multi-State Support (Karnataka, Maharashtra, Delhi NCR, Tamil Nadu, Telangana)
 * Currency: ₹ INR (Indian Rupees)
 */

// Global State
let allHazards = [];
let allRoads = [];
let allWorkOrders = [];
let currentStateFilter = 'Karnataka';
let currentCityFilter = 'all';
let currentCategoryFilter = 'all';
let currentSearchQuery = '';
let selectedHazard = null;
let userApiKey = localStorage.getItem('SADAKSURAKSHA_GEMINI_KEY') || localStorage.getItem('SADAKSUKHA_GEMINI_KEY') || localStorage.getItem('AERO_GEMINI_KEY') || '';

const CITY_OPTIONS_BY_STATE = {
  all: ["All Cities"],
  Karnataka: ["All Cities", "Bengaluru", "Mysuru", "Hubballi", "Mangaluru"],
  Maharashtra: ["All Cities", "Mumbai", "Pune", "Nagpur", "Nashik", "Thane"],
  "Delhi NCR": ["All Cities", "New Delhi", "Gurugram", "Noida", "Faridabad", "Ghaziabad"],
  "Tamil Nadu": ["All Cities", "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"],
  Telangana: ["All Cities", "Hyderabad", "Warangal", "Nizamabad"],
  "Uttar Pradesh": ["All Cities", "Agra", "Lucknow", "Kanpur", "Varanasi", "Noida"],
  "West Bengal": ["All Cities", "Kolkata", "Howrah", "Siliguri", "Durgapur"],
  Gujarat: ["All Cities", "Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  Rajasthan: ["All Cities", "Jaipur", "Jodhpur", "Udaipur", "Kota"],
  Kerala: ["All Cities", "Kochi", "Thiruvananthapuram", "Kozhikode"],
  "Punjab & Haryana": ["All Cities", "Chandigarh", "Ludhiana", "Amritsar", "Gurugram"],
  "Madhya Pradesh": ["All Cities", "Indore", "Bhopal", "Gwalior", "Jabalpur"],
  Odisha: ["All Cities", "Bhubaneswar", "Cuttack", "Rourkela"],
  Assam: ["All Cities", "Guwahati", "Dibrugarh", "Silchar"],
  "Jammu & Kashmir": ["All Cities", "Srinagar", "Jammu", "Anantnag"],
  "Andhra Pradesh": ["All Cities", "Visakhapatnam", "Vijayawada", "Guntur"],
  Goa: ["All Cities", "Panaji", "Margao", "Vasco da Gama"]
};

// Indian Geographic Center Coordinates by State
const STATE_VIEWPORTS = {
  all: { center: [22.5937, 78.9629], zoom: 5 },
  Karnataka: { center: [12.9550, 77.6400], zoom: 12 },
  Maharashtra: { center: [19.0000, 73.0000], zoom: 10 },
  "Delhi NCR": { center: [28.5672, 77.1800], zoom: 11 },
  "Tamil Nadu": { center: [13.0100, 80.2400], zoom: 12 },
  Telangana: { center: [17.4200, 78.3600], zoom: 12 },
  "Uttar Pradesh": { center: [27.1800, 78.0100], zoom: 9 },
  "West Bengal": { center: [22.5400, 88.3900], zoom: 12 },
  Gujarat: { center: [23.0300, 72.5300], zoom: 11 },
  Rajasthan: { center: [26.8900, 75.8000], zoom: 11 },
  Kerala: { center: [9.9700, 76.3200], zoom: 11 },
  "Punjab & Haryana": { center: [30.7500, 76.7800], zoom: 11 },
  "Madhya Pradesh": { center: [22.7500, 75.8900], zoom: 11 },
  Odisha: { center: [20.2700, 85.8000], zoom: 11 },
  Assam: { center: [26.1600, 91.7700], zoom: 11 },
  "Jammu & Kashmir": { center: [34.0600, 74.8300], zoom: 11 },
  "Andhra Pradesh": { center: [17.7200, 83.3200], zoom: 11 },
  Goa: { center: [15.5000, 73.8350], zoom: 11 }
};

// Map instances
let gisMap = null;
let gisMarkerLayer = null;
let gisClusterLayer = null;
let patrolMap = null;
let patrolCarMarker = null;
let patrolWs = null;
let isPatrolRunning = false;

// Chart instances
let studioImuChart = null;
let modalImuChart = null;
let hazardDistChart = null;
let roadPciChart = null;

// Synthetic High-Definition Road Visual Generator (SVG Data URIs)
const SCENARIO_IMAGES = {
  pothole: generateRoadImageSVG('pothole'),
  alligator: generateRoadImageSVG('alligator'),
  shadow_fp: generateRoadImageSVG('shadow_fp'),
  submerged: generateRoadImageSVG('submerged'),
  guardrail: generateRoadImageSVG('guardrail'),
  sign: generateRoadImageSVG('sign'),
  debris: generateRoadImageSVG('debris')
};

// Helper: Format Indian Rupees
function formatINR(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹ 0';
  return '₹ ' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();
  checkAuthStatus();
  updateApiKeyDisplay();
  initSessionIdentity();
  
  // Set default state selector in UI
  const stateSelect = document.getElementById('state-selector');
  if (stateSelect) stateSelect.value = currentStateFilter;

  // Initialize Maps
  initGisMap();
  initPatrolMap();

  // Initialize Charts
  initCharts();

  // Fetch initial data
  await refreshAllData();

  // Initialize Studio with default scenario
  loadStudioScenario('pothole');
});

// ==========================================
// ROLE GATEWAY & AUTHENTICATION
// ==========================================
function checkAuthStatus() {
  const isAuth = sessionStorage.getItem('sadaksuraksha_auth') === 'true';
  const overlay = document.getElementById('role-gateway-overlay');
  if (overlay) {
    if (isAuth) {
      overlay.classList.add('hidden');
    } else {
      overlay.classList.remove('hidden');
    }
  }
}

function fillOverlayDemo(type) {
  const deptElem = document.getElementById('overlay-dept');
  const idElem = document.getElementById('overlay-officer-id');
  const pinElem = document.getElementById('overlay-officer-pin');
  const errElem = document.getElementById('overlay-login-error');
  if (errElem) errElem.classList.add('hidden');

  if (type === 'nhai') {
    if (deptElem) deptElem.value = 'nhai';
    if (idElem) idElem.value = 'NHAI-CHIEF-019';
    if (pinElem) pinElem.value = 'NHAI2026';
  } else {
    if (deptElem) deptElem.value = 'pwd_ka';
    if (idElem) idElem.value = 'PWD-KA-INSPECT-44';
    if (pinElem) pinElem.value = 'PWD123';
  }
}

function handleOverlayGovLogin(e) {
  if (e) e.preventDefault();
  const dept = document.getElementById('overlay-dept')?.value || 'nhai';
  const officerId = document.getElementById('overlay-officer-id')?.value.trim();
  const pin = document.getElementById('overlay-officer-pin')?.value.trim();
  const errorElem = document.getElementById('overlay-login-error');

  if (!officerId || !pin) {
    if (errorElem) {
      errorElem.textContent = '❌ Please enter both Officer Badge ID and Security PIN.';
      errorElem.classList.remove('hidden');
    }
    return;
  }

  // Save session credentials
  sessionStorage.setItem('sadaksuraksha_auth', 'true');
  sessionStorage.setItem('sadaksuraksha_role', 'gov_agent');
  sessionStorage.setItem('sadaksuraksha_dept', dept);
  sessionStorage.setItem('sadaksuraksha_officer', officerId);

  // Update header badge text
  const deptText = document.getElementById('header-dept-text');
  if (deptText) {
    deptText.textContent = `${officerId} • ${dept.toUpperCase()}`;
  }

  // Hide overlay
  const overlay = document.getElementById('role-gateway-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }

  // Ensure Leaflet map sizes correctly
  if (gisMap) {
    setTimeout(() => gisMap.invalidateSize(), 200);
  }
}

function handleLogout() {
  sessionStorage.removeItem('sadaksuraksha_auth');
  sessionStorage.removeItem('sadaksuraksha_role');
  sessionStorage.removeItem('sadaksuraksha_dept');
  sessionStorage.removeItem('sadaksuraksha_officer');
  
  const overlay = document.getElementById('role-gateway-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    window.location.href = '/';
  }
}

function initSessionIdentity() {
  const officer = sessionStorage.getItem('sadaksuraksha_officer');
  const dept = sessionStorage.getItem('sadaksuraksha_dept');
  const deptText = document.getElementById('header-dept-text');
  if (deptText && officer) {
    deptText.textContent = `${officer} • ${(dept || 'NHAI').toUpperCase()}`;
  }
}

function updateApiKeyDisplay() {
  const btn = document.getElementById('apiKeyBtnText');
  if (userApiKey) {
    btn.textContent = 'Key Saved ✓';
    btn.classList.add('text-emerald-400');
  } else {
    btn.textContent = 'Gemini Key';
    btn.classList.remove('text-emerald-400');
  }
}

// ==========================================
// DATA FETCHING & SYNCHRONIZATION
// ==========================================
async function refreshAllData() {
  try {
    const [hazardsRes, roadsRes, workOrdersRes, analyticsRes] = await Promise.all([
      fetch('/api/hazards'),
      fetch('/api/roads'),
      fetch('/api/work-orders'),
      fetch(`/api/analytics/summary?state=${encodeURIComponent(currentStateFilter)}`)
    ]);

    allHazards = await hazardsRes.json();
    allRoads = await roadsRes.json();
    allWorkOrders = await workOrdersRes.json();
    const analytics = await analyticsRes.json();

    applyStateAndSearchFilters();
    updateAnalyticsCharts(analytics, allRoads);
    lucide.createIcons();
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

// ==========================================
// STATE-WISE & CITY-WISE FILTERING
// ==========================================
function populateCityDropdown(selectedState) {
  const citySelect = document.getElementById('city-selector');
  if (!citySelect) return;
  const cities = CITY_OPTIONS_BY_STATE[selectedState] || ["All Cities"];
  citySelect.innerHTML = cities.map(c => `<option value="${c}">${c === 'All Cities' ? 'All Cities' : c}</option>`).join('');
  currentCityFilter = 'all';
}

function handleCityChange(selectedCity) {
  currentCityFilter = selectedCity;
  applyStateAndSearchFilters();
}

function handleStateChange(selectedState) {
  currentStateFilter = selectedState;
  populateCityDropdown(selectedState);

  // Smoothly pan map to selected State viewport
  const vp = STATE_VIEWPORTS[selectedState] || STATE_VIEWPORTS.Karnataka;
  if (gisMap) {
    gisMap.flyTo(vp.center, vp.zoom, { duration: 1.4 });
  }

  // Refilter and update view
  applyStateAndSearchFilters();

  // Refresh analytics for selected state
  fetch(`/api/analytics/summary?state=${encodeURIComponent(selectedState)}`)
    .then(r => r.json())
    .then(analytics => {
      updateKpiBar(analytics);
      updateAnalyticsCharts(analytics, allRoads);
    });
}

function handleSearchFilter(query) {
  currentSearchQuery = query.toLowerCase().trim();
  applyStateAndSearchFilters();
}

function filterMap(category) {
  currentCategoryFilter = category;
  document.querySelectorAll('.filter-pill, .feed-filter-btn').forEach(btn => btn.classList.remove('active'));
  const target = window.event ? (window.event.currentTarget || window.event.target) : null;
  if (target) target.classList.add('active');
  applyStateAndSearchFilters();
}


function getFilteredHazards() {
  return allHazards.filter(h => {
    // 1. State Filter
    const matchesState = (currentStateFilter === 'all') || (h.state && h.state.toLowerCase() === currentStateFilter.toLowerCase());
    
    // 2. City Filter
    let matchesCity = true;
    if (currentCityFilter && currentCityFilter !== 'all' && currentCityFilter !== 'All Cities') {
      matchesCity = (h.city && h.city.toLowerCase() === currentCityFilter.toLowerCase());
    }

    // 3. Category Filter
    let matchesCategory = true;
    if (currentCategoryFilter === 'critical') {
      matchesCategory = (h.severity === 'critical' && !h.fusion.is_false_positive);
    } else if (currentCategoryFilter === 'pothole') {
      matchesCategory = (h.hazard_type === 'pothole' && !h.fusion.is_false_positive);
    } else if (currentCategoryFilter === 'hospital') {
      matchesCategory = (h.road_class === 'hospital_corridor' && !h.fusion.is_false_positive);
    }

    // 4. Search Query Filter (State, City, Road Name, Title, Type)
    let matchesSearch = true;
    if (currentSearchQuery) {
      const haystack = `${h.id} ${h.title} ${h.state} ${h.city} ${h.road_name} ${h.address} ${h.hazard_type}`.toLowerCase();
      matchesSearch = haystack.includes(currentSearchQuery);
    }

    return matchesState && matchesCity && matchesCategory && matchesSearch;
  });
}


function applyStateAndSearchFilters() {
  const filteredHazards = getFilteredHazards();
  
  const filteredWorkOrders = (currentStateFilter === 'all')
    ? allWorkOrders
    : allWorkOrders.filter(wo => wo.state && wo.state.toLowerCase() === currentStateFilter.toLowerCase());

  renderIncidentFeed(filteredHazards);
  renderMapMarkers(filteredHazards);
  renderWorkOrders(filteredWorkOrders);

  // Recalculate quick KPI values for current filtered subset
  const actionable = filteredHazards.filter(h => !h.fusion.is_false_positive);
  const critical = actionable.filter(h => h.severity === 'critical').length;
  const fp = filteredHazards.filter(h => h.fusion.is_false_positive).length;
  const totalCost = actionable.reduce((acc, h) => acc + h.priority.estimated_repair_cost_usd, 0);

  document.getElementById('kpi-critical').textContent = critical;
  document.getElementById('kpi-total').textContent = actionable.length;
  document.getElementById('kpi-fp').textContent = fp;
  document.getElementById('kpi-work-orders').textContent = filteredWorkOrders.length;
  document.getElementById('kpi-cost').textContent = formatINR(totalCost);
}

function updateKpiBar(analytics) {
  document.getElementById('kpi-critical').textContent = analytics.critical_hazards;
  document.getElementById('kpi-total').textContent = analytics.total_active_hazards;
  document.getElementById('kpi-fp').textContent = analytics.false_positives_filtered;
  document.getElementById('kpi-pci').innerHTML = `${analytics.average_network_pci} <span class="text-xs text-slate-400">/100</span>`;
  document.getElementById('kpi-work-orders').textContent = analytics.active_work_orders_count;
  document.getElementById('kpi-cost').textContent = formatINR(analytics.total_estimated_repair_cost_usd);
}

// ==========================================
// GIS MAP MODULE (GOOGLE MAPS INTEGRATION)
// ==========================================
let currentGoogleMapLayer = null;
const GOOGLE_MAP_TILE_LAYERS = {
  roadmap: {
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: 'Map data &copy; <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Google Maps</a>',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20
  },
  satellite: {
    url: 'https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',
    attribution: 'Imagery &copy; <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Google</a>',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20
  },
  terrain: {
    url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    attribution: 'Map data &copy; <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Google Maps</a>',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20
  },
  traffic: {
    url: 'https://{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
    attribution: 'Traffic data &copy; <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Google Maps</a>',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20
  }
};

function setGoogleMapLayer(layerType) {
  if (!gisMap) return;
  const cfg = GOOGLE_MAP_TILE_LAYERS[layerType] || GOOGLE_MAP_TILE_LAYERS.roadmap;
  if (currentGoogleMapLayer) {
    gisMap.removeLayer(currentGoogleMapLayer);
  }
  currentGoogleMapLayer = L.tileLayer(cfg.url, {
    attribution: cfg.attribution,
    maxZoom: cfg.maxZoom || 20,
    subdomains: cfg.subdomains || ['mt0', 'mt1', 'mt2', 'mt3']
  }).addTo(gisMap);

  if (gisClusterLayer && gisMap.hasLayer(gisClusterLayer)) {
    gisClusterLayer.bringToFront();
  }
  if (gisMarkerLayer && gisMap.hasLayer(gisMarkerLayer)) {
    gisMarkerLayer.bringToFront();
  }
}
window.setGoogleMapLayer = setGoogleMapLayer;

function initGisMap() {
  const mapElem = document.getElementById('gis-map');
  if (!mapElem) return;

  const defaultVp = STATE_VIEWPORTS[currentStateFilter] || STATE_VIEWPORTS.Karnataka;

  gisMap = L.map('gis-map', {
    center: defaultVp.center,
    zoom: defaultVp.zoom,
    zoomControl: false
  });

  L.control.zoom({ position: 'bottomright' }).addTo(gisMap);

  // Initialize with Google Maps Roadmap layer
  setGoogleMapLayer('roadmap');

  gisMarkerLayer = L.layerGroup().addTo(gisMap);
  gisClusterLayer = L.layerGroup().addTo(gisMap);

  const toggleClusters = document.getElementById('toggle-clusters');
  if (toggleClusters) {
    toggleClusters.addEventListener('change', (e) => {
      if (e.target.checked) {
        gisMap.addLayer(gisClusterLayer);
      } else {
        gisMap.removeLayer(gisClusterLayer);
      }
    });
  }

  setTimeout(() => {
    if (gisMap) gisMap.invalidateSize();
  }, 200);
}


function renderMapMarkers(hazards) {
  if (!gisMarkerLayer) return;
  gisMarkerLayer.clearLayers();
  gisClusterLayer.clearLayers();

  hazards.forEach(h => {
    let pinClass = 'pin-medium';
    let iconName = 'alert-circle';
    let size = 32;

    if (h.fusion.is_false_positive) {
      pinClass = 'pin-fp';
      iconName = 'eye-off';
      size = 26;
    } else if (h.severity === 'critical') {
      pinClass = 'pin-critical';
      iconName = 'alert-octagon';
      size = 38;
    } else if (h.severity === 'high') {
      pinClass = 'pin-high';
      iconName = 'alert-triangle';
      size = 34;
    } else if (h.severity === 'low') {
      pinClass = 'pin-low';
      iconName = 'check-circle';
      size = 28;
    }

    const customIcon = L.divIcon({
      className: `custom-hazard-pin ${pinClass}`,
      html: `<i data-lucide="${iconName}" style="width:${size*0.5}px;height:${size*0.5}px;color:white;"></i>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });

    const marker = L.marker([h.latitude, h.longitude], { icon: customIcon });

    let sevBadgeBg = 'bg-amber-100/60 text-amber-900 border-amber-300/60';
    if (h.severity === 'critical') {
      sevBadgeBg = 'bg-rose-100/60 text-rose-900 border-rose-300/60';
    } else if (h.severity === 'low') {
      sevBadgeBg = 'bg-emerald-100/60 text-emerald-900 border-emerald-300/60';
    }

    const popupHtml = `
      <div class="p-3.5 text-xs font-sans text-slate-900" style="min-width:260px; max-width:290px;">
        <!-- Top Row: ID & Severity Badge -->
        <div class="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200/50">
          <span class="inline-flex items-center gap-1 font-bold text-xs text-blue-950 bg-blue-50/60 border border-blue-200/60 px-2 py-0.5 rounded-md">
            <span>${h.id}</span>
            <span class="text-[10px] text-blue-700 font-medium">(${h.state})</span>
          </span>
          <span class="px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wide border ${sevBadgeBg}">
            ${h.severity}
          </span>
        </div>

        <!-- Hazard Title & Address -->
        <h4 class="font-extrabold text-[13px] text-slate-900 mb-1 leading-snug tracking-tight">${h.title}</h4>
        <p class="text-[11px] text-slate-600 mb-2.5 leading-tight font-medium">${h.address}</p>

        <!-- Metric Details Semi-Transparent Glass Box -->
        <div class="bg-white/40 backdrop-blur-xs p-2.5 rounded-xl border border-white/70 text-[11px] mb-3 space-y-1 shadow-2xs font-sans">
          <div class="flex justify-between items-center"><span class="text-slate-600 font-medium">Risk Priority:</span> <strong class="text-rose-600 font-extrabold font-mono">${h.priority.raw_risk_score}/100</strong></div>
          <div class="flex justify-between items-center"><span class="text-slate-600 font-medium">Cavity Depth:</span> <strong class="text-blue-700 font-extrabold font-mono">${h.fusion.physical_depth_cm} cm</strong></div>
          <div class="flex justify-between items-center"><span class="text-slate-600 font-medium">PWD Repair:</span> <strong class="text-slate-900 font-extrabold font-mono">${formatINR(h.priority.estimated_repair_cost_usd)}</strong></div>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-1.5 font-sans">
          <button onclick="openIncidentModal('${h.id}')" class="w-full bg-gradient-to-r from-amber-500/90 to-orange-500/90 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-2 px-3 rounded-xl shadow-xs border border-amber-400/40 flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer">
            <span>🇮🇳 View Multimodal Dossier</span>
          </button>
          <a href="https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}" target="_blank" rel="noopener noreferrer" class="w-full bg-slate-900/85 hover:bg-slate-900 text-white font-semibold py-1.5 px-3 rounded-xl shadow-xs border border-slate-700/40 flex items-center justify-center gap-1.5 text-[11.5px] transition-all no-underline text-center box-border">
            <span>🗺️ Open in Google Maps ↗</span>
          </a>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}" target="_blank" rel="noopener noreferrer" class="block text-center text-emerald-700 hover:text-emerald-800 font-bold text-[11px] no-underline pt-0.5 transition-colors">
            🧭 Navigate Route
          </a>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    gisMarkerLayer.addLayer(marker);
  });

  // Render Clustered Work Order Outlines
  allWorkOrders.forEach(wo => {
    if (currentStateFilter !== 'all' && wo.state && wo.state.toLowerCase() !== currentStateFilter.toLowerCase()) {
      return;
    }
    const circle = L.circle([wo.cluster_center_lat, wo.cluster_center_lng], {
      radius: 650,
      color: '#00f0ff',
      weight: 1.5,
      fillColor: '#00f0ff',
      fillOpacity: 0.08,
      dashArray: '4, 8'
    });

    circle.bindTooltip(`<strong>${wo.id}</strong><br/>${wo.title} (${wo.target_hazard_ids.length} defects)`, {
      permanent: false,
      direction: 'top',
      className: 'bg-slate-900 text-white text-xs border border-cyan-500 rounded p-1 font-sans'
    });

    gisClusterLayer.addLayer(circle);
  });

  lucide.createIcons();
}

function refreshMapData() {
  refreshAllData();
}

function renderIncidentFeed(hazards) {
  const container = document.getElementById('incident-feed-list');
  const feedCount = document.getElementById('feed-count');
  if (feedCount) feedCount.textContent = `${hazards.length} active`;
  const drawerBadge = document.getElementById('feed-drawer-badge');
  if (drawerBadge) drawerBadge.textContent = hazards.length;
  
  if (!container) return;
  container.innerHTML = '';

  if (hazards.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-500 font-medium p-6 text-center bg-white rounded-xl border border-slate-200/80">No active defects found for ${currentStateFilter}.</div>`;
    return;
  }

  hazards.forEach(h => {
    const isFP = h.fusion.is_false_positive;
    const sev = (h.severity || '').toLowerCase();

    let accentBorder = 'border-l-blue-500';
    let badgeClasses = 'bg-white/80 text-blue-700 border-blue-200/80';
    let dotColor = 'bg-blue-500';
    let riskBadge = 'text-blue-700 bg-white/80 border-blue-100';

    if (isFP) {
      accentBorder = 'border-l-slate-400';
      badgeClasses = 'bg-white/80 text-slate-600 border-slate-200';
      dotColor = 'bg-slate-400';
      riskBadge = 'text-slate-500 bg-white/80 border-slate-200';
    } else if (sev === 'critical') {
      accentBorder = 'border-l-rose-500';
      badgeClasses = 'bg-rose-50/90 text-rose-700 border-rose-200/80';
      dotColor = 'bg-rose-500';
      riskBadge = 'text-rose-700 bg-rose-50/90 border-rose-200/60';
    } else if (sev === 'high') {
      accentBorder = 'border-l-amber-500';
      badgeClasses = 'bg-amber-50/90 text-amber-800 border-amber-200/80';
      dotColor = 'bg-amber-500';
      riskBadge = 'text-amber-800 bg-amber-50/90 border-amber-200/60';
    }

    const card = document.createElement('div');
    card.className = `group translucent-feed-card border-l-[3.5px] ${accentBorder} rounded-xl p-3 cursor-pointer transition-all duration-150 flex flex-col gap-1.5`;
    card.onclick = () => {
      openIncidentModal(h.id);
      if (gisMap) {
        gisMap.flyTo([h.latitude, h.longitude], 16, { duration: 1.2 });
      }
    };

    const severityLabel = isFP 
      ? (window.t ? window.t('status_audited_fp', 'Filtered') : 'Filtered') 
      : (window.translateSeverity ? window.translateSeverity(h.severity) : (h.severity.charAt(0).toUpperCase() + h.severity.slice(1)));
    
    const riskLabel = window.t ? window.t('risk_label', 'Risk') : 'Risk';
    const depthLabel = window.getLanguage && window.getLanguage() === 'hi' ? 'गहराई' : 'Depth';
    const areaLabel = window.getLanguage && window.getLanguage() === 'hi' ? 'क्षेत्र' : 'Area';

    card.innerHTML = `
      <!-- Top Row: Badge + Location + Maps Link + Risk Score -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold border ${badgeClasses} shadow-2xs">
            <span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>
            <span>${severityLabel}</span>
          </span>
          <span class="text-[11px] text-slate-600 font-medium truncate">${h.state}</span>
        </div>
        
        <div class="flex items-center gap-1.5 shrink-0">
          <a href="https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" title="Open location in Google Maps" class="inline-flex items-center gap-0.5 text-[11px] text-slate-600 hover:text-blue-700 hover:underline px-1 py-0.5 rounded transition-colors font-medium">
            <span>Maps</span>
            <span class="text-[9px]">↗</span>
          </a>
          <span class="text-[10.5px] font-semibold px-1.5 py-0.5 rounded border ${riskBadge} shadow-2xs">${riskLabel} ${h.priority.raw_risk_score}</span>
        </div>
      </div>

      <!-- Title & Road Location -->
      <div>
        <h4 class="text-[12.5px] font-semibold text-slate-900 group-hover:text-blue-900 leading-snug line-clamp-2 transition-colors">${h.title}</h4>
        <p class="text-[11px] text-slate-600 truncate font-normal mt-0.5">${h.address}</p>
      </div>

      <!-- Bottom Metadata Row: Depth, Area, Est Cost -->
      <div class="flex items-center justify-between text-[11px] text-slate-700 pt-1.5 border-t border-slate-200/50 font-medium">
        <div class="flex items-center gap-2 text-slate-600">
          <span>${depthLabel}: <strong class="text-slate-800 font-medium">${h.fusion.physical_depth_cm}cm</strong></span>
          <span class="text-slate-400">•</span>
          <span>${areaLabel}: <strong class="text-slate-800 font-medium">${h.fusion.physical_area_sqm}m²</strong></span>
        </div>
        <span class="font-semibold text-slate-900">${formatINR(h.priority.estimated_repair_cost_usd)}</span>
      </div>
    `;

    container.appendChild(card);
  });
}

// ==========================================
// LIVE MULTIMODAL INSPECTION STUDIO
// ==========================================
function loadStudioScenario(type) {
  let hazardData = allHazards.find(h => {
    if (type === 'shadow_fp') return h.fusion.is_false_positive;
    if (type === 'submerged') return h.title.includes('Submerged');
    if (type === 'alligator') return h.hazard_type === 'alligator_crack';
    return h.hazard_type === 'pothole' && !h.fusion.is_false_positive;
  }) || allHazards[0];

  const imgElem = document.getElementById('studio-image-display');
  imgElem.src = SCENARIO_IMAGES[type] || SCENARIO_IMAGES.pothole;
  imgElem.onload = () => {
    renderStudioCanvasOverlay(hazardData);
  };

  updateStudioTelemetry(hazardData);
}

function renderStudioCanvasOverlay(hazard) {
  const canvas = document.getElementById('studio-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!hazard || !hazard.visual_detections || hazard.visual_detections.length === 0) return;

  const det = hazard.visual_detections[0];
  const bbox = det.bbox;

  const x = bbox.xmin * canvas.width;
  const y = bbox.ymin * canvas.height;
  const w = (bbox.xmax - bbox.xmin) * canvas.width;
  const h = (bbox.ymax - bbox.ymin) * canvas.height;

  if (det.segmentation_polygon) {
    ctx.beginPath();
    det.segmentation_polygon.forEach((pt, idx) => {
      const px = pt[0] * canvas.width;
      const py = pt[1] * canvas.height;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = hazard.fusion.is_false_positive ? 'rgba(148, 163, 184, 0.25)' : 'rgba(0, 240, 255, 0.25)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = hazard.fusion.is_false_positive ? '#94a3b8' : '#00f0ff';
    ctx.stroke();
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = hazard.fusion.is_false_positive ? '#cbd5e1' : '#f59e0b';
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 3;
  const corner = 12;
  ctx.beginPath(); ctx.moveTo(x, y + corner); ctx.lineTo(x, y); ctx.lineTo(x + corner, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w - corner, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + corner); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + h - corner); ctx.lineTo(x, y + h); ctx.lineTo(x + corner, y + h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w - corner, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - corner); ctx.stroke();

  ctx.fillStyle = hazard.fusion.is_false_positive ? 'rgba(51, 65, 85, 0.9)' : 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(x, y - 24, 190, 22);
  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.fillStyle = hazard.fusion.is_false_positive ? '#cbd5e1' : '#00f0ff';
  ctx.fillText(`${bbox.label} (${(det.confidence * 100).toFixed(0)}%)`, x + 6, y - 8);
}

function updateStudioTelemetry(hazard) {
  const trace = hazard.telemetry_trace || generateSampleTelemetry(2.4);
  const labels = trace.map(t => `${t.time_sec}s`);
  const gzData = trace.map(t => t.acc_z);
  const jerkData = trace.map(t => t.vertical_jerk);

  if (studioImuChart) {
    studioImuChart.data.labels = labels;
    studioImuChart.data.datasets[0].data = gzData;
    studioImuChart.data.datasets[1].data = jerkData;
    studioImuChart.update();
  }

  const maxGz = Math.max(...gzData);
  document.getElementById('imu-peak-badge').textContent = `Peak Shock: ${maxGz.toFixed(2)}g`;

  const f = hazard.fusion;
  document.getElementById('fuse-vis-score').textContent = `${(f.visual_score * 100).toFixed(0)}%`;
  document.getElementById('fuse-vis-bar').style.width = `${f.visual_score * 100}%`;

  document.getElementById('fuse-imu-score').textContent = `${(f.inertial_score * 100).toFixed(0)}%`;
  document.getElementById('fuse-imu-bar').style.width = `${f.inertial_score * 100}%`;

  document.getElementById('fuse-aud-score').textContent = `${(f.acoustic_score * 100).toFixed(0)}%`;
  document.getElementById('fuse-aud-bar').style.width = `${f.acoustic_score * 100}%`;

  document.getElementById('fuse-txt-score').textContent = `${(f.text_score * 100).toFixed(0)}%`;
  document.getElementById('fuse-txt-bar').style.width = `${f.text_score * 100}%`;

  document.getElementById('fuse-depth').textContent = `${f.physical_depth_cm} cm`;
  document.getElementById('fuse-area').textContent = `${f.physical_area_sqm} m²`;
  document.getElementById('fuse-risk').textContent = `${hazard.priority.raw_risk_score} / 100`;

  const pill = document.getElementById('fusion-status-pill');
  const reasonBox = document.getElementById('fuse-reason-box');

  if (f.is_false_positive) {
    pill.className = 'text-xs font-bold px-2.5 py-0.5 rounded font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/40';
    pill.textContent = 'OPTICAL FALSE POSITIVE REJECTED';
    reasonBox.textContent = f.false_positive_reason || 'Tree shadow & oil stain filtered: 0.01g vertical response confirms undamaged road surface.';
  } else {
    pill.className = 'text-xs font-bold px-2.5 py-0.5 rounded font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40';
    pill.textContent = 'VERIFIED STRUCTURAL HAZARD';
    reasonBox.textContent = `Cross-modal confirmation: Visual defect matches ${maxGz.toFixed(2)}g vertical transient. Safety ranking: High Priority.`;
  }
}

function handleStudioFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const b64 = e.target.result;
    const imgElem = document.getElementById('studio-image-display');
    imgElem.src = b64;

    try {
      const res = await fetch('/api/hazards/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: b64,
          latitude: 12.9340,
          longitude: 77.6080,
          state: currentStateFilter !== 'all' ? currentStateFilter : 'Karnataka',
          city: 'Bengaluru',
          acc_z_g: 2.3,
          vertical_jerk: 10.5,
          acoustic_db: 70.0,
          road_class: 'arterial',
          road_name: 'State Highway Sector'
        })
      });

      const newHazard = await res.json();
      allHazards.unshift(newHazard);
      renderStudioCanvasOverlay(newHazard);
      updateStudioTelemetry(newHazard);
      refreshAllData();
    } catch (err) {
      console.error('Inspection failed:', err);
    }
  };
  reader.readAsDataURL(file);
}

// ==========================================
// PATROL VEHICLE SIMULATOR
// ==========================================
function initPatrolMap() {
  const mapElem = document.getElementById('patrol-map');
  if (!mapElem) return;

  patrolMap = L.map('patrol-map', {
    center: [12.9340, 77.6080],
    zoom: 14,
    zoomControl: false
  });

  L.control.zoom({ position: 'bottomright' }).addTo(patrolMap);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB &copy; OpenStreetMap',
    maxZoom: 19
  }).addTo(patrolMap);

  const carIcon = L.divIcon({
    className: 'patrol-car-pin',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });

  patrolCarMarker = L.marker([12.9340, 77.6080], { icon: carIcon }).addTo(patrolMap);
}

function togglePatrolSimulation() {
  const btn = document.getElementById('btn-toggle-patrol');

  if (isPatrolRunning) {
    if (patrolWs) patrolWs.close();
    isPatrolRunning = false;
    btn.textContent = 'Start Simulation';
    btn.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black transition-all';
  } else {
    startPatrolSimulation();
    isPatrolRunning = true;
    btn.textContent = 'Stop Simulation';
    btn.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-red-500 hover:bg-red-400 text-white transition-all';
  }
}

function startPatrolSimulation() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/patrol-simulation`;
  
  patrolWs = new WebSocket(wsUrl);

  patrolWs.onmessage = (event) => {
    const frame = JSON.parse(event.data);
    updatePatrolHud(frame);
  };

  patrolWs.onclose = () => {
    isPatrolRunning = false;
    document.getElementById('btn-toggle-patrol').textContent = 'Start Simulation';
  };
}

function updatePatrolHud(frame) {
  document.getElementById('patrol-speed').innerHTML = `${frame.speed_kmh.toFixed(1)} <span class="text-xs font-normal text-slate-400">km/h</span>`;
  document.getElementById('patrol-gz').innerHTML = `${frame.acc_z.toFixed(2)} <span class="text-xs font-normal text-slate-400">g</span>`;
  document.getElementById('patrol-iri').innerHTML = `${frame.iri_roughness.toFixed(1)} <span class="text-xs font-normal text-slate-400">m/km</span>`;
  document.getElementById('patrol-db').innerHTML = `${frame.acoustic_db.toFixed(1)} <span class="text-xs font-normal text-slate-400">dB</span>`;
  document.getElementById('patrol-road-name').textContent = `${frame.active_road_name} (${frame.city}, ${frame.state})`;
  document.getElementById('patrol-gps').textContent = `${frame.latitude.toFixed(4)}° N, ${frame.longitude.toFixed(4)}° E`;

  if (patrolCarMarker && patrolMap) {
    patrolCarMarker.setLatLng([frame.latitude, frame.longitude]);
    patrolMap.panTo([frame.latitude, frame.longitude], { animate: true, duration: 1.0 });
  }

  if (frame.hazard_detected) {
    const h = frame.hazard_detected;
    const log = document.getElementById('patrol-events-log');
    const item = document.createElement('div');
    item.className = 'bg-red-950/60 border border-red-500/40 p-2 rounded text-red-300 text-[11px] font-mono flex items-center justify-between animate-pulse';
    item.innerHTML = `
      <span>🚨 [${h.id}] ${h.hazard_type.toUpperCase()} | Peak: ${frame.acc_z}g</span>
      <span class="text-red-400 font-bold">${h.priority.raw_risk_score}/100</span>
    `;
    log.prepend(item);
  }
}

// ==========================================
// WORK ORDERS & BACKLOG (₹ INR)
// ==========================================
function renderWorkOrders(workOrders) {
  const container = document.getElementById('work-orders-container');
  if (!container) return;
  container.innerHTML = '';

  if (workOrders.length === 0) {
    container.innerHTML = `<div class="col-span-3 text-center p-8 bg-white border-2 border-black rounded-none text-black text-xs font-bold">No scheduled work orders for ${currentStateFilter}.</div>`;
    return;
  }

  workOrders.forEach(wo => {
    const card = document.createElement('div');
    let tierBadge = 'bg-blue-50 text-blue-950 border border-blue-200';
    let borderAccent = 'border-l-4 border-l-blue-600';
    if (wo.priority_tier.includes('Tier 1')) {
      tierBadge = 'bg-red-50 text-red-950 border border-red-200';
      borderAccent = 'border-l-4 border-l-red-600';
    } else if (wo.priority_tier.includes('Tier 2')) {
      tierBadge = 'bg-orange-50 text-orange-950 border border-orange-200';
      borderAccent = 'border-l-4 border-l-[#FF9933]';
    }

    card.className = `nhai-card bg-white border border-slate-200 ${borderAccent} rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all shadow-xs hover:shadow-md text-black overflow-hidden relative`;

    let hazardsHtml = wo.hazards_summary.map(h => `
      <div class="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono font-bold">
        <div>
          <span class="text-black font-bold">${h.hazard_id}</span>
          <span class="text-slate-600 text-[11px] ml-1">(${h.hazard_type.replace('_', ' ')})</span>
        </div>
        <span class="text-purple-900 font-black">${formatINR(h.cost_inr || 15000)}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg">${wo.id}</span>
            <span class="text-[10px] text-slate-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg font-bold">${wo.state}</span>
          </div>
          <span class="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold ${tierBadge}">${wo.priority_tier}</span>
        </div>
        <h3 class="text-sm font-black text-black leading-snug">${wo.title}</h3>
        
        <div class="grid grid-cols-2 gap-2.5 text-xs font-mono bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <span class="text-slate-500 text-[10px] font-bold">Assigned Crew:</span>
            <p class="font-bold text-black text-[11px] truncate mt-0.5">${wo.assigned_crew}</p>
          </div>
          <div>
            <span class="text-slate-500 text-[10px] font-bold">Scheduled Window:</span>
            <p class="font-bold text-black text-[11px] mt-0.5">${wo.scheduled_date}</p>
          </div>
          <div class="mt-1">
            <span class="text-slate-500 text-[10px] font-bold">Est. Shift Hours:</span>
            <p class="font-bold text-blue-800 text-[11px] mt-0.5">${wo.estimated_hours} hrs</p>
          </div>
          <div class="mt-1">
            <span class="text-slate-500 text-[10px] font-bold">Total Cost:</span>
            <p class="font-black text-purple-900 text-[11px] mt-0.5">${formatINR(wo.estimated_cost_usd)}</p>
          </div>
        </div>

        <div class="space-y-2">
          <p class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Clustered Defects:</p>
          <div class="space-y-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
            ${hazardsHtml}
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs">
        <span class="text-slate-700 font-mono font-bold">Status: <strong class="text-emerald-800 font-black">${wo.status.toUpperCase()}</strong></span>
        <div class="flex items-center gap-2">
          <a href="https://www.google.com/maps/search/?api=1&query=${wo.cluster_center_lat},${wo.cluster_center_lng}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-950 text-xs font-bold flex items-center gap-1 transition-colors shadow-xs">
            🗺️ Maps ↗
          </a>
          <button onclick="dispatchWorkOrder('${wo.id}')" class="px-3.5 py-1.5 rounded-xl font-bold bg-[#138808] hover:bg-[#0f6b06] border border-emerald-700 text-white text-xs transition-colors shadow-xs cursor-pointer">
            Dispatch Crew
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

async function regenerateWorkOrders() {
  try {
    const res = await fetch('/api/work-orders/generate', { method: 'POST' });
    allWorkOrders = await res.json();
    applyStateAndSearchFilters();
  } catch (err) {
    console.error('Work order generation failed:', err);
  }
}

function dispatchWorkOrder(orderId) {
  alert(`PWD / NHAI Dispatch Notification: Maintenance fleet assigned and route loaded for ${orderId}. Traffic police advisories issued.`);
}

// ==========================================
// GEMINI INFRASTRUCTURE AI CO-PILOT
// ==========================================
async function sendCopilotMessage() {
  const input = document.getElementById('copilot-input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  appendChatMessage('user', text);

  const loadingId = appendChatLoading();

  try {
    const res = await fetch('/api/copilot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: text,
        state_filter: currentStateFilter,
        api_key: userApiKey
      })
    });

    const data = await res.json();
    removeChatLoading(loadingId);
    appendChatMessage('assistant', data.answer);
  } catch (err) {
    removeChatLoading(loadingId);
    appendChatMessage('assistant', 'Error communicating with AI Co-Pilot. Please verify server connection.');
  }
}

function askCopilot(question) {
  document.getElementById('copilot-input').value = question;
  sendCopilotMessage();
}

function appendChatMessage(role, content) {
  const container = document.getElementById('copilot-chat-messages');
  const msg = document.createElement('div');
  msg.className = 'flex gap-3';

  if (role === 'user') {
    msg.className = 'flex gap-3 justify-end';
    msg.innerHTML = `
      <div class="bg-cyan-600/20 border border-cyan-500/40 p-4 rounded-2xl max-w-2xl text-xs text-slate-100 leading-relaxed shadow-lg">
        <p class="font-bold text-cyan-300 mb-1">PWD / Municipal Engineer (${currentStateFilter})</p>
        <p>${content}</p>
      </div>
      <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
        <i data-lucide="user" class="w-4 h-4 text-slate-300"></i>
      </div>
    `;
  } else {
    let formatted = content
      .replace(/### (.*?)\n/g, '<h4 class="font-bold text-sm text-cyan-300 mt-2 mb-1">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded font-mono text-[11px]">$1</code>')
      .replace(/> (.*?)\n/g, '<blockquote class="border-l-2 border-cyan-400 pl-2 my-2 text-slate-300 italic text-[11px]">$1</blockquote>')
      .replace(/\n- (.*?)/g, '<li class="ml-4 list-disc text-slate-300">$1</li>');

    msg.innerHTML = `
      <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
        <i data-lucide="bot" class="w-4 h-4 text-black"></i>
      </div>
      <div class="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl max-w-2xl text-xs text-slate-200 leading-relaxed shadow-lg">
        <p class="font-bold text-cyan-300 mb-1">SadakSuraksha Infrastructure AI Co-Pilot (MoRTH / IRC)</p>
        <div class="space-y-1.5">${formatted}</div>
      </div>
    `;
  }

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
  lucide.createIcons();
}

function appendChatLoading() {
  const container = document.getElementById('copilot-chat-messages');
  const id = `loading-${Date.now()}`;
  const msg = document.createElement('div');
  msg.id = id;
  msg.className = 'flex gap-3';
  msg.innerHTML = `
    <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
      <i data-lucide="loader-2" class="w-4 h-4 text-cyan-400 animate-spin"></i>
    </div>
    <div class="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl text-xs text-slate-400 italic">
      Synthesizing sensor telemetry & IRC / MoRTH guidelines in ₹ INR...
    </div>
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
  lucide.createIcons();
  return id;
}

function removeChatLoading(id) {
  const elem = document.getElementById(id);
  if (elem) elem.remove();
}

// ==========================================
// CHARTS & ANALYTICS
// ==========================================
function initCharts() {
  const ctxImu = document.getElementById('studio-imu-chart');
  if (ctxImu) {
    studioImuChart = new Chart(ctxImu, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Vertical Acceleration (Gz)',
            data: [],
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.15)',
            borderWidth: 2.5,
            tension: 0.3,
            fill: true,
            pointRadius: 0
          },
          {
            label: 'Vertical Jerk (g/s)',
            data: [],
            borderColor: '#d97706',
            borderWidth: 2,
            borderDash: [3, 3],
            tension: 0.3,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: true, grid: { color: '#e2e8f0' }, ticks: { color: '#000000', maxTicksLimit: 6, font: { weight: 'bold' } } },
          y: { display: true, grid: { color: '#e2e8f0' }, ticks: { color: '#000000', font: { weight: 'bold' } }, min: 0.5, max: 3.5 }
        }
      }
    });
  }

  const ctxDist = document.getElementById('hazard-dist-chart');
  if (ctxDist) {
    hazardDistChart = new Chart(ctxDist, {
      type: 'doughnut',
      data: {
        labels: ['Potholes', 'Alligator Cracks', 'Guardrail Damage', 'Rutting', 'Obscured Signs', 'Debris'],
        datasets: [{
          data: [4, 2, 1, 1, 1, 1],
          backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#64748b'],
          borderColor: '#000000',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#000000', font: { size: 11, weight: 'bold' } } }
        }
      }
    });
  }

  const ctxPci = document.getElementById('road-pci-chart');
  if (ctxPci) {
    roadPciChart = new Chart(ctxPci, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'IRC / PCI Health Index',
          data: [],
          backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#10b981'],
          borderColor: '#000000',
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#e2e8f0' }, ticks: { color: '#000000', font: { size: 10, weight: 'bold' } } },
          y: { grid: { color: '#e2e8f0' }, ticks: { color: '#000000', font: { weight: 'bold' } }, min: 0, max: 100 }
        }
      }
    });
  }
}

function updateAnalyticsCharts(analytics, roads) {
  if (hazardDistChart && analytics.hazard_type_distribution) {
    const keys = Object.keys(analytics.hazard_type_distribution);
    const values = Object.values(analytics.hazard_type_distribution);
    hazardDistChart.data.labels = keys.map(k => k.replace('_', ' ').toUpperCase());
    hazardDistChart.data.datasets[0].data = values;
    hazardDistChart.update();
  }

  if (roadPciChart && roads.length > 0) {
    const subsetRoads = (currentStateFilter === 'all')
      ? roads
      : roads.filter(r => r.state && r.state.toLowerCase() === currentStateFilter.toLowerCase());

    roadPciChart.data.labels = subsetRoads.map(r => r.name.split(' ')[0] + ` (${r.city})`);
    roadPciChart.data.datasets[0].data = subsetRoads.map(r => r.current_pci);
    roadPciChart.update();
  }
}

function updateBudgetSim() {
  const budget = parseInt(document.getElementById('slider-budget').value);
  const ratio = parseInt(document.getElementById('slider-ratio').value);

  document.getElementById('slider-val-budget').textContent = formatINR(budget);
  document.getElementById('slider-val-ratio').textContent = `${ratio}%`;

  const pciGain = ((budget / 1000000) * 4.8 * (ratio / 50)).toFixed(1);
  const lifeExt = ((budget / 1000000) * 1.8 * (ratio / 50)).toFixed(1);

  document.getElementById('sim-pci-gain').textContent = `+${pciGain} PCI Points`;
  document.getElementById('sim-life-extension').textContent = `+${lifeExt} Years`;
}

// ==========================================
// MODALS & NAVIGATION
// ==========================================
function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active-tab'));
  document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));

  const tabBtn = document.getElementById(`tab-${tabId}`);
  const viewElem = document.getElementById(`view-${tabId}`);

  if (tabBtn) tabBtn.classList.add('active-tab');
  if (viewElem) viewElem.classList.remove('hidden');

  if (tabId === 'map' && gisMap) {
    setTimeout(() => gisMap.invalidateSize(), 200);
  }
  if (tabId === 'patrol' && patrolMap) {
    setTimeout(() => patrolMap.invalidateSize(), 200);
  }
  if (tabId === 'forecast') {
    if (typeof initForecastView === 'function') initForecastView();
  }
  if (tabId === 'resource-intel') {
    if (typeof initResourceIntelligenceView === 'function') initResourceIntelligenceView();
  }
  if (tabId === 'ingestion') {
    if (typeof refreshIngestionStreams === 'function') refreshIngestionStreams();
  }
}


function navigateToHome() {
  // Close any open modals
  closeIncidentModal();
  closeIngestModal();
  closeApiKeyModal();
  if (typeof closeCitizenPortalModal === 'function') closeCitizenPortalModal();
  if (typeof closeForecastDetailModal === 'function') closeForecastDetailModal();

  // Switch to the main GIS Map tab
  switchTab('map');

  // Reset map view to the current state center or all India center
  if (gisMap) {
    const vp = STATE_VIEWPORTS[currentStateFilter] || STATE_VIEWPORTS.all;
    gisMap.flyTo(vp.center, vp.zoom, { duration: 0.8 });
  }

  // Scroll window smoothly to the top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openIncidentModal(hazardId) {
  const h = allHazards.find(item => item.id === hazardId);
  if (!h) return;

  selectedHazard = h;
  document.getElementById('modal-title').textContent = h.title;
  document.getElementById('modal-address').textContent = `${h.address} (${h.road_name})`;
  document.getElementById('modal-risk-score').innerHTML = `${h.priority.raw_risk_score} <span class="text-xs text-slate-500">/100</span>`;
  document.getElementById('modal-pci-deduct').textContent = `-${h.priority.pci_deduct_value} pts`;
  document.getElementById('modal-depth').textContent = `${h.fusion.physical_depth_cm} cm`;
  document.getElementById('modal-repair-cost').textContent = formatINR(h.priority.estimated_repair_cost_usd);
  document.getElementById('modal-repair-technique').textContent = h.priority.recommended_repair_technique;
  document.getElementById('modal-repair-hours').textContent = `Estimated Crew Hours: ${h.priority.estimated_crew_hours} hrs`;

  // Set Google Maps redirection links
  const modalGmaps = document.getElementById('modal-gmaps-link');
  if (modalGmaps) {
    modalGmaps.href = `https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}`;
  }
  const modalGmapsDir = document.getElementById('modal-gmaps-dir');
  if (modalGmapsDir) {
    modalGmapsDir.href = `https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`;
  }

  const badge = document.getElementById('modal-badge-severity');
  if (h.fusion.is_false_positive) {
    badge.className = 'px-2.5 py-1 rounded text-xs font-bold font-mono bg-slate-800 text-slate-400 border border-slate-700';
    badge.textContent = 'FALSE POSITIVE';
    document.getElementById('modal-fp-warning').classList.remove('hidden');
  } else {
    badge.className = `px-2.5 py-1 rounded text-xs font-bold font-mono ${h.severity === 'critical' ? 'bg-red-950 text-red-400 border border-red-500/40' : 'bg-amber-950 text-amber-400 border border-amber-500/40'}`;
    badge.textContent = h.severity.toUpperCase();
    document.getElementById('modal-fp-warning').classList.add('hidden');
  }

  document.getElementById('modal-image').src = SCENARIO_IMAGES[h.hazard_type] || SCENARIO_IMAGES.pothole;

  setTimeout(() => {
    const ctx = document.getElementById('modal-imu-chart');
    if (ctx) {
      if (modalImuChart) modalImuChart.destroy();
      const trace = h.telemetry_trace || generateSampleTelemetry(2.2);
      modalImuChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: trace.map(t => `${t.time_sec}s`),
          datasets: [{
            label: 'Vertical Shock (Gz)',
            data: trace.map(t => t.acc_z),
            borderColor: '#00f0ff',
            backgroundColor: 'rgba(0, 240, 255, 0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: '#1e293b' }, ticks: { color: '#64748b' } },
            y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b' } }
          }
        }
      });
    }
  }, 100);

  document.getElementById('incident-modal').classList.remove('hidden');
}

function closeIncidentModal() {
  document.getElementById('incident-modal').classList.add('hidden');
}

function openApiKeyModal() {
  document.getElementById('input-api-key').value = userApiKey;
  document.getElementById('apikey-modal').classList.remove('hidden');
}

function closeApiKeyModal() {
  document.getElementById('apikey-modal').classList.add('hidden');
}

function saveApiKey() {
  userApiKey = document.getElementById('input-api-key').value.trim();
  localStorage.setItem('SADAKSURAKSHA_GEMINI_KEY', userApiKey);
  updateApiKeyDisplay();
  closeApiKeyModal();
}

function triggerQuickScanModal() {
  document.getElementById('ingest-modal').classList.remove('hidden');
}

function closeIngestModal() {
  document.getElementById('ingest-modal').classList.add('hidden');
}

async function submitIngestModal() {
  const stateVal = document.getElementById('ingest-state').value;
  const roadClass = document.getElementById('ingest-road-class').value;
  const accZ = parseFloat(document.getElementById('ingest-acc-z').value);
  const acousticDb = parseFloat(document.getElementById('ingest-acoustic-db').value);
  const citizenText = document.getElementById('ingest-citizen-text').value;

  try {
    const res = await fetch('/api/hazards/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: stateVal === 'Maharashtra' ? 19.1136 : (stateVal === 'Delhi NCR' ? 28.5672 : 12.9340),
        longitude: stateVal === 'Maharashtra' ? 72.8697 : (stateVal === 'Delhi NCR' ? 77.2100 : 77.6080),
        state: stateVal,
        city: stateVal === 'Maharashtra' ? 'Mumbai' : (stateVal === 'Delhi NCR' ? 'New Delhi' : 'Bengaluru'),
        acc_z_g: accZ,
        vertical_jerk: accZ * 4.2,
        acoustic_db: acousticDb,
        citizen_text: citizenText,
        road_class: roadClass,
        road_name: `${stateVal} Sector Route`
      })
    });

    const newH = await res.json();
    closeIngestModal();
    await refreshAllData();
    openIncidentModal(newH.id);
  } catch (err) {
    console.error('Ingest failed:', err);
  }
}

// ==========================================
// SYNTHETIC SVG & DATA GENERATORS
// ==========================================
function generateRoadImageSVG(type) {
  let inner = '';
  if (type === 'pothole') {
    inner = `
      <defs>
        <radialGradient id="holeGrad" cx="45%" cy="40%" r="50%">
          <stop offset="0%" stop-color="#05070a"/>
          <stop offset="60%" stop-color="#141a24"/>
          <stop offset="100%" stop-color="#2a3447"/>
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="#2d3748"/>
      <line x1="400" y1="0" x2="400" y2="450" stroke="#f6e05e" stroke-width="8" stroke-dasharray="30 20"/>
      <path d="M 320 220 Q 380 200 480 215 Q 530 250 510 320 Q 450 360 360 340 Q 300 300 320 220 Z" fill="url(#holeGrad)" stroke="#1a202c" stroke-width="6"/>
      <circle cx="340" cy="240" r="4" fill="#a0aec0"/>
      <circle cx="460" cy="310" r="6" fill="#718096"/>
      <circle cx="490" cy="240" r="5" fill="#a0aec0"/>
    `;
  } else if (type === 'alligator') {
    inner = `
      <rect width="800" height="450" fill="#334155"/>
      <line x1="400" y1="0" x2="400" y2="450" stroke="#cbd5e1" stroke-width="6" stroke-dasharray="25 15"/>
      <path d="M 250 200 L 320 230 L 300 290 L 240 270 Z M 320 230 L 400 210 L 420 270 L 300 290 Z M 400 210 L 490 240 L 480 310 L 420 270 Z M 300 290 L 420 270 L 390 360 L 290 350 Z M 420 270 L 480 310 L 460 370 L 390 360 Z" fill="none" stroke="#0f172a" stroke-width="5"/>
    `;
  } else if (type === 'shadow_fp') {
    inner = `
      <rect width="800" height="450" fill="#475569"/>
      <line x1="400" y1="0" x2="400" y2="450" stroke="#fef08a" stroke-width="6" stroke-dasharray="25 15"/>
      <path d="M 300 180 Q 400 160 480 200 Q 520 280 440 340 Q 340 350 310 280 Z" fill="rgba(15, 23, 42, 0.55)"/>
      <circle cx="360" cy="220" r="28" fill="rgba(15, 23, 42, 0.4)"/>
    `;
  } else if (type === 'submerged') {
    inner = `
      <rect width="800" height="450" fill="#1e293b"/>
      <ellipse cx="420" cy="270" rx="140" ry="80" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
      <ellipse cx="420" cy="270" rx="120" ry="65" fill="#0284c7" opacity="0.3"/>
      <ellipse cx="420" cy="275" rx="70" ry="40" fill="#030712" opacity="0.8"/>
    `;
  } else {
    inner = `
      <rect width="800" height="450" fill="#334155"/>
      <line x1="400" y1="0" x2="400" y2="450" stroke="#fde047" stroke-width="6" stroke-dasharray="30 20"/>
      <rect x="340" y="220" width="120" height="80" fill="#0f172a" rx="10"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">${inner}</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function generateSampleTelemetry(peak) {
  const trace = [];
  for (let i = 0; i < 25; i++) {
    const t = (i * 0.05).toFixed(2);
    let gz = 1.0 + 0.03 * ((i % 3) - 1);
    let jerk = 0.4;
    if (i >= 10 && i <= 15) {
      gz = peak - Math.abs(i - 12.5) * 0.3;
      jerk = (gz - 1.0) * 12.0;
    }
    trace.push({ time_sec: t, acc_z: gz, vertical_jerk: jerk });
  }
  return trace;
}

// ==========================================
// INGESTION STREAMS & CITIZEN PORTAL
// ==========================================

let ingestionStreams = [];

async function refreshIngestionStreams() {
  try {
    const res = await fetch('/api/ingest/streams');
    ingestionStreams = await res.json();
    renderIngestionStreams(ingestionStreams);
  } catch (err) {
    console.error('Error loading ingestion streams:', err);
  }
}

function renderIngestionStreams(streams) {
  const grid = document.getElementById('ingestion-streams-grid');
  if (!grid) return;

  const sourceIcons = {
    'cctv_feed': '📹',
    'citizen_mobile': '📱',
    'google_maps_traffic': '🗺️',
    'patrol_vehicle': '🚗',
    'field_engineer': '🔧'
  };

  const statusColors = {
    'active': 'emerald',
    'paused': 'amber',
    'error': 'red',
    'disconnected': 'slate'
  };

  grid.innerHTML = streams.map(s => {
    const icon = sourceIcons[s.source_type] || '📡';
    const color = statusColors[s.status] || 'slate';
    return `
      <div class="nhai-card bg-white border border-slate-200 border-l-4 border-l-[#FF9933] rounded-2xl p-4 transition-all text-black overflow-hidden relative shadow-xs hover:shadow-md">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-lg">${icon}</span>
            <span class="text-[10px] uppercase font-bold tracking-wider text-slate-800">${s.source_type.replace(/_/g, ' ')}</span>
          </div>
          <span class="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-950">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 ${s.status === 'active' ? 'animate-pulse' : ''}"></span>
            ${s.status.toUpperCase()}
          </span>
        </div>
        <h4 class="text-xs font-black text-black mb-1 leading-tight">${s.source_name}</h4>
        <p class="text-[10px] text-slate-500 mb-3 font-mono">${s.state} • ${s.city}</p>
        <div class="grid grid-cols-3 gap-2 text-center text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div>
            <p class="font-bold font-mono text-black">${s.total_frames_processed.toLocaleString('en-IN')}</p>
            <p class="text-slate-500">Frames</p>
          </div>
          <div>
            <p class="font-bold font-mono text-orange-700">${s.hazards_detected}</p>
            <p class="text-slate-500">Hazards</p>
          </div>
          <div>
            <p class="font-bold font-mono text-emerald-700">${s.false_positives_filtered}</p>
            <p class="text-slate-500">FP Filtered</p>
          </div>
        </div>
        ${s.last_frame_at ? `<p class="text-[9px] text-slate-400 mt-2 font-mono">Last: ${s.last_frame_at}</p>` : ''}
      </div>
    `;
  }).join('');

  lucide.createIcons();
}



// Load ingestion streams when switching to ingestion tab
const originalSwitchTab = window.switchTab;
window.switchTab = function(tabId) {
  // Call original tab logic
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active-tab'));
  document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));

  const tabBtn = document.getElementById(`tab-${tabId}`);
  const viewElem = document.getElementById(`view-${tabId}`);

  if (tabBtn) tabBtn.classList.add('active-tab');
  if (viewElem) viewElem.classList.remove('hidden');

  if (tabId === 'map' && gisMap) {
    setTimeout(() => gisMap.invalidateSize(), 200);
  }
  if (tabId === 'patrol' && patrolMap) {
    setTimeout(() => patrolMap.invalidateSize(), 200);
  }
  if (tabId === 'ingestion') {
    refreshIngestionStreams();
  }
};
// Override the global function
switchTab = window.switchTab;

// Decluttered Navigation & Action Dropdowns

// ==========================================
// DECLUTTERED NAVIGATION & ACTION DROPDOWNS
// ==========================================
const TAB_LABELS = {
  map: 'GIS Hazard Map',
  forecast: 'AI Road Forecast',
  'resource-intel': 'Resource Intelligence',
  studio: 'Inspection Studio',
  patrol: 'Patrol Simulator',
  backlog: 'Work Orders',
  copilot: 'AI Co-Pilot',
  analytics: 'Analytics & Reports',
  ingestion: 'Multi-Source Ingestion'
};

function toggleNavDropdown(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('nav-dropdown-menu');
  const arrow = document.getElementById('nav-dropdown-arrow');
  const actionsMenu = document.getElementById('actions-dropdown-menu');
  const actionsArrow = document.getElementById('actions-dropdown-arrow');
  
  if (actionsMenu) actionsMenu.classList.add('hidden');
  if (actionsArrow) actionsArrow.style.transform = 'rotate(0deg)';
  
  if (menu) {
    const isHidden = menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    if (arrow) arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    lucide.createIcons();
  }
}
window.toggleNavDropdown = toggleNavDropdown;

function toggleActionsDropdown(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('actions-dropdown-menu');
  const arrow = document.getElementById('actions-dropdown-arrow');
  const navMenu = document.getElementById('nav-dropdown-menu');
  const navArrow = document.getElementById('nav-dropdown-arrow');
  
  if (navMenu) navMenu.classList.add('hidden');
  if (navArrow) navArrow.style.transform = 'rotate(0deg)';
  
  if (menu) {
    const isHidden = menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    if (arrow) arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    lucide.createIcons();
  }
}
window.toggleActionsDropdown = toggleActionsDropdown;

function closeAllDropdowns() {
  const navMenu = document.getElementById('nav-dropdown-menu');
  const navArrow = document.getElementById('nav-dropdown-arrow');
  const actionsMenu = document.getElementById('actions-dropdown-menu');
  const actionsArrow = document.getElementById('actions-dropdown-arrow');
  
  if (navMenu) navMenu.classList.add('hidden');
  if (navArrow) navArrow.style.transform = 'rotate(0deg)';
  if (actionsMenu) actionsMenu.classList.add('hidden');
  if (actionsArrow) actionsArrow.style.transform = 'rotate(0deg)';
}
window.closeAllDropdowns = closeAllDropdowns;

// Global click listener to close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  const navWrapper = document.getElementById('dropdown-nav-wrapper');
  const actionsWrapper = document.getElementById('dropdown-actions-wrapper');
  if (navWrapper && !navWrapper.contains(e.target) && actionsWrapper && !actionsWrapper.contains(e.target)) {
    closeAllDropdowns();
  }
});

function selectNavTab(tabId, label) {
  switchTab(tabId);
  const labelElem = document.getElementById('nav-dropdown-label');
  if (labelElem) {
    labelElem.textContent = label || TAB_LABELS[tabId] || 'GIS Hazard Map';
  }
  closeAllDropdowns();
}
window.selectNavTab = selectNavTab;

function navigateToHome() {
  selectNavTab('map', 'GIS Hazard Map');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.navigateToHome = navigateToHome;

// ==========================================
// PRIORITY BACKLOG FEED DROPDOWN BOX TOGGLER
// ==========================================
function toggleFeedDropdown(explicitOpen) {
  const content = document.getElementById('priority-feed-content');
  const chevron = document.getElementById('feed-dropdown-chevron');
  const subtext = document.getElementById('feed-dropdown-subtext');
  const btn = document.getElementById('btn-toggle-feed-dropdown');
  if (!content) return;

  const willOpen = explicitOpen !== undefined ? explicitOpen : content.classList.contains('hidden');

  if (willOpen) {
    content.classList.remove('hidden');
    content.classList.add('flex');
    if (chevron) chevron.style.transform = 'rotate(180deg)';
    if (subtext) subtext.textContent = 'Click to close backlog';
    if (btn) btn.setAttribute('aria-expanded', 'true');
  } else {
    content.classList.add('hidden');
    content.classList.remove('flex');
    if (chevron) chevron.style.transform = 'rotate(0deg)';
    if (subtext) subtext.textContent = 'Click to open backlog';
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}
window.toggleFeedDropdown = toggleFeedDropdown;
window.toggleFeedPopup = toggleFeedDropdown;
window.toggleFeedDrawer = toggleFeedDropdown;




// ==========================================
// FEATURE 1: AI ROAD FORECAST ENGINE
// ==========================================
let forecastMap = null;
let forecastMarkersLayer = null;

const ROAD_FORECAST_DATA = [
  {
    id: "FC-5201",
    road_name: "NH-52 (Jaipur–Sikar Expressway)",
    location: "Jaipur, Rajasthan",
    road_class: "National Highway",
    coordinates: [26.9124, 75.7873],
    current_risk: "Medium",
    current_score: 54,
    forecast_risk: "High",
    forecast_score: 87,
    confidence: 89,
    predicted_issue: "Pothole & Surface Cavity",
    expected_window: "Next 3–5 Days",
    expected_date: "Nov 28–30",
    risk_trend: "+33 pts",
    explanation: "Heavy multi-axle freight volume (1,450 trucks/hr) coupled with 45mm recent monsoon saturation and 78 dB acoustic telemetry indicates high-velocity aggregate detachment.",
    factors: [
      "Daily Freight Volume: 1,450 commercial trucks/hr",
      "Sub-base Moisture Content: 82% (High)",
      "Surface Age: 3.8 years without seal coat",
      "Acoustic Resonance: 78 dB tire-pavement shock"
    ],
    action: "Deploy cold-mix asphalt patching within 48 hours to prevent structural base collapse."
  },
  {
    id: "FC-4402",
    road_name: "Hosur Road Technology Corridor",
    location: "Bengaluru, Karnataka",
    road_class: "Major Arterial Flyover",
    coordinates: [12.9716, 77.5946],
    current_risk: "Medium",
    current_score: 58,
    forecast_risk: "Critical",
    forecast_score: 92,
    confidence: 94,
    predicted_issue: "Severe Deep Pothole & Edge Cavity",
    expected_window: "Next 24–48 Hours",
    expected_date: "Nov 27–28",
    risk_trend: "+34 pts",
    explanation: "Accelerated cyclic vibration spikes (2.85 Gz) on right-hand flyover ramp under continuous 42,000 PCU/day traffic volume.",
    factors: [
      "Traffic Density: 42,000 vehicles/day",
      "Structural Jerk Peak: 2.85 Gz",
      "Micro-crack Network: 14m continuous fissure",
      "Drainage Backlog: Moderate overflow"
    ],
    action: "Immediate hot-mix asphalt patching & compaction within 24 hours."
  },
  {
    id: "FC-4803",
    road_name: "NH-48 Western Express Corridor",
    location: "Mumbai, Maharashtra",
    road_class: "Arterial Expressway",
    coordinates: [19.0760, 72.8777],
    current_risk: "Low",
    current_score: 38,
    forecast_risk: "High",
    forecast_score: 79,
    confidence: 86,
    predicted_issue: "Monsoon Waterlogging & Stripping",
    expected_window: "Next 4–6 Days",
    expected_date: "Nov 29 – Dec 1",
    risk_trend: "+41 pts",
    explanation: "Clogged stormwater inlet drains adjacent to median divider; tidal overflow modeling projects 18cm standing water during upcoming rain.",
    factors: [
      "Inlet Drainage Blockage: 65% obstruction",
      "Forecast Rainfall: 70mm over 48 hours",
      "Low-lying Gradient: -2.1% sag curve",
      "Traffic Volume: Critical suburban artery"
    ],
    action: "Deploy suction pump truck and clear median drainage channels."
  },
  {
    id: "FC-6504",
    road_name: "Outer Ring Road (Gachibowli Corridor)",
    location: "Hyderabad, Telangana",
    road_class: "Expressway",
    coordinates: [17.3850, 78.4867],
    current_risk: "Low",
    current_score: 32,
    forecast_risk: "Medium",
    forecast_score: 68,
    confidence: 82,
    predicted_issue: "Longitudinal Cracking & Rutting",
    expected_window: "Next 5–7 Days",
    expected_date: "Dec 1–3",
    risk_trend: "+36 pts",
    explanation: "High-speed multi-axle freight traffic causing subgrade flexure; surface micro-fissures widening by 1.2mm/day.",
    factors: [
      "Subgrade Deflection: 0.8mm dynamic movement",
      "Ambient Temperature Cycles: 34°C - 19°C",
      "Asphalt Binder Oxidation: Moderate",
      "Axle Load Count: High"
    ],
    action: "Schedule polymer-modified crack sealing before monsoon onset."
  },
  {
    id: "FC-2405",
    road_name: "Delhi–Meerut Expressway Corridor",
    location: "Delhi NCR",
    road_class: "National Expressway",
    coordinates: [28.6139, 77.2090],
    current_risk: "Medium",
    current_score: 48,
    forecast_risk: "High",
    forecast_score: 84,
    confidence: 91,
    predicted_issue: "Expansion Joint & Guardrail Displacement",
    expected_window: "Next 2–4 Days",
    expected_date: "Nov 28–30",
    risk_trend: "+36 pts",
    explanation: "Thermal expansion stress coupled with heavy commuter buses has displaced bridge expansion seal by 12mm.",
    factors: [
      "Bridge Joint Displacement: 12mm",
      "Heavy Bus Frequency: 320/hr",
      "Impact Acoustic Level: 81 dB",
      "Safety Margin: Reduced"
    ],
    action: "Tighten elastomeric bridge joints and reinforce safety barrier anchors."
  },
  {
    id: "FC-1906",
    road_name: "Grand Trunk (GT) Road Corridor",
    location: "Kanpur–Lucknow, Uttar Pradesh",
    road_class: "National Highway",
    coordinates: [26.8467, 80.9462],
    current_risk: "Medium",
    current_score: 51,
    forecast_risk: "High",
    forecast_score: 81,
    confidence: 85,
    predicted_issue: "Alligator Cracking & Base Subsidence",
    expected_window: "Next 3–5 Days",
    expected_date: "Nov 28–30",
    risk_trend: "+30 pts",
    explanation: "Water infiltration into lower unbound gravel layer causing localized bearing capacity reduction under freight trucks.",
    factors: [
      "Base Layer Saturation: 76%",
      "Freight Route Class: National Trunk",
      "Rutting Depth: 22mm",
      "Pavement Age: 4.2 years"
    ],
    action: "Milling of distressed 40mm wearing course followed by high-density asphalt overlay."
  }
];

function initForecastView() {
  renderForecastCards('all');
  initForecastMap();
  lucide.createIcons();
}
window.initForecastView = initForecastView;

function initForecastMap() {
  const mapContainer = document.getElementById('forecast-map');
  if (!mapContainer) return;

  if (!forecastMap) {
    forecastMap = L.map('forecast-map', {
      center: [21.5, 78.5],
      zoom: 5,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB &copy; OpenStreetMap',
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(forecastMap);

    forecastMarkersLayer = L.layerGroup().addTo(forecastMap);
  }

  setTimeout(() => {
    if (forecastMap) {
      forecastMap.invalidateSize();
      renderForecastMapMarkers('all');
    }
  }, 200);
}

function renderForecastMapMarkers(filter) {
  if (!forecastMarkersLayer || !forecastMap) return;
  forecastMarkersLayer.clearLayers();

  const items = ROAD_FORECAST_DATA.filter(item => {
    if (!filter || filter === 'all') return true;
    if (filter === 'high') return item.forecast_risk.toLowerCase() === 'high' || item.forecast_risk.toLowerCase() === 'critical';
    if (filter === 'medium') return item.forecast_risk.toLowerCase() === 'medium';
    if (filter === 'low') return item.forecast_risk.toLowerCase() === 'low';
    return true;
  });

  items.forEach(item => {
    const isHigh = item.forecast_risk.toLowerCase() === 'high' || item.forecast_risk.toLowerCase() === 'critical';
    const color = isHigh ? '#dc2626' : (item.forecast_risk.toLowerCase() === 'medium' ? '#f59e0b' : '#16a34a');
    const borderColor = isHigh ? '#fecaca' : (item.forecast_risk.toLowerCase() === 'medium' ? '#fef3c7' : '#bbf7d0');

    const iconHtml = `
      <div style="width: 28px; height: 28px; border-radius: 50%; background: ${color}; border: 2px solid ${borderColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: bold; cursor: pointer;">
        🔮
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'forecast-custom-pin',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker(item.coordinates, { icon: customIcon }).addTo(forecastMarkersLayer);
    
    marker.bindPopup(`
      <div style="background:#ffffff; color:#000; padding:10px; border-radius:10px; font-family:inherit; min-width:190px; border: 1px solid #cbd5e1;">
        <span style="font-size:10px; font-weight:bold; color:${color}; text-transform:uppercase; letter-spacing:0.5px;">${item.forecast_risk} Risk Forecast</span>
        <h4 style="font-size:12px; font-weight:bold; margin:4px 0 2px 0;">${item.road_name}</h4>
        <p style="font-size:11px; color:#475569; margin:0 0 6px 0;">${item.location}</p>
        <div style="display:flex; justify-content:space-between; font-size:11px; border-top:1px solid #e2e8f0; padding-top:6px;">
          <span>Risk: <strong style="color:${color}">${item.forecast_score}/100</strong></span>
          <span>Conf: <strong>${item.confidence}%</strong></span>
        </div>
      </div>
    `);

    marker.on('click', () => {
      openForecastDetailModal(item.id);
    });
  });
}

function renderForecastCards(filter) {
  const container = document.getElementById('forecast-corridors-list');
  if (!container) return;

  const items = ROAD_FORECAST_DATA.filter(item => {
    if (!filter || filter === 'all') return true;
    if (filter === 'high') return item.forecast_risk.toLowerCase() === 'high' || item.forecast_risk.toLowerCase() === 'critical';
    if (filter === 'medium') return item.forecast_risk.toLowerCase() === 'medium';
    if (filter === 'low') return item.forecast_risk.toLowerCase() === 'low';
    return true;
  });

  const countBadge = document.getElementById('forecast-roads-count');
  if (countBadge) {
    countBadge.textContent = `Showing ${items.length} Predictions`;
  }

  container.innerHTML = items.map(item => {
    const isCritical = item.forecast_risk.toLowerCase() === 'critical';
    const isHigh = item.forecast_risk.toLowerCase() === 'high' || isCritical;
    const badgeBg = isHigh ? 'bg-red-100 border-red-300 text-red-900' : (item.forecast_risk.toLowerCase() === 'medium' ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-emerald-100 border-emerald-300 text-emerald-900');
    const scoreColor = isHigh ? 'text-red-600' : (item.forecast_risk.toLowerCase() === 'medium' ? 'text-amber-600' : 'text-emerald-700');

    return `
      <div onclick="openForecastDetailModal('${item.id}')" class="bg-white hover:bg-slate-50 border border-slate-200 hover:border-purple-500 rounded-xl p-4 transition-all cursor-pointer shadow-xs group">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2 py-0.5 rounded text-[10px] font-black font-mono uppercase border ${badgeBg}">
                ${item.forecast_risk} Forecast
              </span>
              <span class="text-[11px] text-purple-700 font-mono font-bold">${item.confidence}% Confidence</span>
            </div>
            <h4 class="text-sm font-black text-black group-hover:text-purple-700 transition-colors">${item.road_name}</h4>
            <p class="text-xs text-slate-600 font-medium">${item.location} • ${item.road_class}</p>
          </div>
          <div class="text-right shrink-0">
            <span class="text-[10px] text-slate-500 font-mono font-bold block">Forecast Risk</span>
            <span class="text-xl font-black font-mono ${scoreColor}">${item.forecast_score}<span class="text-xs text-slate-500 font-normal">/100</span></span>
            <span class="text-[10px] text-purple-700 font-mono font-bold block">${item.risk_trend}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs mb-3">
          <div>
            <span class="text-[10px] text-slate-500 font-bold block">Predicted Issue</span>
            <span class="font-bold text-slate-900">${item.predicted_issue}</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-500 font-bold block">Expected Window</span>
            <span class="font-bold text-amber-700 font-mono">${item.expected_window} (${item.expected_date})</span>
          </div>
        </div>

        <p class="text-xs text-slate-600 line-clamp-2 italic mb-3 leading-relaxed font-medium">
          "${item.explanation}"
        </p>

        <div class="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
          <span class="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
            <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i> Preventive Action Available
          </span>
          <span class="text-purple-700 font-black text-[11px] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
            Inspect Corridor <i data-lucide="arrow-right" class="w-3 h-3"></i>
          </span>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function handleForecastFilterChange(filterVal) {
  renderForecastCards(filterVal);
  renderForecastMapMarkers(filterVal);
}
window.handleForecastFilterChange = handleForecastFilterChange;

function refreshForecastData() {
  const btn = document.querySelector('[onclick="refreshForecastData()"]');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 text-purple-200 animate-spin"></i> Updating Forecasts...`;
    lucide.createIcons();
  }

  setTimeout(() => {
    ROAD_FORECAST_DATA.forEach(d => {
      d.confidence = Math.min(98, Math.max(80, d.confidence + Math.floor((Math.random() - 0.5) * 3)));
    });
    renderForecastCards('all');
    renderForecastMapMarkers('all');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="sparkles" class="w-4 h-4 text-purple-200"></i> Run AI Forecast`;
      lucide.createIcons();
    }
  }, 600);
}
window.refreshForecastData = refreshForecastData;

function openForecastDetailModal(forecastId) {
  const item = ROAD_FORECAST_DATA.find(d => d.id === forecastId);
  if (!item) return;

  const modal = document.getElementById('road-forecast-modal');
  if (!modal) return;

  const badge = document.getElementById('fc-modal-badge-level');
  if (badge) {
    badge.textContent = `${item.forecast_risk.toUpperCase()} RISK`;
    badge.className = item.forecast_risk.toLowerCase() === 'high' || item.forecast_risk.toLowerCase() === 'critical'
      ? 'px-2.5 py-1 rounded text-xs font-black font-mono bg-red-100 border border-red-300 text-red-900'
      : 'px-2.5 py-1 rounded text-xs font-black font-mono bg-amber-100 border border-amber-300 text-amber-900';
  }

  const nameElem = document.getElementById('fc-modal-road-name');
  if (nameElem) nameElem.textContent = item.road_name;

  const locElem = document.getElementById('fc-modal-location');
  if (locElem) locElem.textContent = `${item.location} • ${item.road_class}`;

  const riskElem = document.getElementById('fc-modal-risk-score');
  if (riskElem) riskElem.textContent = `${item.forecast_score} / 100`;

  const confElem = document.getElementById('fc-modal-confidence');
  if (confElem) confElem.textContent = `${item.confidence}%`;

  const winElem = document.getElementById('fc-modal-window');
  if (winElem) winElem.textContent = item.expected_window;

  const expElem = document.getElementById('fc-modal-explanation');
  if (expElem) expElem.textContent = item.explanation;

  const factorsElem = document.getElementById('fc-modal-factors');
  if (factorsElem) {
    factorsElem.innerHTML = item.factors.map(f => `
      <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium">
        <i data-lucide="check" class="w-3.5 h-3.5 text-purple-700 shrink-0"></i>
        <span>${f}</span>
      </div>
    `).join('');
  }

  const actElem = document.getElementById('fc-modal-action');
  if (actElem) actElem.textContent = item.action;

  const gmapsElem = document.getElementById('fc-modal-gmaps-link');
  if (gmapsElem) {
    gmapsElem.href = `https://www.google.com/maps/search/?api=1&query=${item.coordinates[0]},${item.coordinates[1]}`;
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  lucide.createIcons();
}
window.openForecastDetailModal = openForecastDetailModal;

function closeForecastDetailModal() {
  const modal = document.getElementById('road-forecast-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeForecastDetailModal = closeForecastDetailModal;

// ==========================================
// FEATURE 2: RESOURCE INTELLIGENCE ENGINE
// ==========================================
const RESOURCE_TEAMS_DATA = [
  {
    id: "TEAM-A",
    name: "TEAM A (Rapid Asphalt Crew 1)",
    zone: "North Zone",
    status: "Available",
    workload: 20,
    equipment: "Jet Patcher (JP-04), Asphalt Roller",
    crew_size: "6 Technicians",
    recommended_assignment: "NH-52 Jaipur Pothole Cluster",
    priority: "HIGH"
  },
  {
    id: "TEAM-B",
    name: "TEAM B (Heavy Infrastructure Crew)",
    zone: "South Zone",
    status: "Busy",
    workload: 85,
    equipment: "Heavy Road Milling Machine (RM-02), Paver",
    crew_size: "8 Technicians",
    recommended_assignment: "Hosur Road Flyover Ramp Repair",
    priority: "CRITICAL"
  },
  {
    id: "TEAM-C",
    name: "TEAM C (Monsoon Drainage & Guardrail Unit)",
    zone: "West Zone",
    status: "Available",
    workload: 15,
    equipment: "High-Capacity Suction Pump (SP-01), Trench Digger",
    crew_size: "5 Technicians",
    recommended_assignment: "NH-48 Western Express Drainage Clearing",
    priority: "HIGH"
  },
  {
    id: "TEAM-D",
    name: "TEAM D (Signage & Safety Markings Team)",
    zone: "Central Zone",
    status: "Available",
    workload: 30,
    equipment: "Thermal Road Marking Truck, Crane Lifter",
    crew_size: "4 Technicians",
    recommended_assignment: "Delhi-Meerut Expressway Guardrail Anchors",
    priority: "MEDIUM"
  },
  {
    id: "TEAM-E",
    name: "TEAM E (Emergency Response Flying Squad)",
    zone: "City Metro Division",
    status: "Available",
    workload: 10,
    equipment: "Rapid Response Van, Polymer Cold Patch Kit",
    crew_size: "4 Specialists",
    recommended_assignment: "Hospital Emergency Corridor Standby",
    priority: "CRITICAL"
  },
  {
    id: "TEAM-F",
    name: "TEAM F (Structural Base & Concrete Team)",
    zone: "East Zone",
    status: "Busy",
    workload: 90,
    equipment: "Concrete Mixer, Vibratory Compactor, Breakers",
    crew_size: "7 Technicians",
    recommended_assignment: "GT Road Kanpur Base Subsidence",
    priority: "HIGH"
  }
];

const PRIORITY_ALLOCATION_DATA = [
  {
    id: "HAZ-001",
    hazard_title: "Major Pothole Cluster (12cm Deep)",
    location: "NH-52 (Jaipur–Sikar Expressway)",
    severity: "CRITICAL",
    risk_score: 96,
    required_equipment: "Jet Patcher, Roller",
    recommended_crew: "TEAM A (North Zone)",
    est_duration: "3.5 Hours",
    status: "Ready for Dispatch"
  },
  {
    id: "HAZ-002",
    hazard_title: "Active Monsoon Waterlogging (18cm)",
    location: "NH-48 Western Express (Mumbai)",
    severity: "HIGH",
    risk_score: 84,
    required_equipment: "High-Capacity Suction Pump",
    recommended_crew: "TEAM C (West Zone)",
    est_duration: "2.0 Hours",
    status: "Ready for Dispatch"
  },
  {
    id: "HAZ-003",
    hazard_title: "High-Impact Guardrail Deformation",
    location: "Delhi–Meerut Expressway (Delhi NCR)",
    severity: "HIGH",
    risk_score: 79,
    required_equipment: "Crane Lifter, Hydraulic Bender",
    recommended_crew: "TEAM D (Central Zone)",
    est_duration: "4.0 Hours",
    status: "Ready for Dispatch"
  },
  {
    id: "HAZ-004",
    hazard_title: "Flyover Ramp Edge Collapse Risk",
    location: "Hosur Road Corridor (Bengaluru)",
    severity: "CRITICAL",
    risk_score: 92,
    required_equipment: "Milling Machine, Rapid Polymer Kit",
    recommended_crew: "TEAM E (Flying Squad)",
    est_duration: "1.5 Hours",
    status: "Allocated"
  },
  {
    id: "HAZ-005",
    hazard_title: "Subgrade Base Fissure & Cavity",
    location: "GT Road (Kanpur–Lucknow, UP)",
    severity: "HIGH",
    risk_score: 81,
    required_equipment: "Concrete Mixer, Compactor",
    recommended_crew: "TEAM F (East Zone)",
    est_duration: "5.0 Hours",
    status: "In Progress"
  }
];

function initResourceIntelligenceView() {
  renderResourceTeams('all');
  renderAllocationTable();
  updateResourceKPIs();
  lucide.createIcons();
}
window.initResourceIntelligenceView = initResourceIntelligenceView;

function updateResourceKPIs() {
  const availableCount = RESOURCE_TEAMS_DATA.filter(t => t.status.toLowerCase() === 'available').length;
  const busyCount = RESOURCE_TEAMS_DATA.filter(t => t.status.toLowerCase() === 'busy').length;
  
  const availEl = document.getElementById('res-kpi-available-teams');
  if (availEl) availEl.textContent = `${availableCount} Teams`;

  const busyEl = document.getElementById('res-kpi-busy-teams');
  if (busyEl) busyEl.textContent = `${busyCount} Teams`;

  const avgWorkload = Math.round(RESOURCE_TEAMS_DATA.reduce((acc, t) => acc + t.workload, 0) / RESOURCE_TEAMS_DATA.length);
  const utilEl = document.getElementById('res-kpi-utilization');
  if (utilEl) utilEl.textContent = `${avgWorkload}%`;
}

function renderResourceTeams(filter) {
  const container = document.getElementById('resource-teams-grid');
  if (!container) return;

  const items = RESOURCE_TEAMS_DATA.filter(team => {
    if (!filter || filter === 'all') return true;
    return team.status.toLowerCase() === filter.toLowerCase();
  });

  container.innerHTML = items.map(team => {
    const isAvail = team.status.toLowerCase() === 'available';
    const statusBg = isAvail ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-amber-100 border-amber-300 text-amber-900';
    const workloadColor = team.workload > 75 ? 'bg-red-600' : (team.workload > 40 ? 'bg-amber-500' : 'bg-emerald-600');

    return `
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between gap-3 text-black">
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <span class="px-2 py-0.5 rounded text-[10px] font-black font-mono uppercase border ${statusBg}">
                ${team.status}
              </span>
              <h4 class="text-sm font-black text-black mt-1">${team.name}</h4>
              <p class="text-xs text-slate-600 font-medium">${team.zone} • ${team.crew_size}</p>
            </div>
            <span class="text-xs font-mono font-black ${team.priority === 'CRITICAL' ? 'text-red-600' : (team.priority === 'HIGH' ? 'text-amber-600' : 'text-blue-800')}">
              ${team.priority}
            </span>
          </div>

          <div class="space-y-1 mb-3">
            <div class="flex justify-between text-[11px] font-mono font-bold text-slate-600">
              <span>Workload Capacity</span>
              <span class="text-black font-black">${team.workload}%</span>
            </div>
            <div class="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div class="${workloadColor} h-1.5 rounded-full transition-all duration-500" style="width: ${team.workload}%"></div>
            </div>
          </div>

          <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1.5 mb-2">
            <div>
              <span class="text-[10px] text-slate-500 font-bold block uppercase font-mono">Assigned Equipment</span>
              <span class="text-black font-bold">${team.equipment}</span>
            </div>
            <div class="pt-1 border-t border-slate-200">
              <span class="text-[10px] text-slate-500 font-bold block uppercase font-mono">Recommended Task</span>
              <span class="text-cyan-900 font-bold">${team.recommended_assignment}</span>
            </div>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-200 flex items-center justify-between">
          <span class="text-[11px] text-slate-500 font-mono font-bold">ID: ${team.id}</span>
          <button onclick="dispatchRepairTeam('${team.id}')" ${!isAvail ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg text-xs font-black ${isAvail ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs' : 'bg-slate-200 text-slate-400 cursor-not-allowed'} transition-all">
            ${isAvail ? 'Dispatch Crew ↗' : 'Active On Site'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function filterResourceTeams(status) {
  document.querySelectorAll('.res-team-filter').forEach(btn => {
    btn.classList.remove('bg-slate-900', 'text-white', 'border', 'border-slate-700');
    btn.classList.add('bg-white', 'text-slate-700', 'border', 'border-slate-300');
  });

  const activeBtn = document.getElementById(`res-filter-${status}`);
  if (activeBtn) {
    activeBtn.classList.remove('bg-white', 'text-slate-700', 'border', 'border-slate-300');
    activeBtn.classList.add('bg-slate-900', 'text-white', 'border', 'border-slate-700');
  }

  renderResourceTeams(status);
}
window.filterResourceTeams = filterResourceTeams;

function renderAllocationTable() {
  const tbody = document.getElementById('resource-allocation-table-body');
  if (!tbody) return;

  tbody.innerHTML = PRIORITY_ALLOCATION_DATA.map(item => {
    const isCrit = item.severity === 'CRITICAL';
    const sevBadge = isCrit ? 'bg-red-100 border-red-300 text-red-900' : 'bg-amber-100 border-amber-300 text-amber-900';
    const isAllocated = item.status === 'Allocated' || item.status === 'In Progress';

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-3">
          <p class="font-black text-black">${item.hazard_title}</p>
          <span class="text-[10px] font-mono font-bold text-slate-500">ID: ${item.id}</span>
        </td>
        <td class="py-3 px-3 text-slate-700 font-medium">${item.location}</td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-black font-mono border ${sevBadge}">${item.severity}</span>
          <span class="text-xs font-mono font-bold text-slate-700 ml-1.5">${item.risk_score} pts</span>
        </td>
        <td class="py-3 px-3 text-slate-700 font-mono text-[11px] font-bold">${item.required_equipment}</td>
        <td class="py-3 px-3 font-bold text-cyan-900">${item.recommended_crew}</td>
        <td class="py-3 px-3 font-mono font-bold text-slate-600">${item.est_duration}</td>
        <td class="py-3 px-3 text-right">
          <button onclick="dispatchRepairTask('${item.id}')" ${isAllocated ? 'disabled' : ''} class="px-3 py-1 rounded-lg text-xs font-black ${isAllocated ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-700 text-white cursor-pointer shadow-xs'} transition-all">
            ${isAllocated ? 'Dispatched ✓' : 'Auto-Allocate'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
}

function dispatchRepairTeam(teamId) {
  const team = RESOURCE_TEAMS_DATA.find(t => t.id === teamId);
  if (!team) return;

  team.status = "Busy";
  team.workload = Math.min(100, team.workload + 40);
  renderResourceTeams('all');
  updateResourceKPIs();
  alert(`Dispatched ${team.name} to ${team.recommended_assignment}!`);
}
window.dispatchRepairTeam = dispatchRepairTeam;

function dispatchRepairTask(taskId) {
  const task = PRIORITY_ALLOCATION_DATA.find(t => t.id === taskId);
  if (!task) return;

  task.status = "Allocated";
  renderAllocationTable();
  alert(`Allocated ${task.recommended_crew} to ${task.hazard_title}!`);
}
window.dispatchRepairTask = dispatchRepairTask;

function runAutoAllocation() {
  const btn = document.querySelector('[onclick="runAutoAllocation()"]');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Optimizing Allocations...`;
    lucide.createIcons();
  }

  setTimeout(() => {
    PRIORITY_ALLOCATION_DATA.forEach(task => {
      task.status = "Allocated";
    });
    RESOURCE_TEAMS_DATA.forEach(t => {
      if (t.status === "Available") {
        t.workload = Math.min(85, t.workload + 35);
      }
    });
    renderResourceTeams('all');
    renderAllocationTable();
    updateResourceKPIs();

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="sparkles" class="w-4 h-4"></i> Auto-Allocation Complete ✓`;
      lucide.createIcons();
      setTimeout(() => {
        btn.innerHTML = `<i data-lucide="sparkles" class="w-4 h-4"></i> Run AI Auto-Allocation`;
        lucide.createIcons();
      }, 3000);
    }
  }, 700);
}
window.runAutoAllocation = runAutoAllocation;

// ==========================================
// MAP FULLSCREEN CONTROL
// ==========================================
function toggleMapFullscreen() {
  const mapWrapper = document.getElementById('map-container-box');
  if (!mapWrapper) return;

  if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
    if (mapWrapper.requestFullscreen) {
      mapWrapper.requestFullscreen();
    } else if (mapWrapper.webkitRequestFullscreen) {
      mapWrapper.webkitRequestFullscreen();
    } else if (mapWrapper.msRequestFullscreen) {
      mapWrapper.msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}
window.toggleMapFullscreen = toggleMapFullscreen;

function handleMapFullscreenChange() {
  const icon = document.getElementById('icon-map-fullscreen');
  const text = document.getElementById('text-map-fullscreen');
  const mapWrapper = document.getElementById('map-container-box');
  const isFs = (document.fullscreenElement === mapWrapper) || 
               (document.webkitFullscreenElement === mapWrapper) || 
               (document.msFullscreenElement === mapWrapper);

  if (isFs) {
    if (icon) icon.setAttribute('data-lucide', 'minimize-2');
    if (text) text.textContent = 'Exit Fullscreen';
  } else {
    if (icon) icon.setAttribute('data-lucide', 'maximize-2');
    if (text) text.textContent = 'Fullscreen';
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  if (gisMap) {
    setTimeout(() => gisMap.invalidateSize(), 100);
    setTimeout(() => gisMap.invalidateSize(), 300);
  }
}

document.addEventListener('fullscreenchange', handleMapFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleMapFullscreenChange);
document.addEventListener('msfullscreenchange', handleMapFullscreenChange);

// ==========================================
// BULLETPROOF FIXED / STICKY FILTER BAR ON SCROLL
// ==========================================
function initStickyFilterDock() {
  const filterDock = document.getElementById('sticky-filter-dock');
  const filterWrapper = document.getElementById('sticky-filter-wrapper');
  if (!filterDock || !filterWrapper) return;

  function updateDock() {
    const wrapperRect = filterWrapper.getBoundingClientRect();
    if (wrapperRect.top <= 0) {
      if (!filterDock.classList.contains('is-docked')) {
        filterWrapper.style.height = `${filterDock.offsetHeight}px`;
        filterDock.classList.add('is-docked');
      }
    } else {
      if (filterDock.classList.contains('is-docked')) {
        filterDock.classList.remove('is-docked');
        filterWrapper.style.height = 'auto';
      }
    }
  }

  window.addEventListener('scroll', updateDock, { passive: true });
  document.addEventListener('scroll', updateDock, { passive: true });
  window.addEventListener('resize', () => {
    if (!filterDock.classList.contains('is-docked')) {
      filterWrapper.style.height = 'auto';
    }
  });
  updateDock();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStickyFilterDock);
} else {
  initStickyFilterDock();
}

// ==========================================
// ROAD INFRASTRUCTURE GALLERY LIGHTBOX
// ==========================================
function openGalleryModal(imgSrc, title, tag, desc) {
  const modal = document.getElementById('gallery-lightbox-modal');
  const imgElem = document.getElementById('gallery-lightbox-img');
  const titleElem = document.getElementById('gallery-lightbox-title');
  const tagElem = document.getElementById('gallery-lightbox-tag');
  const descElem = document.getElementById('gallery-lightbox-desc');

  if (imgElem) imgElem.src = imgSrc;
  if (titleElem) titleElem.textContent = title;
  if (tagElem) tagElem.textContent = tag;
  if (descElem) descElem.textContent = desc;

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}
window.openGalleryModal = openGalleryModal;

function closeGalleryModal() {
  const modal = document.getElementById('gallery-lightbox-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeGalleryModal = closeGalleryModal;


