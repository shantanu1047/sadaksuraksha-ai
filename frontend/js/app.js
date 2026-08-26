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
let currentStateFilter = 'all';
let currentCityFilter = 'all';
let currentCategoryFilter = 'all';
let currentMapSeverityFilter = 'all';
let currentSearchQuery = '';
let selectedHazard = null;
let userApiKey = localStorage.getItem('SADAKSURAKSHA_GEMINI_KEY') || localStorage.getItem('SADAKSUKHA_GEMINI_KEY') || localStorage.getItem('AERO_GEMINI_KEY') || '';

// Indian Geographic Center Coordinates by State
const STATE_VIEWPORTS = {
  all: { center: [22.5937, 78.9629], zoom: 4.8 },
  "Andhra Pradesh": { center: [17.7200, 83.3200], zoom: 11 },
  Assam: { center: [26.1600, 91.7700], zoom: 11 },
  "Delhi NCR": { center: [28.5672, 77.1800], zoom: 11 },
  Goa: { center: [15.5000, 73.8350], zoom: 11 },
  Gujarat: { center: [23.0300, 72.5300], zoom: 11 },
  "Jammu & Kashmir": { center: [34.0600, 74.8300], zoom: 11 },
  Karnataka: { center: [12.9550, 77.6400], zoom: 12 },
  Kerala: { center: [9.9700, 76.3200], zoom: 11 },
  "Madhya Pradesh": { center: [22.7500, 75.8900], zoom: 11 },
  Maharashtra: { center: [19.0000, 73.0000], zoom: 10 },
  Odisha: { center: [20.2700, 85.8000], zoom: 11 },
  "Punjab & Haryana": { center: [30.7500, 76.7800], zoom: 11 },
  Rajasthan: { center: [26.8900, 75.8000], zoom: 11 },
  "Tamil Nadu": { center: [13.0100, 80.2400], zoom: 12 },
  Telangana: { center: [17.4200, 78.3600], zoom: 12 },
  "Uttar Pradesh": { center: [27.1800, 78.0100], zoom: 9 },
  "West Bengal": { center: [22.5400, 88.3900], zoom: 12 }
};

// State-to-City Directory (Alphabetically Sorted Cities)
const STATE_CITY_MAPPING = {
  all: [],
  "Andhra Pradesh": ["Guntur", "Tirupati", "Vijayawada", "Visakhapatnam"],
  Assam: ["Dibrugarh", "Guwahati", "Jorhat", "Silchar"],
  "Delhi NCR": ["Faridabad", "Ghaziabad", "Gurugram", "New Delhi", "Noida"],
  Goa: ["Mapusa", "Margao", "Panaji", "Vasco da Gama"],
  Gujarat: ["Ahmedabad", "Gandhinagar", "Rajkot", "Surat", "Vadodara"],
  "Jammu & Kashmir": ["Anantnag", "Baramulla", "Jammu", "Srinagar"],
  Karnataka: ["Belagavi", "Bengaluru", "Hubballi-Dharwad", "Mangaluru", "Mysuru"],
  Kerala: ["Kochi", "Kozhikode", "Thiruvananthapuram", "Thrissur"],
  "Madhya Pradesh": ["Bhopal", "Gwalior", "Indore", "Jabalpur", "Ujjain"],
  Maharashtra: ["Aurangabad", "Mumbai", "Nagpur", "Nashik", "Pune", "Thane"],
  Odisha: ["Bhubaneswar", "Cuttack", "Puri", "Rourkela"],
  "Punjab & Haryana": ["Amritsar", "Chandigarh", "Jalandhar", "Ludhiana"],
  Rajasthan: ["Ajmer", "Jaipur", "Jodhpur", "Kota", "Udaipur"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
  Telangana: ["Hyderabad", "Karimnagar", "Nizamabad", "Warangal"],
  "Uttar Pradesh": ["Agra", "Kanpur", "Lucknow", "Noida", "Prayagraj", "Varanasi"],
  "West Bengal": ["Asansol", "Durgapur", "Howrah", "Kolkata", "Siliguri"]
};

// City Geographic Viewports for Smooth Zoom & Panning
const CITY_VIEWPORTS = {
  Bengaluru: { center: [12.9716, 77.5946], zoom: 12 },
  Belagavi: { center: [15.8497, 74.4977], zoom: 12 },
  "Hubballi-Dharwad": { center: [15.3647, 75.1240], zoom: 12 },
  Mangaluru: { center: [12.9141, 74.8560], zoom: 12 },
  Mysuru: { center: [12.2958, 76.6394], zoom: 12 },
  Mumbai: { center: [19.0760, 72.8777], zoom: 11 },
  Pune: { center: [18.5204, 73.8567], zoom: 12 },
  Aurangabad: { center: [19.8762, 75.3433], zoom: 12 },
  Nagpur: { center: [21.1458, 79.0882], zoom: 12 },
  Nashik: { center: [19.9975, 73.7898], zoom: 12 },
  Thane: { center: [19.2183, 72.9781], zoom: 12 },
  "New Delhi": { center: [28.6139, 77.2090], zoom: 12 },
  Faridabad: { center: [28.4089, 77.3178], zoom: 12 },
  Ghaziabad: { center: [28.6692, 77.4538], zoom: 12 },
  Gurugram: { center: [28.4595, 77.0266], zoom: 12 },
  Noida: { center: [28.5355, 77.3910], zoom: 12 },
  Chennai: { center: [13.0827, 80.2707], zoom: 12 },
  Coimbatore: { center: [11.0168, 76.9558], zoom: 12 },
  Madurai: { center: [9.9252, 78.1198], zoom: 12 },
  Salem: { center: [11.6643, 78.1460], zoom: 12 },
  Tiruchirappalli: { center: [10.7905, 78.7047], zoom: 12 },
  Hyderabad: { center: [17.3850, 78.4867], zoom: 12 },
  Karimnagar: { center: [18.4386, 79.1288], zoom: 12 },
  Nizamabad: { center: [18.6725, 78.0941], zoom: 12 },
  Warangal: { center: [17.9689, 79.5941], zoom: 12 },
  Agra: { center: [27.1767, 78.0081], zoom: 12 },
  Kanpur: { center: [26.4499, 80.3319], zoom: 12 },
  Lucknow: { center: [26.8467, 80.9462], zoom: 12 },
  Prayagraj: { center: [25.4358, 81.8463], zoom: 12 },
  Varanasi: { center: [25.3176, 82.9739], zoom: 12 },
  Kolkata: { center: [22.5726, 88.3639], zoom: 12 },
  Asansol: { center: [23.6739, 86.9524], zoom: 12 },
  Durgapur: { center: [23.5204, 87.3119], zoom: 12 },
  Howrah: { center: [22.5958, 88.2636], zoom: 12 },
  Siliguri: { center: [26.7271, 88.3953], zoom: 12 },
  Ahmedabad: { center: [23.0225, 72.5714], zoom: 12 },
  Gandhinagar: { center: [23.2156, 72.6369], zoom: 12 },
  Rajkot: { center: [22.3039, 70.8022], zoom: 12 },
  Surat: { center: [21.1702, 72.8311], zoom: 12 },
  Vadodara: { center: [22.3072, 73.1812], zoom: 12 },
  Jaipur: { center: [26.9124, 75.7873], zoom: 12 },
  Ajmer: { center: [26.4499, 74.6399], zoom: 12 },
  Jodhpur: { center: [26.2389, 73.0243], zoom: 12 },
  Kota: { center: [25.2138, 75.8648], zoom: 12 },
  Udaipur: { center: [24.5854, 73.7125], zoom: 12 },
  Kochi: { center: [9.9312, 76.2673], zoom: 12 },
  Kozhikode: { center: [11.2588, 75.7804], zoom: 12 },
  Thiruvananthapuram: { center: [8.5241, 76.9366], zoom: 12 },
  Thrissur: { center: [10.5276, 76.2144], zoom: 12 },
  Chandigarh: { center: [30.7333, 76.7794], zoom: 12 },
  Amritsar: { center: [31.6340, 74.8723], zoom: 12 },
  Jalandhar: { center: [31.3260, 75.5762], zoom: 12 },
  Ludhiana: { center: [30.9010, 75.8573], zoom: 12 },
  Indore: { center: [22.7196, 75.8577], zoom: 12 },
  Bhopal: { center: [23.2599, 77.4126], zoom: 12 },
  Gwalior: { center: [26.2183, 78.1828], zoom: 12 },
  Jabalpur: { center: [23.1815, 79.9864], zoom: 12 },
  Ujjain: { center: [23.1765, 75.7885], zoom: 12 },
  Bhubaneswar: { center: [20.2961, 85.8245], zoom: 12 },
  Cuttack: { center: [20.4625, 85.8828], zoom: 12 },
  Puri: { center: [19.8135, 85.8312], zoom: 12 },
  Rourkela: { center: [22.2604, 84.8536], zoom: 12 },
  Guwahati: { center: [26.1445, 91.7362], zoom: 12 },
  Dibrugarh: { center: [27.4728, 94.9120], zoom: 12 },
  Jorhat: { center: [26.7509, 94.2037], zoom: 12 },
  Silchar: { center: [24.8333, 92.7789], zoom: 12 },
  Srinagar: { center: [34.0837, 74.7973], zoom: 12 },
  Anantnag: { center: [33.7311, 75.1500], zoom: 12 },
  Baramulla: { center: [34.1980, 74.3636], zoom: 12 },
  Jammu: { center: [32.7266, 74.8570], zoom: 12 },
  Visakhapatnam: { center: [17.6868, 83.2185], zoom: 12 },
  Guntur: { center: [16.3067, 80.4365], zoom: 12 },
  Tirupati: { center: [13.6288, 79.4192], zoom: 12 },
  Vijayawada: { center: [16.5062, 80.6480], zoom: 12 },
  Panaji: { center: [15.4909, 73.8278], zoom: 12 },
  Mapusa: { center: [15.5937, 73.8142], zoom: 12 },
  Margao: { center: [15.2832, 73.9862], zoom: 12 },
  "Vasco da Gama": { center: [15.3982, 73.8113], zoom: 12 }
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
  updateApiKeyDisplay();
  setupGlobalInteractionHandlers();
  
  // Set default state selector and populate dependent city dropdown
  const stateSelect = document.getElementById('state-selector');
  if (stateSelect) {
    stateSelect.value = currentStateFilter;
    populateCityDropdown(currentStateFilter);
  }

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
    const stateParam = currentStateFilter === 'all' ? '' : `?state=${encodeURIComponent(currentStateFilter)}`;
    const [hazardsRes, roadsRes, workOrdersRes, analyticsRes] = await Promise.all([
      fetch('/api/hazards'),
      fetch('/api/roads'),
      fetch('/api/work-orders'),
      fetch(`/api/analytics/summary${stateParam}`)
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

  const rawCities = STATE_CITY_MAPPING[selectedState] || [];
  const sortedCities = [...rawCities].sort((a, b) => a.localeCompare(b));

  citySelect.innerHTML = '<option value="all">Select City</option>' + 
    sortedCities.map(c => `<option value="${c}">${c}</option>`).join('');

  citySelect.value = 'all';
  currentCityFilter = 'all';
}
window.populateCityDropdown = populateCityDropdown;

function handleCityChange(selectedCity) {
  currentCityFilter = selectedCity;
  dismissActiveOverlays();

  if (selectedCity !== 'all' && CITY_VIEWPORTS[selectedCity] && gisMap) {
    gisMap.flyTo(CITY_VIEWPORTS[selectedCity].center, CITY_VIEWPORTS[selectedCity].zoom, { duration: 1.2 });
  } else if (selectedCity === 'all' && STATE_VIEWPORTS[currentStateFilter] && gisMap) {
    gisMap.flyTo(STATE_VIEWPORTS[currentStateFilter].center, STATE_VIEWPORTS[currentStateFilter].zoom, { duration: 1.2 });
  }

  applyStateAndSearchFilters();
}
window.handleCityChange = handleCityChange;

function handleStateChange(selectedState) {
  currentStateFilter = selectedState;

  // Populate & reset dependent city dropdown
  populateCityDropdown(selectedState);

  // Dismiss any open modals and popups
  dismissActiveOverlays();

  // Smoothly pan map to selected State viewport
  const vp = STATE_VIEWPORTS[selectedState] || STATE_VIEWPORTS.all;
  if (gisMap) {
    gisMap.flyTo(vp.center, vp.zoom, { duration: 1.4 });
  }

  // Refilter and update view
  applyStateAndSearchFilters();

  // Refresh analytics for selected state
  const stateParam = selectedState === 'all' ? '' : `?state=${encodeURIComponent(selectedState)}`;
  fetch(`/api/analytics/summary${stateParam}`)
    .then(r => r.json())
    .then(analytics => {
      updateKpiBar(analytics);
      updateAnalyticsCharts(analytics, allRoads);
    });
}
window.handleStateChange = handleStateChange;

function handleSearchFilter(query) {
  currentSearchQuery = query.toLowerCase().trim();
  applyStateAndSearchFilters();
}

let currentWorkflowFilter = 'all';

function setWorkflowFilter(status) {
  currentWorkflowFilter = status;
  dismissActiveOverlays();

  document.querySelectorAll('.workflow-pill').forEach(btn => {
    if (btn.getAttribute('data-workflow') === status) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  applyStateAndSearchFilters();
}
window.setWorkflowFilter = setWorkflowFilter;

function getHazardWorkflowStatus(h) {
  const s = (h.status || '').toLowerCase().trim();
  if (s === 'resolved' || s === 'completed') return 'resolved';
  if (s === 'in progress' || s === 'in_progress' || s === 'assigned' || s === 'scheduled') return 'in_progress';
  if (s === 'unresolved' || s === 'active' || s === 'open') return 'unresolved';
  if (s === 'needs review' || s === 'needs_review' || s === 'pending_review') return 'needs_review';

  if (allWorkOrders && allWorkOrders.some(wo => wo.status === 'completed' && wo.target_hazard_ids && wo.target_hazard_ids.includes(h.id))) {
    return 'resolved';
  }
  if (allWorkOrders && allWorkOrders.some(wo => (wo.status === 'in_progress' || wo.status === 'scheduled' || wo.status === 'assigned') && wo.target_hazard_ids && wo.target_hazard_ids.includes(h.id))) {
    return 'in_progress';
  }

  return 'unresolved';
}
window.getHazardWorkflowStatus = getHazardWorkflowStatus;

function getHazardIconName(hazardType) {
  const ht = (hazardType || '').toLowerCase().trim();
  if (ht === 'pothole') return 'circle-dot';
  if (ht === 'standing_water' || ht === 'waterlogging') return 'waves';
  if (ht === 'damaged_guardrail' || ht === 'guardrail') return 'shield-alert';
  if (ht === 'debris') return 'mountain';
  if (ht === 'obscured_sign' || ht === 'signage') return 'signpost';
  return 'help-circle';
}
window.getHazardIconName = getHazardIconName;

// ==========================================
// MAP SEVERITY QUICK FILTER (BOTTOM-LEFT MAP OVERLAY)
// ==========================================
function filterMapSeverity(severity) {
  currentMapSeverityFilter = (severity || 'all').toLowerCase();

  // Update map severity UI buttons active state
  document.querySelectorAll('#map-severity-filter .map-severity-btn').forEach(btn => {
    if (btn.getAttribute('data-severity') === currentMapSeverityFilter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  dismissActiveOverlays();
  applyStateAndSearchFilters();
}
window.filterMapSeverity = filterMapSeverity;

// ==========================================
// ADVANCED SORT & FILTER INTELLIGENCE
// ==========================================
let advFilters = {
  type: 'all',
  auth: 'all',
  timeline: 'all',
  cost: 'all',
  sort: 'risk_desc'
};

function toggleAdvancedFilterPopover() {
  const pop = document.getElementById('adv-filter-popover');
  if (!pop) return;
  if (pop.classList.contains('hidden')) {
    syncAdvFilterFormValues();
    pop.classList.remove('hidden');
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  } else {
    pop.classList.add('hidden');
  }
}
window.toggleAdvancedFilterPopover = toggleAdvancedFilterPopover;

function closeAdvancedFilterPopover() {
  const pop = document.getElementById('adv-filter-popover');
  if (pop) pop.classList.add('hidden');
}
window.closeAdvancedFilterPopover = closeAdvancedFilterPopover;

function syncAdvFilterFormValues() {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  };
  setVal('adv-filter-type', advFilters.type);
  setVal('adv-filter-auth', advFilters.auth);
  setVal('adv-filter-timeline', advFilters.timeline);
  setVal('adv-filter-cost', advFilters.cost);
  setVal('adv-filter-sort', advFilters.sort);
}

function applyAdvancedFilters() {
  const getVal = (id, fallback = 'all') => {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
  };

  advFilters.type = getVal('adv-filter-type');
  advFilters.auth = getVal('adv-filter-auth');
  advFilters.timeline = getVal('adv-filter-timeline');
  advFilters.cost = getVal('adv-filter-cost');
  advFilters.sort = getVal('adv-filter-sort', 'risk_desc');

  closeAdvancedFilterPopover();
  applyStateAndSearchFilters();
}
window.applyAdvancedFilters = applyAdvancedFilters;

function resetAdvancedFilters() {
  advFilters = {
    type: 'all',
    auth: 'all',
    timeline: 'all',
    cost: 'all',
    sort: 'risk_desc'
  };
  syncAdvFilterFormValues();
  closeAdvancedFilterPopover();
  applyStateAndSearchFilters();
}
window.resetAdvancedFilters = resetAdvancedFilters;

function countActiveAdvFilters() {
  let count = 0;
  if (advFilters.type !== 'all') count++;
  if (advFilters.auth !== 'all') count++;
  if (advFilters.timeline !== 'all') count++;
  if (advFilters.cost !== 'all') count++;
  if (advFilters.sort !== 'risk_desc') count++;
  return count;
}

function getFilteredHazards() {
  const filtered = allHazards.filter(h => {
    // 1. State Filter (Global state selector in header)
    const matchesState = (currentStateFilter === 'all') || (h.state && h.state.toLowerCase() === currentStateFilter.toLowerCase());
    if (!matchesState) return false;
    
    // 2. City Filter (Global header city selector if selected)
    const matchesCity = (currentCityFilter === 'all') || (h.city && h.city.toLowerCase() === currentCityFilter.toLowerCase());
    if (!matchesCity) return false;

    // 3. Map Severity Filter (Bottom-left map control: ALL / CRITICAL / HIGH / LOW)
    if (currentMapSeverityFilter !== 'all') {
      if ((h.severity || '').toLowerCase() !== currentMapSeverityFilter) {
        return false;
      }
    }

    // 4. Workflow Status Filter (Quick filter pills if selected)
    const matchesWorkflow = (currentWorkflowFilter === 'all') || (getHazardWorkflowStatus(h) === currentWorkflowFilter);
    if (!matchesWorkflow) return false;

    // 5. Adv Issue Type Filter (All, Pothole, Waterlogging, Guardrail, Debris, Signage, Other)
    let matchesAdvType = true;
    if (advFilters.type !== 'all') {
      const ht = (h.hazard_type || '').toLowerCase();
      if (advFilters.type === 'pothole') {
        matchesAdvType = (ht === 'pothole');
      } else if (advFilters.type === 'waterlogging' || advFilters.type === 'standing_water') {
        matchesAdvType = (ht === 'standing_water' || ht === 'waterlogging');
      } else if (advFilters.type === 'guardrail' || advFilters.type === 'damaged_guardrail') {
        matchesAdvType = (ht === 'damaged_guardrail' || ht === 'guardrail');
      } else if (advFilters.type === 'debris') {
        matchesAdvType = (ht === 'debris');
      } else if (advFilters.type === 'signage' || advFilters.type === 'obscured_sign') {
        matchesAdvType = (ht === 'obscured_sign' || ht === 'signage');
      } else if (advFilters.type === 'other') {
        matchesAdvType = (ht === 'other' || ht === 'alligator_crack' || ht === 'longitudinal_crack' || ht === 'rutting');
      }
      if (!matchesAdvType) return false;
    }

    // 6. Authenticity / AI Verification Filter
    if (advFilters.auth !== 'all') {
      const isFP = h.fusion && h.fusion.is_false_positive;
      if (advFilters.auth === 'verified_only' && isFP) return false;
      if (advFilters.auth === 'exclude_fp' && isFP) return false;
    }

    // 7. Adv Repair Timeline Filter
    let matchesAdvTimeline = true;
    if (advFilters.timeline !== 'all') {
      const urg = (h.priority && h.priority.dispatch_urgency ? h.priority.dispatch_urgency.toLowerCase() : '');
      const risk = (h.priority && h.priority.raw_risk_score) || 0;
      if (advFilters.timeline === '24h') {
        matchesAdvTimeline = (h.severity === 'critical' || urg.includes('immediate') || urg.includes('24') || risk >= 80);
      } else if (advFilters.timeline === '1_3d') {
        matchesAdvTimeline = (h.severity === 'high' || (risk >= 60 && risk < 80) || urg.includes('scheduled'));
      } else if (advFilters.timeline === '3_7d') {
        matchesAdvTimeline = (h.severity === 'medium' || (risk >= 40 && risk < 60));
      } else if (advFilters.timeline === '7d_plus') {
        matchesAdvTimeline = (h.severity === 'low' || risk < 40 || urg.includes('deferred') || urg.includes('routine'));
      }
      if (!matchesAdvTimeline) return false;
    }

    // 8. Adv Repair Cost Filter
    let matchesAdvCost = true;
    if (advFilters.cost !== 'all') {
      const costVal = (h.priority && h.priority.estimated_repair_cost_usd) || 0;
      if (advFilters.cost === 'under_10k') matchesAdvCost = (costVal < 10000);
      else if (advFilters.cost === '10k_25k') matchesAdvCost = (costVal >= 10000 && costVal <= 25000);
      else if (advFilters.cost === '25k_50k') matchesAdvCost = (costVal > 25000 && costVal <= 50000);
      else if (advFilters.cost === 'above_50k') matchesAdvCost = (costVal > 50000);
      if (!matchesAdvCost) return false;
    }

    // 9. Search Query Filter (State, City, Road Name, Title, Type)
    let matchesSearch = true;
    if (currentSearchQuery) {
      const haystack = `${h.id} ${h.title} ${h.state} ${h.city} ${h.road_name} ${h.address} ${h.hazard_type}`.toLowerCase();
      matchesSearch = haystack.includes(currentSearchQuery);
      if (!matchesSearch) return false;
    }

    return matchesState && matchesCity && matchesWorkflow && matchesAdvType && matchesAdvTimeline && matchesAdvCost && matchesSearch;
  });

  // Apply Sorting
  filtered.sort((a, b) => {
    const riskA = (a.priority && a.priority.raw_risk_score) || 0;
    const riskB = (b.priority && b.priority.raw_risk_score) || 0;
    const costA = (a.priority && a.priority.estimated_repair_cost_usd) || 0;
    const costB = (b.priority && b.priority.estimated_repair_cost_usd) || 0;

    switch (advFilters.sort) {
      case 'risk_asc':
        return riskA - riskB;
      case 'newest':
        return (b.id || '').localeCompare(a.id || '');
      case 'oldest':
        return (a.id || '').localeCompare(b.id || '');
      case 'cost_desc':
        return costB - costA;
      case 'cost_asc':
        return costA - costB;
      case 'fastest':
        return riskB - riskA;
      case 'longest':
        return riskA - riskB;
      case 'risk_desc':
      default:
        return riskB - riskA;
    }
  });

  return filtered;
}

function applyStateAndSearchFilters() {
  dismissActiveOverlays();

  const filteredHazards = getFilteredHazards();
  const filteredHazardIds = new Set(filteredHazards.map(h => h.id));
  
  const filteredWorkOrders = allWorkOrders.filter(wo => {
    const matchesState = (currentStateFilter === 'all') || (wo.state && wo.state.toLowerCase() === currentStateFilter.toLowerCase());
    const matchesCity = (currentCityFilter === 'all') || (wo.city && wo.city.toLowerCase() === currentCityFilter.toLowerCase());
    const hasMatchingHazard = wo.target_hazard_ids && wo.target_hazard_ids.some(id => filteredHazardIds.has(id));
    return matchesState && matchesCity && hasMatchingHazard;
  });

  renderIncidentFeed(filteredHazards);
  renderMapMarkers(filteredHazards);
  renderWorkOrders(filteredWorkOrders);

  // Recalculate quick KPI values for current filtered subset
  const actionable = filteredHazards.filter(h => !h.fusion.is_false_positive);
  const critical = actionable.filter(h => h.severity === 'critical').length;
  const fp = filteredHazards.filter(h => h.fusion.is_false_positive).length;
  const totalCost = actionable.reduce((acc, h) => acc + h.priority.estimated_repair_cost_usd, 0);

  const kpiCrit = document.getElementById('kpi-critical');
  const kpiTot = document.getElementById('kpi-total');
  const kpiFp = document.getElementById('kpi-fp');
  const kpiWo = document.getElementById('kpi-work-orders');
  const kpiCost = document.getElementById('kpi-cost');

  if (kpiCrit) kpiCrit.textContent = critical;
  if (kpiTot) kpiTot.textContent = actionable.length;
  if (kpiFp) kpiFp.textContent = fp;
  if (kpiWo) kpiWo.textContent = filteredWorkOrders.length;
  if (kpiCost) kpiCost.textContent = formatINR(totalCost);
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
// GIS MAP MODULE (INDIA)
// ==========================================
function initGisMap() {
  const mapElem = document.getElementById('gis-map');
  if (!mapElem) return;

  const defaultVp = STATE_VIEWPORTS[currentStateFilter] || STATE_VIEWPORTS.Karnataka;

  gisMap = L.map('gis-map', {
    center: defaultVp.center,
    zoom: defaultVp.zoom,
    zoomControl: false,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    wheelDebounceTime: 40,
    wheelPxPerZoomLevel: 100,
    zoomAnimation: true,
    fadeAnimation: true,
    markerZoomAnimation: true,
    inertia: true,
    inertiaDeceleration: 3000,
    inertiaMaxSpeed: 2000,
    easeLinearity: 0.2,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    touchZoom: true,
    dragging: true,
    tap: false
  });

  L.control.zoom({ position: 'bottomright' }).addTo(gisMap);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB &copy; OpenStreetMap',
    maxZoom: 20,
    minZoom: 4,
    subdomains: 'abcd',
    detectRetina: true,
    keepBuffer: 6,
    updateWhenIdle: false,
    updateWhenZooming: true
  }).addTo(gisMap);

  gisMarkerLayer = L.layerGroup().addTo(gisMap);
  gisClusterLayer = L.layerGroup().addTo(gisMap);

  // Click on empty area of Leaflet map: dismiss active selection & close popup
  gisMap.on('click', () => {
    if (gisMap) {
      gisMap.closePopup();
    }
    selectedHazard = null;
    clearFeedHighlights();
  });

  document.getElementById('toggle-clusters').addEventListener('change', (e) => {
    if (e.target.checked) {
      gisMap.addLayer(gisClusterLayer);
    } else {
      gisMap.removeLayer(gisClusterLayer);
    }
  });

  const filterPanel = document.getElementById('map-severity-filter');
  if (filterPanel && typeof L !== 'undefined' && L.DomEvent) {
    L.DomEvent.disableClickPropagation(filterPanel);
    L.DomEvent.disableScrollPropagation(filterPanel);
  }
}

async function refreshMapData() {
  await refreshAllData();
}
window.refreshMapData = refreshMapData;

function highlightFeedCard(hazardId) {
  clearFeedHighlights();
  const card = document.getElementById(`feed-card-${hazardId}`);
  if (card) {
    card.classList.add('ring-1', 'ring-cyan-400', 'border-cyan-500/80', 'bg-[#1a263d]');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function clearFeedHighlights() {
  document.querySelectorAll('#incident-feed-list > div').forEach(el => {
    el.classList.remove('ring-1', 'ring-cyan-400', 'border-cyan-500/80', 'bg-[#1a263d]');
  });
}

function renderMapMarkers(hazards) {
  if (!gisMarkerLayer) return;
  gisMarkerLayer.clearLayers();
  gisClusterLayer.clearLayers();

  const activeHazardIds = new Set(hazards.map(h => h.id));

  hazards.forEach(h => {
    let pinClass = 'pin-medium';
    let size = 32;

    if (h.fusion && h.fusion.is_false_positive) {
      pinClass = 'pin-fp';
      size = 26;
    } else if (h.severity === 'critical') {
      pinClass = 'pin-critical';
      size = 38;
    } else if (h.severity === 'high') {
      pinClass = 'pin-high';
      size = 34;
    } else if (h.severity === 'low') {
      pinClass = 'pin-low';
      size = 28;
    }

    const iconName = getHazardIconName(h.hazard_type);

    const customIcon = L.divIcon({
      className: `custom-hazard-pin ${pinClass}`,
      html: `<i data-lucide="${iconName}" style="width:${Math.round(size*0.5)}px;height:${Math.round(size*0.5)}px;color:white;"></i>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });

    const marker = L.marker([h.latitude, h.longitude], { icon: customIcon });

    marker.on('click', () => {
      selectedHazard = h;
      highlightFeedCard(h.id);
    });

    marker.on('popupclose', () => {
      if (selectedHazard && selectedHazard.id === h.id) {
        selectedHazard = null;
        clearFeedHighlights();
      }
    });

    const wfStatus = getHazardWorkflowStatus(h);
    let wfBadgeStyle = 'background:#fef2f2;border:1px solid #f87171;color:#b91c1c;';
    let wfLabel = 'UNRESOLVED';
    let wfColor = '#ef4444';

    if (wfStatus === 'in_progress') {
      wfBadgeStyle = 'background:#fffbeb;border:1px solid #fbbf24;color:#b45309;';
      wfLabel = 'IN PROGRESS';
      wfColor = '#d97706';
    } else if (wfStatus === 'resolved') {
      wfBadgeStyle = 'background:#ecfdf5;border:1px solid #34d399;color:#047857;';
      wfLabel = 'RESOLVED';
      wfColor = '#059669';
    }

    const popupHtml = `
      <div class="p-2 text-xs font-sans" style="color:#0f172a;min-width:250px;">
        <div class="flex items-center justify-between font-bold border-b pb-1 mb-1.5">
          <span style="color:#0284c7;font-weight:bold;">${h.id} (${h.city}, ${h.state})</span>
          <span style="color:${h.severity === 'critical' ? '#dc2626' : (h.severity === 'high' ? '#d97706' : '#059669')};text-transform:uppercase;font-weight:bold;">${h.severity}</span>
        </div>
        <div class="mb-1.5 flex items-center justify-between">
          <span style="font-size:10px;font-weight:bold;${wfBadgeStyle}padding:2px 7px;border-radius:5px;text-transform:uppercase;letter-spacing:0.5px;">Status: ${wfLabel}</span>
          <span style="font-size:10px;color:#475569;font-weight:600;text-transform:capitalize;">${(h.hazard_type || '').replace('_', ' ')}</span>
        </div>
        <p class="font-bold text-sm mb-1" style="color:#0f172a;line-height:1.25;">${h.title}</p>
        <p class="text-slate-600 mb-1.5 leading-tight text-[11px]">${h.address}</p>
        <div class="bg-slate-100 p-2 rounded font-mono text-[11px] mb-2 border border-slate-200">
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <strong style="color:#334155;">Status:</strong>
            <strong style="color:${wfColor};">${wfLabel}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <strong style="color:#334155;">Risk Level:</strong>
            <strong style="color:${h.severity === 'critical' ? '#dc2626' : '#d97706'};">${h.priority.raw_risk_score}/100</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <strong style="color:#334155;">Depth / Area:</strong>
            <span>${h.fusion.physical_depth_cm > 0 ? h.fusion.physical_depth_cm + ' cm' : h.fusion.physical_area_sqm + ' m²'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <strong style="color:#334155;">Est. Repair Cost:</strong>
            <strong style="color:#7c3aed;">${formatINR(h.priority.estimated_repair_cost_usd)}</strong>
          </div>
        </div>
        <div class="space-y-1.5">
          <button onclick="openIncidentModal('${h.id}')" style="background:#0284c7;color:white;padding:6px 8px;border-radius:6px;width:100%;font-weight:bold;cursor:pointer;border:none;font-size:11px;box-shadow:0 1px 2px rgba(0,0,0,0.1);">
            View Full Incident Details
          </button>
          <a href="https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:center;gap:4px;background:#2563eb;color:white;padding:5px 8px;border-radius:6px;width:100%;font-weight:bold;text-decoration:none;font-size:11px;box-sizing:border-box;">
            🗺️ Open in Google Maps ↗
          </a>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;color:#0284c7;font-size:10px;text-decoration:none;font-weight:600;">
            🧭 Navigate to Location
          </a>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml, { autoClose: true, closeOnClick: true });
    gisMarkerLayer.addLayer(marker);
  });

  // Render Clustered Work Order Outlines ONLY for work orders matching active hazards
  allWorkOrders.forEach(wo => {
    if (currentStateFilter !== 'all' && wo.state && wo.state.toLowerCase() !== currentStateFilter.toLowerCase()) {
      return;
    }
    if (currentCityFilter !== 'all' && wo.city && wo.city.toLowerCase() !== currentCityFilter.toLowerCase()) {
      return;
    }
    const matchingHazardsCount = wo.target_hazard_ids ? wo.target_hazard_ids.filter(id => activeHazardIds.has(id)).length : 0;
    if (matchingHazardsCount === 0) {
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

    circle.bindTooltip(`<strong>${wo.id}</strong><br/>${wo.title} (${matchingHazardsCount} active issues)`, {
      permanent: false,
      direction: 'top',
      className: 'bg-slate-900 text-white text-xs border border-cyan-500 rounded p-1 font-sans'
    });

    gisClusterLayer.addLayer(circle);
  });

  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

function refreshMapData() {
  refreshAllData();
}

function renderIncidentFeed(hazards) {
  const container = document.getElementById('incident-feed-list');
  const countElem = document.getElementById('feed-count');
  if (countElem) countElem.textContent = hazards.length;

  const activeAdvCount = countActiveAdvFilters();
  const subElem = document.getElementById('feed-status-subtitle');
  if (subElem) {
    if (activeAdvCount > 0) {
      subElem.innerHTML = `<span class="text-cyan-400 font-bold">${hazards.length} issues</span> <span class="text-slate-500">·</span> <span class="text-amber-400 font-semibold">${activeAdvCount} filter${activeAdvCount > 1 ? 's' : ''} active</span>`;
    } else {
      subElem.innerHTML = `<span class="text-slate-400 font-mono"><span id="feed-count">${hazards.length}</span> issues</span>`;
    }
  }

  const btnFilter = document.getElementById('btn-toggle-adv-filter');
  if (btnFilter) {
    if (activeAdvCount > 0) {
      btnFilter.classList.add('border-cyan-500', 'bg-cyan-950/60', 'text-cyan-300');
    } else {
      btnFilter.classList.remove('border-cyan-500', 'bg-cyan-950/60', 'text-cyan-300');
    }
  }

  container.innerHTML = '';

  if (hazards.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-500 italic p-4 text-center">No road issues found matching the selected filters.</div>`;
    return;
  }

  hazards.forEach(h => {
    let badgeBg = 'bg-slate-800 text-slate-300';
    let riskColor = 'text-cyan-400';

    if (h.fusion.is_false_positive) {
      badgeBg = 'bg-slate-800 border border-slate-600 text-slate-400';
      riskColor = 'text-slate-500';
    } else if (h.severity === 'critical') {
      badgeBg = 'bg-red-950/80 border border-red-500/40 text-red-300';
      riskColor = 'text-red-400';
    } else if (h.severity === 'high') {
      badgeBg = 'bg-amber-950/80 border border-amber-500/40 text-amber-300';
      riskColor = 'text-amber-400';
    }

    const wfStatus = getHazardWorkflowStatus(h);
    let wfBadgeBg = 'bg-rose-950/80 border border-rose-500/40 text-rose-300';
    let wfLabel = 'UNRESOLVED';
    if (wfStatus === 'in_progress') {
      wfBadgeBg = 'bg-amber-950/80 border border-amber-500/40 text-amber-300';
      wfLabel = 'IN PROGRESS';
    } else if (wfStatus === 'resolved') {
      wfBadgeBg = 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300';
      wfLabel = 'RESOLVED';
    }

    const iconName = getHazardIconName(h.hazard_type);

    const isSelected = selectedHazard && selectedHazard.id === h.id;
    const selectClasses = isSelected ? 'ring-1 ring-cyan-400 border-cyan-500/80 bg-[#1a263d]' : '';

    const card = document.createElement('div');
    card.id = `feed-card-${h.id}`;
    card.className = `bg-[#141d30] hover:bg-[#18233a] border border-slate-800 hover:border-cyan-500/50 rounded-xl p-3 cursor-pointer transition-all flex flex-col gap-2 group ${selectClasses}`;
    card.onclick = () => {
      selectedHazard = h;
      highlightFeedCard(h.id);
      openIncidentModal(h.id);
      if (gisMap) {
        gisMap.flyTo([h.latitude, h.longitude], 16, { duration: 1.2 });
      }
    };

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[10px] font-mono px-2 py-0.5 rounded ${badgeBg} uppercase font-bold flex items-center gap-1">
            <i data-lucide="${iconName}" class="w-3 h-3"></i>
            ${h.fusion.is_false_positive ? 'FALSE ALERT' : h.severity}
          </span>
          <span class="text-[9px] font-mono px-1.5 py-0.5 rounded ${wfBadgeBg} uppercase font-semibold">${wfLabel}</span>
          <span class="text-[10px] text-slate-400 font-semibold bg-slate-900 px-1.5 py-0.5 rounded">${h.state}</span>
        </div>
        <div class="flex items-center gap-2">
          <a href="https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" title="Open location in Google Maps" class="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-0.5 text-[10px] font-mono font-bold bg-blue-950/60 border border-blue-500/30 px-1.5 py-0.5 rounded">
            🗺️ Maps ↗
          </a>
          <span class="text-xs font-mono font-bold ${riskColor}">Risk: ${h.priority.raw_risk_score}</span>
        </div>
      </div>
      <div>
        <h4 class="text-xs font-bold text-slate-100 group-hover:text-cyan-400 transition-colors leading-snug">${h.title}</h4>
        <p class="text-[11px] text-slate-400 truncate mt-0.5">${h.address}</p>
      </div>
      <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-800/80 pt-1.5">
        <span>Depth: ${h.fusion.physical_depth_cm}cm</span>
        <span>Area: ${h.fusion.physical_area_sqm}m²</span>
        <span class="text-purple-300 font-semibold">${formatINR(h.priority.estimated_repair_cost_usd)}</span>
      </div>
    `;

    container.appendChild(card);
  });

  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
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
  document.getElementById('imu-peak-badge').textContent = `Peak: ${maxGz.toFixed(2)}g`;

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
    pill.textContent = 'FALSE ALERT (NOT A REAL ISSUE)';
    reasonBox.textContent = f.false_positive_reason || 'Tree shadow or surface stain: 0.01g vibration response confirms road surface is smooth.';
  } else {
    pill.className = 'text-xs font-bold px-2.5 py-0.5 rounded font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40';
    pill.textContent = 'VERIFIED ROAD ISSUE';
    reasonBox.textContent = `Confirmed: Camera detection matches ${maxGz.toFixed(2)}g vibration impact. Priority: High.`;
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
    zoomControl: false,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    wheelDebounceTime: 40,
    wheelPxPerZoomLevel: 100,
    zoomAnimation: true,
    fadeAnimation: true,
    markerZoomAnimation: true,
    inertia: true,
    inertiaDeceleration: 3000,
    inertiaMaxSpeed: 2000,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    touchZoom: true,
    dragging: true,
    tap: false
  });

  L.control.zoom({ position: 'bottomright' }).addTo(patrolMap);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB &copy; OpenStreetMap',
    maxZoom: 20,
    minZoom: 4,
    subdomains: 'abcd',
    detectRetina: true,
    keepBuffer: 6,
    updateWhenIdle: false,
    updateWhenZooming: true
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
  container.innerHTML = '';

  if (workOrders.length === 0) {
    container.innerHTML = `<div class="col-span-3 text-center p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400 text-xs italic">No scheduled repair tasks for ${currentStateFilter}.</div>`;
    return;
  }

  workOrders.forEach(wo => {
    const card = document.createElement('div');
    card.className = 'bg-[#101726] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between gap-4 hover:border-slate-700 transition-all';

    let tierBadge = 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40';
    if (wo.priority_tier.includes('Tier 1')) tierBadge = 'bg-red-950/80 text-red-300 border-red-500/40';
    else if (wo.priority_tier.includes('Tier 2')) tierBadge = 'bg-amber-950/80 text-amber-300 border-amber-500/40';

    let hazardsHtml = wo.hazards_summary.map(h => `
      <div class="flex items-center justify-between text-xs bg-slate-900/90 p-2 rounded-lg border border-slate-800">
        <div>
          <span class="font-bold text-slate-200">${h.hazard_id}</span>
          <span class="text-slate-400 text-[11px] ml-1">(${h.hazard_type.replace('_', ' ')})</span>
        </div>
        <span class="font-mono text-purple-300 font-bold">${formatINR(h.cost_inr || 15000)}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold text-cyan-400">${wo.id}</span>
            <span class="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded font-semibold">${wo.state}</span>
          </div>
          <span class="text-[10px] font-mono px-2.5 py-0.5 rounded border font-bold ${tierBadge}">${wo.priority_tier}</span>
        </div>
        <h3 class="text-sm font-bold text-white">${wo.title}</h3>
        
        <div class="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
          <div>
            <span class="text-slate-400 text-[10px]">Assigned Crew:</span>
            <p class="font-bold text-slate-200 text-[11px] truncate">${wo.assigned_crew}</p>
          </div>
          <div>
            <span class="text-slate-400 text-[10px]">Scheduled Window:</span>
            <p class="font-bold text-slate-200 text-[11px]">${wo.scheduled_date}</p>
          </div>
          <div class="mt-1">
            <span class="text-slate-400 text-[10px]">Est. Shift Hours:</span>
            <p class="font-bold text-cyan-300 text-[11px]">${wo.estimated_hours} hrs</p>
          </div>
          <div class="mt-1">
            <span class="text-slate-400 text-[10px]">Total Cost:</span>
            <p class="font-bold text-purple-300 text-[11px]">${formatINR(wo.estimated_cost_usd)}</p>
          </div>
        </div>

        <div class="space-y-1.5">
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Grouped Road Issues:</p>
          <div class="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
            ${hazardsHtml}
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
        <span class="text-slate-400 font-mono">Status: <strong class="text-emerald-400 font-bold">${wo.status.toUpperCase()}</strong></span>
        <div class="flex items-center gap-2">
          <a href="https://www.google.com/maps/search/?api=1&query=${wo.cluster_center_lat},${wo.cluster_center_lng}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1.5 rounded-lg bg-blue-950/60 border border-blue-500/40 text-blue-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all">
            🗺️ Maps ↗
          </a>
          <button onclick="dispatchWorkOrder('${wo.id}')" class="px-3 py-1.5 rounded-lg font-bold bg-cyan-500 hover:bg-cyan-400 text-black text-xs transition-all">
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
    appendChatMessage('assistant', 'Error communicating with Road Safety AI Assistant. Please verify server connection.');
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
        <p class="font-bold text-cyan-300 mb-1">SadakSuraksha Road Safety AI Assistant</p>
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
      Analyzing sensor data and road repair standards in ₹ Rupees...
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
            borderColor: '#00f0ff',
            backgroundColor: 'rgba(0, 240, 255, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointRadius: 0
          },
          {
            label: 'Vertical Jerk (g/s)',
            data: [],
            borderColor: '#f59e0b',
            borderWidth: 1.5,
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
          x: { display: true, grid: { color: '#1e293b' }, ticks: { color: '#64748b', maxTicksLimit: 6 } },
          y: { display: true, grid: { color: '#1e293b' }, ticks: { color: '#64748b' }, min: 0.5, max: 3.5 }
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
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#cbd5e1', font: { size: 11 } } }
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
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#1e293b' }, ticks: { color: '#cbd5e1', font: { size: 10 } } },
          y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b' }, min: 0, max: 100 }
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
// MODALS & NAVIGATION CONTROLLER
// ==========================================
function closeAllModals() {
  const modalIds = ['incident-modal', 'apikey-modal', 'ingest-modal', 'citizen-portal-modal'];
  modalIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  });
}

function dismissActiveOverlays() {
  // 1. Close and remove all modals
  closeAllModals();

  // 2. Explicitly close any open Leaflet popups on all layers
  if (gisMap) {
    gisMap.closePopup();
  }
  if (gisMarkerLayer) {
    gisMarkerLayer.eachLayer(layer => {
      if (layer && typeof layer.closePopup === 'function') {
        layer.closePopup();
      }
    });
  }
  if (patrolMap) {
    patrolMap.closePopup();
  }
  
  // 3. Forcibly remove any popup DOM nodes from the DOM tree
  document.querySelectorAll('.leaflet-popup').forEach(el => el.remove());

  // 4. Close Sort & Filter popover if open
  const advPop = document.getElementById('adv-filter-popover');
  if (advPop) advPop.classList.add('hidden');

  // 5. Clear active hazard selection and feed highlights
  selectedHazard = null;
  if (typeof clearFeedHighlights === 'function') {
    clearFeedHighlights();
  }
}

function setupGlobalInteractionHandlers() {
  // 1. Backdrop click dismissal for all modals
  const modalIds = ['incident-modal', 'apikey-modal', 'ingest-modal', 'citizen-portal-modal'];
  modalIds.forEach(id => {
    const modalEl = document.getElementById(id);
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) {
          dismissActiveOverlays();
        }
      });
    }
  });

  // 2. Escape key dismissal for modals and map popups
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dismissActiveOverlays();
    }
  });

  // 3. Click outside Sort & Filter popover to close it
  document.addEventListener('click', (e) => {
    const pop = document.getElementById('adv-filter-popover');
    const btn = document.getElementById('btn-toggle-adv-filter');
    if (pop && !pop.classList.contains('hidden')) {
      if (!pop.contains(e.target) && btn && !btn.contains(e.target)) {
        pop.classList.add('hidden');
      }
    }
  });
}

function switchTab(tabId) {
  // 1. Dismiss all open modals, map popups, and active hazard selections
  dismissActiveOverlays();

  // 2. Update tab buttons and tab views
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active-tab'));
  document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));

  const tabBtn = document.getElementById(`tab-${tabId}`);
  const viewElem = document.getElementById(`view-${tabId}`);

  if (tabBtn) tabBtn.classList.add('active-tab');
  if (viewElem) viewElem.classList.remove('hidden');

  // 3. Tab-specific lifecycle activations
  if (tabId === 'map' && gisMap) {
    setTimeout(() => gisMap.invalidateSize(), 150);
  } else if (tabId === 'patrol' && patrolMap) {
    setTimeout(() => patrolMap.invalidateSize(), 150);
  } else if (tabId === 'ingestion') {
    if (typeof refreshIngestionStreams === 'function') {
      refreshIngestionStreams();
    }
  } else if (tabId === 'studio') {
    setTimeout(() => {
      if (studioImuChart) studioImuChart.resize();
    }, 150);
  } else if (tabId === 'analytics') {
    setTimeout(() => {
      if (hazardDistChart) hazardDistChart.resize();
      if (roadPciChart) roadPciChart.resize();
    }, 150);
  }

  lucide.createIcons();
}
window.switchTab = switchTab;

function openIncidentModal(hazardId) {
  const h = allHazards.find(item => item.id === hazardId);
  if (!h) return;

  // Dismiss any previously open modals and Leaflet popups first
  dismissActiveOverlays();

  selectedHazard = h;
  const isFP = h.fusion && h.fusion.is_false_positive;

  // Title & Location
  document.getElementById('modal-title').textContent = h.title;
  document.getElementById('modal-address').textContent = `${h.address} (${h.road_name}, ${h.city || 'Bengaluru'}, ${h.state || 'Karnataka'})`;
  
  // Risk Score & Badges
  const riskElem = document.getElementById('modal-risk-score');
  if (riskElem) {
    if (isFP) {
      riskElem.innerHTML = `<span class="text-slate-400">0.0 (False Alert)</span>`;
      riskElem.className = 'font-bold text-slate-400 font-mono';
    } else {
      riskElem.innerHTML = `${h.priority.raw_risk_score} <span class="text-xs text-slate-500">/100</span>`;
      riskElem.className = h.severity === 'critical' ? 'font-bold text-red-400 font-mono' : 'font-bold text-amber-400 font-mono';
    }
  }

  const confElem = document.getElementById('modal-confidence');
  if (confElem) {
    const confVal = h.fusion && h.fusion.fused_confidence ? (h.fusion.fused_confidence * 100).toFixed(0) : '94';
    confElem.textContent = `${confVal}%`;
  }

  const pciDeductElem = document.getElementById('modal-pci-deduct');
  if (pciDeductElem) {
    pciDeductElem.textContent = isFP ? '0.0 pts' : `-${h.priority.pci_deduct_value || 42.0} pts`;
  }

  const depthElem = document.getElementById('modal-depth');
  if (depthElem) {
    depthElem.textContent = `${h.fusion ? h.fusion.physical_depth_cm : 0} cm`;
  }

  const costElem = document.getElementById('modal-repair-cost');
  if (costElem) {
    costElem.textContent = isFP ? '₹ 0 (False Alert)' : formatINR(h.priority.estimated_repair_cost_usd);
  }

  const techElem = document.getElementById('modal-repair-technique');
  if (techElem) {
    techElem.textContent = isFP ? 'No Repair Required (Road Surface Safe)' : h.priority.recommended_repair_technique;
  }

  const hoursElem = document.getElementById('modal-repair-hours');
  if (hoursElem) {
    hoursElem.textContent = isFP ? '0.0 hrs' : `${h.priority.estimated_crew_hours} hrs`;
  }

  const timelineElem = document.getElementById('modal-dispatch-timeline');
  if (timelineElem) {
    if (isFP) {
      timelineElem.textContent = 'False Alert (No Repair Required)';
      timelineElem.className = 'text-[11px] font-bold text-emerald-400 font-mono';
    } else if (h.severity === 'critical') {
      timelineElem.textContent = 'Immediate Repair (Within 24–48 hours)';
      timelineElem.className = 'text-[11px] font-bold text-red-400 font-mono';
    } else {
      timelineElem.textContent = 'Scheduled Repair (Within 5–7 days)';
      timelineElem.className = 'text-[11px] font-bold text-amber-400 font-mono';
    }
  }

  // Set Google Maps redirection links
  const modalGmaps = document.getElementById('modal-gmaps-link');
  if (modalGmaps) {
    modalGmaps.href = `https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}`;
  }
  const modalGmapsDir = document.getElementById('modal-gmaps-dir');
  if (modalGmapsDir) {
    modalGmapsDir.href = `https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`;
  }

  // Severity badge & False Positive overlay
  const badge = document.getElementById('modal-badge-severity');
  const fpWarning = document.getElementById('modal-fp-warning');
  if (isFP) {
    badge.className = 'px-2.5 py-1 rounded text-xs font-bold font-mono bg-slate-800 text-slate-400 border border-slate-700';
    badge.textContent = 'FALSE ALERT';
    if (fpWarning) fpWarning.classList.remove('hidden');
  } else {
    badge.className = `px-2.5 py-1 rounded text-xs font-bold font-mono ${h.severity === 'critical' ? 'bg-red-950 text-red-400 border border-red-500/40' : (h.severity === 'high' ? 'bg-amber-950 text-amber-400 border border-amber-500/40' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/40')}`;
    badge.textContent = h.severity.toUpperCase();
    if (fpWarning) fpWarning.classList.add('hidden');
  }

  // Workflow Status badge & metrics
  const wfStatus = getHazardWorkflowStatus(h);
  const statusBadge = document.getElementById('modal-badge-status');
  const statusText = document.getElementById('modal-status-text');
  const sevText = document.getElementById('modal-severity-text');
  const typeBadge = document.getElementById('modal-badge-type');

  if (sevText) {
    sevText.textContent = (h.severity || 'HIGH').toUpperCase();
    sevText.className = h.severity === 'critical' ? 'font-bold text-red-400' : (h.severity === 'high' ? 'font-bold text-amber-400' : 'font-bold text-emerald-400');
  }

  let wfLabel = 'UNRESOLVED';
  let wfClass = 'bg-rose-950/80 border border-rose-500/40 text-rose-300';
  let wfTextClass = 'font-bold text-rose-400 font-mono';

  if (wfStatus === 'in_progress') {
    wfLabel = 'IN PROGRESS';
    wfClass = 'bg-amber-950/80 border border-amber-500/40 text-amber-300';
    wfTextClass = 'font-bold text-amber-400 font-mono';
  } else if (wfStatus === 'resolved') {
    wfLabel = 'RESOLVED';
    wfClass = 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300';
    wfTextClass = 'font-bold text-emerald-400 font-mono';
  }

  if (statusBadge) {
    statusBadge.className = `px-2.5 py-1 rounded text-xs font-bold font-mono ${wfClass}`;
    statusBadge.textContent = wfLabel;
  }
  if (statusText) {
    statusText.className = wfTextClass;
    statusText.textContent = wfLabel;
  }
  if (typeBadge) {
    typeBadge.textContent = (h.hazard_type || '').replace('_', ' ').toUpperCase();
  }

  document.getElementById('modal-image').src = SCENARIO_IMAGES[h.hazard_type] || SCENARIO_IMAGES.pothole;

  // Render Dynamic AI Why Evidence Checklist
  renderModalWhyEvidence(h);

  // Synchronized Accelerometer Waveform Chart
  setTimeout(() => {
    const ctx = document.getElementById('modal-imu-chart');
    if (ctx) {
      if (modalImuChart) modalImuChart.destroy();
      const peakShock = isFP ? 0.01 : (h.telemetry?.acc_z_g || 2.45);
      const imuPeakElem = document.getElementById('modal-imu-peak');
      if (imuPeakElem) {
        imuPeakElem.textContent = `Peak: ${peakShock.toFixed(2)}g`;
        imuPeakElem.className = isFP 
          ? 'text-[11px] font-mono text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700' 
          : 'text-[11px] font-mono text-amber-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700';
      }

      const trace = h.telemetry_trace || generateSampleTelemetry(peakShock);
      modalImuChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: trace.map(t => `${t.time_sec}s`),
          datasets: [{
            label: 'Vertical Shock (Gz)',
            data: trace.map(t => t.acc_z),
            borderColor: isFP ? '#94a3b8' : '#00f0ff',
            backgroundColor: isFP ? 'rgba(148, 163, 184, 0.05)' : 'rgba(0, 240, 255, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', maxTicksLimit: 6 } },
            y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b' }, min: isFP ? 0.8 : 0.5, max: isFP ? 1.2 : 3.5 }
          }
        }
      });
    }
  }, 100);

  const incidentModal = document.getElementById('incident-modal');
  if (incidentModal) {
    incidentModal.classList.remove('hidden');
    incidentModal.classList.add('flex');
  }
  lucide.createIcons();
}

function renderModalWhyEvidence(h) {
  const container = document.getElementById('modal-why-evidence-list');
  const sourcesContainer = document.getElementById('modal-detection-sources');
  if (!container) return;

  const isFP = h.fusion && h.fusion.is_false_positive;
  let evidenceHtml = '';

  // 1. Vision Evidence
  const visScore = h.fusion && h.fusion.visual_score ? (h.fusion.visual_score * 100).toFixed(0) : '94';
  const defectArea = h.fusion ? h.fusion.physical_area_sqm : 0.8;
  if (!isFP) {
    evidenceHtml += `
      <div class="evidence-item">
        <span class="text-emerald-400 font-bold text-sm shrink-0">✓</span>
        <div>
          <strong class="text-slate-200">Camera Detection:</strong>
          <span class="text-slate-300"> ${h.hazard_type.replace('_', ' ').toUpperCase()} verified with ${visScore}% visual match (damaged area ${defectArea} m²).</span>
        </div>
      </div>
    `;
  } else {
    evidenceHtml += `
      <div class="evidence-item border-amber-500/40 bg-amber-950/20">
        <span class="text-amber-400 font-bold text-sm shrink-0">⚠</span>
        <div>
          <strong class="text-amber-300">Camera Misread (Shadow / Surface Mark):</strong>
          <span class="text-slate-300"> High surface dark contrast detected (${visScore}% visual match), but physical vibration sensors confirmed road surface is smooth.</span>
        </div>
      </div>
    `;
  }

  // 2. Inertial/Accelerometer Sensor Evidence
  const shockG = isFP ? 0.01 : (h.telemetry?.acc_z_g || 2.85);
  const depthCm = h.fusion ? h.fusion.physical_depth_cm : 9.5;
  if (!isFP) {
    evidenceHtml += `
      <div class="evidence-item">
        <span class="text-emerald-400 font-bold text-sm shrink-0">✓</span>
        <div>
          <strong class="text-slate-200">Vibration Sensor:</strong>
          <span class="text-slate-300"> 3-Axis vibration sensor recorded ${shockG.toFixed(2)}g impact shock, confirming ${depthCm} cm cavity depth.</span>
        </div>
      </div>
    `;
  } else {
    evidenceHtml += `
      <div class="evidence-item border-emerald-500/40 bg-emerald-950/20">
        <span class="text-emerald-400 font-bold text-sm shrink-0">✓</span>
        <div>
          <strong class="text-emerald-300">Vibration Sensor (No Impact):</strong>
          <span class="text-slate-300"> 0.01g response confirms smooth road surface (no vertical bump — tree shadow or surface mark).</span>
        </div>
      </div>
    `;
  }

  // 3. Acoustic Evidence
  const acousticDb = h.acoustic?.impact_energy_db || (isFP ? 41 : 76);
  if (!isFP) {
    evidenceHtml += `
      <div class="evidence-item">
        <span class="text-emerald-400 font-bold text-sm shrink-0">✓</span>
        <div>
          <strong class="text-slate-200">Sound Detection:</strong>
          <span class="text-slate-300"> ${acousticDb.toFixed(0)} dB tyre impact sound matches physical pothole impact.</span>
        </div>
      </div>
    `;
  } else {
    evidenceHtml += `
      <div class="evidence-item">
        <span class="text-slate-400 font-bold text-sm shrink-0">―</span>
        <div>
          <strong class="text-slate-300">Sound Detection (Normal):</strong>
          <span class="text-slate-400"> Normal ${acousticDb.toFixed(0)} dB tyre sound confirms no wheel rim impact.</span>
        </div>
      </div>
    `;
  }

  // 4. Corridor & Traffic Urgency
  const roadClassLabel = (h.road_class || 'arterial').replace('_', ' ').toUpperCase();
  const isEmergency = (h.env_context && h.env_context.is_emergency_route) || h.road_class === 'hospital_corridor';
  const aadt = h.env_context?.aadt_traffic_volume || 38000;
  
  if (!isFP) {
    evidenceHtml += `
      <div class="evidence-item">
        <span class="text-emerald-400 font-bold text-sm shrink-0">✓</span>
        <div>
          <strong class="text-slate-200">Road Importance & Traffic:</strong>
          <span class="text-slate-300"> ${roadClassLabel} road (${h.road_name}) with daily traffic of ${aadt.toLocaleString()} vehicles/day. ${isEmergency ? '<strong class="text-amber-400 font-semibold">(🚨 Emergency / Hospital Route — High Priority)</strong>' : ''}</span>
        </div>
      </div>
    `;
  }

  // 5. Citizen 311 Report (if available)
  if (h.citizen_report && h.citizen_report.text_content) {
    evidenceHtml += `
      <div class="evidence-item border-cyan-500/30">
        <span class="text-cyan-400 font-bold text-sm shrink-0">📱</span>
        <div>
          <strong class="text-cyan-300">Citizen Report (${h.citizen_report.source || 'Citizen App'}):</strong>
          <span class="text-slate-300"> Urgency Rating ${h.citizen_report.reporter_urgency || 4}/5: "${h.citizen_report.text_content}"</span>
        </div>
      </div>
    `;
  }

  container.innerHTML = evidenceHtml;

  // Detection Sources Linked Badges
  if (sourcesContainer) {
    let sourcesHtml = `
      <span class="evidence-tag"><i data-lucide="camera" class="w-3 h-3 text-cyan-400"></i> Camera</span>
      <span class="evidence-tag"><i data-lucide="activity" class="w-3 h-3 text-amber-400"></i> Vibration Sensor</span>
      <span class="evidence-tag"><i data-lucide="volume-2" class="w-3 h-3 text-purple-400"></i> Sound Sensor</span>
    `;
    if (h.citizen_report && h.citizen_report.text_content) {
      sourcesHtml += `<span class="evidence-tag"><i data-lucide="smartphone" class="w-3 h-3 text-emerald-400"></i> Citizen Report</span>`;
    }
    sourcesContainer.innerHTML = sourcesHtml;
  }
}

function closeIncidentModal() {
  dismissActiveOverlays();
}

function openApiKeyModal() {
  dismissActiveOverlays();
  document.getElementById('input-api-key').value = userApiKey;
  const modal = document.getElementById('apikey-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeApiKeyModal() {
  dismissActiveOverlays();
}

function saveApiKey() {
  userApiKey = document.getElementById('input-api-key').value.trim();
  localStorage.setItem('SADAKSURAKSHA_GEMINI_KEY', userApiKey);
  updateApiKeyDisplay();
  closeApiKeyModal();
}

function triggerQuickScanModal() {
  dismissActiveOverlays();
  const modal = document.getElementById('ingest-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeIngestModal() {
  dismissActiveOverlays();
}
window.closeIngestModal = closeIngestModal;

function handleIngestStateChange(selectedState) {
  const citySelect = document.getElementById('ingest-city');
  if (!citySelect) return;
  const rawCities = STATE_CITY_MAPPING[selectedState] || ['City Center'];
  citySelect.innerHTML = rawCities.map(c => `<option value="${c}">${c}</option>`).join('');
}
window.handleIngestStateChange = handleIngestStateChange;

async function submitIngestModal() {
  const stateVal = (document.getElementById('ingest-state') && document.getElementById('ingest-state').value) || 'Karnataka';
  const cityVal = (document.getElementById('ingest-city') && document.getElementById('ingest-city').value) || 'Bengaluru';
  const roadName = (document.getElementById('ingest-road-name') && document.getElementById('ingest-road-name').value.trim()) || `${cityVal} Sector Route`;
  const roadClass = (document.getElementById('ingest-road-class') && document.getElementById('ingest-road-class').value) || 'arterial';
  const hazardType = (document.getElementById('ingest-hazard-type') && document.getElementById('ingest-hazard-type').value) || 'pothole';
  const severityVal = (document.getElementById('ingest-severity') && document.getElementById('ingest-severity').value) || 'high';
  const sourceVal = (document.getElementById('ingest-source') && document.getElementById('ingest-source').value) || 'Citizen Report';
  const citizenText = (document.getElementById('ingest-citizen-text') && document.getElementById('ingest-citizen-text').value.trim()) || `Reported ${hazardType} hazard on ${roadName}, ${cityVal}`;

  const submitBtn = document.getElementById('btn-submit-road-issue');
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Analyzing Road Issue with AI...`;
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  // Derive realistic geographic coordinates based on City or State center
  const vp = CITY_VIEWPORTS[cityVal] || STATE_VIEWPORTS[stateVal] || { center: [12.9716, 77.5946] };
  const lat = parseFloat((vp.center[0] + (Math.random() - 0.5) * 0.035).toFixed(4));
  const lng = parseFloat((vp.center[1] + (Math.random() - 0.5) * 0.035).toFixed(4));

  // Automatically compute realistic physical telemetry & acoustic measurements based on severity
  let accZ = 2.05;
  let acousticDb = 68.0;
  if (severityVal === 'critical') {
    accZ = 2.85;
    acousticDb = 78.0;
  } else if (severityVal === 'high') {
    accZ = 2.10;
    acousticDb = 68.0;
  } else if (severityVal === 'medium') {
    accZ = 1.45;
    acousticDb = 55.0;
  } else {
    accZ = 1.15;
    acousticDb = 44.0;
  }

  // Read uploaded image if user provided one
  const fileInput = document.getElementById('ingest-photo-input');
  let imageB64 = null;
  if (fileInput && fileInput.files && fileInput.files[0]) {
    try {
      imageB64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(fileInput.files[0]);
      });
    } catch (e) {
      console.warn('Image read error:', e);
    }
  }

  try {
    const res = await fetch('/api/hazards/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: imageB64,
        image_url: null,
        latitude: lat,
        longitude: lng,
        state: stateVal,
        city: cityVal,
        speed_kmh: 45.0,
        acc_z_g: accZ,
        vertical_jerk: parseFloat((Math.abs(accZ - 1.0) * 12.0).toFixed(1)),
        acoustic_db: acousticDb,
        citizen_text: citizenText,
        road_class: roadClass,
        road_name: roadName
      })
    });

    const newH = await res.json();

    // Ensure status is explicitly UNRESOLVED and hazard_type/severity/title match user input
    newH.status = 'Unresolved';
    if (hazardType) newH.hazard_type = hazardType;
    if (severityVal) newH.severity = severityVal;
    newH.title = `Detected ${hazardType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} (${severityVal.toUpperCase()})`;
    if (sourceVal && newH.citizen_report) {
      newH.citizen_report.citizen_category = sourceVal;
    }

    closeIngestModal();

    // Prepend new incident to live database
    allHazards.unshift(newH);

    // Refresh UI filters, map, and feed
    applyStateAndSearchFilters();

    // Smoothly fly GIS map to the newly reported road hazard
    if (gisMap) {
      gisMap.flyTo([newH.latitude, newH.longitude], 15.5, { duration: 1.2 });
    }

    // Highlight the card in the feed
    highlightFeedCard(newH.id);

    // Open detail modal showcasing the AI analysis results
    setTimeout(() => {
      openIncidentModal(newH.id);
    }, 400);

  } catch (err) {
    console.error('Report submission failed:', err);
    alert('Unable to analyze road issue. Please check network connection and try again.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml || `<i data-lucide="send" class="w-3.5 h-3.5"></i> Submit Road Issue`;
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }
  }
}
window.submitIngestModal = submitIngestModal;

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
      <div class="bg-[#121929] border border-slate-800 rounded-xl p-4 hover:border-${color}-500/40 transition-all">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-lg">${icon}</span>
            <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400">${s.source_type.replace(/_/g, ' ')}</span>
          </div>
          <span class="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-${color}-950/60 border border-${color}-500/40 text-${color}-400">
            <span class="w-1.5 h-1.5 rounded-full bg-${color}-400 ${s.status === 'active' ? 'animate-pulse' : ''}"></span>
            ${s.status.toUpperCase()}
          </span>
        </div>
        <h4 class="text-xs font-bold text-white mb-1 leading-tight">${s.source_name}</h4>
        <p class="text-[10px] text-slate-500 mb-3">${s.state} • ${s.city}</p>
        <div class="grid grid-cols-3 gap-2 text-center text-[10px]">
          <div>
            <p class="font-bold font-mono text-slate-200">${s.total_frames_processed.toLocaleString('en-IN')}</p>
            <p class="text-slate-500">Frames</p>
          </div>
          <div>
            <p class="font-bold font-mono text-amber-400">${s.hazards_detected}</p>
            <p class="text-slate-500">Hazards</p>
          </div>
          <div>
            <p class="font-bold font-mono text-emerald-400">${s.false_positives_filtered}</p>
            <p class="text-slate-500">FP Filtered</p>
          </div>
        </div>
        ${s.last_frame_at ? `<p class="text-[9px] text-slate-600 mt-2 font-mono">Last: ${s.last_frame_at}</p>` : ''}
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// Citizen Portal Modal
function openCitizenPortalModal() {
  dismissActiveOverlays();
  const modal = document.getElementById('citizen-portal-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const link = document.getElementById('citizen-portal-link');
    if (link) {
      const portalUrl = `${window.location.origin}/report`;
      link.textContent = portalUrl;
      link.href = portalUrl;
    }
    lucide.createIcons();
  }
}
window.openCitizenPortalModal = openCitizenPortalModal;

function closeCitizenPortalModal() {
  dismissActiveOverlays();
}
window.closeCitizenPortalModal = closeCitizenPortalModal;

function copyCitizenPortalLink(evt) {
  const portalUrl = `${window.location.origin}/report`;
  const targetBtn = evt ? evt.target.closest('button') : (window.event ? window.event.target.closest('button') : null);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(portalUrl).then(() => {
      if (targetBtn) {
        const original = targetBtn.innerHTML;
        targetBtn.innerHTML = '<span class="text-emerald-400">✓ Copied!</span>';
        setTimeout(() => { targetBtn.innerHTML = original; lucide.createIcons(); }, 2000);
      }
    }).catch(err => {
      console.warn('Clipboard write failed:', err);
    });
  }
}
window.copyCitizenPortalLink = copyCitizenPortalLink;

