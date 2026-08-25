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
let currentCategoryFilter = 'all';
let currentSearchQuery = '';
let selectedHazard = null;
let userApiKey = localStorage.getItem('SADAKSURAKSHA_GEMINI_KEY') || localStorage.getItem('SADAKSUKHA_GEMINI_KEY') || localStorage.getItem('AERO_GEMINI_KEY') || '';

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
  updateApiKeyDisplay();
  
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
// STATE-WISE & KEYWORD FILTERING
// ==========================================
function handleStateChange(selectedState) {
  currentStateFilter = selectedState;

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
  document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');
  applyStateAndSearchFilters();
}

function getFilteredHazards() {
  return allHazards.filter(h => {
    // 1. State Filter
    const matchesState = (currentStateFilter === 'all') || (h.state && h.state.toLowerCase() === currentStateFilter.toLowerCase());
    
    // 2. Category Filter
    let matchesCategory = true;
    if (currentCategoryFilter === 'critical') {
      matchesCategory = (h.severity === 'critical' && !h.fusion.is_false_positive);
    } else if (currentCategoryFilter === 'pothole') {
      matchesCategory = (h.hazard_type === 'pothole' && !h.fusion.is_false_positive);
    } else if (currentCategoryFilter === 'hospital') {
      matchesCategory = (h.road_class === 'hospital_corridor' && !h.fusion.is_false_positive);
    }

    // 3. Search Query Filter (State, City, Road Name, Title, Type)
    let matchesSearch = true;
    if (currentSearchQuery) {
      const haystack = `${h.id} ${h.title} ${h.state} ${h.city} ${h.road_name} ${h.address} ${h.hazard_type}`.toLowerCase();
      matchesSearch = haystack.includes(currentSearchQuery);
    }

    return matchesState && matchesCategory && matchesSearch;
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
// GIS MAP MODULE (INDIA)
// ==========================================
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

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB &copy; OpenStreetMap',
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(gisMap);

  gisMarkerLayer = L.layerGroup().addTo(gisMap);
  gisClusterLayer = L.layerGroup().addTo(gisMap);

  document.getElementById('toggle-clusters').addEventListener('change', (e) => {
    if (e.target.checked) {
      gisMap.addLayer(gisClusterLayer);
    } else {
      gisMap.removeLayer(gisClusterLayer);
    }
  });
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

    const popupHtml = `
      <div class="p-2 text-xs font-sans" style="color:#0f172a;min-width:240px;">
        <div class="flex items-center justify-between font-bold border-b pb-1 mb-1">
          <span style="color:#0284c7;">${h.id} (${h.state})</span>
          <span style="color:${h.severity === 'critical' ? '#dc2626' : '#d97706'};text-transform:uppercase;">${h.severity}</span>
        </div>
        <p class="font-bold text-sm mb-1">${h.title}</p>
        <p class="text-slate-600 mb-1 leading-tight">${h.address}</p>
        <div class="bg-slate-100 p-1.5 rounded font-mono text-[11px] mb-2">
          <strong>Risk Score:</strong> ${h.priority.raw_risk_score}/100<br/>
          <strong>Cavity Depth:</strong> ${h.fusion.physical_depth_cm} cm<br/>
          <strong>Est. PWD Cost:</strong> ${formatINR(h.priority.estimated_repair_cost_usd)}
        </div>
        <div class="space-y-1.5">
          <button onclick="openIncidentModal('${h.id}')" style="background:#0284c7;color:white;padding:5px 8px;border-radius:6px;width:100%;font-weight:bold;cursor:pointer;border:none;font-size:11px;">
            View Multimodal Dossier
          </button>
          <a href="https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:center;gap:4px;background:#2563eb;color:white;padding:5px 8px;border-radius:6px;width:100%;font-weight:bold;text-decoration:none;font-size:11px;box-sizing:border-box;">
            🗺️ Open in Google Maps ↗
          </a>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;color:#0284c7;font-size:10px;text-decoration:none;">
            🧭 Navigate to Location
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
  document.getElementById('feed-count').textContent = hazards.length;
  container.innerHTML = '';

  if (hazards.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-500 italic p-4 text-center">No defects found for ${currentStateFilter}.</div>`;
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

    const card = document.createElement('div');
    card.className = 'bg-[#141d30] hover:bg-[#18233a] border border-slate-800 hover:border-cyan-500/50 rounded-xl p-3 cursor-pointer transition-all flex flex-col gap-2 group';
    card.onclick = () => {
      openIncidentModal(h.id);
      if (gisMap) {
        gisMap.flyTo([h.latitude, h.longitude], 16, { duration: 1.2 });
      }
    };

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-mono px-2 py-0.5 rounded ${badgeBg} uppercase font-bold">
            ${h.fusion.is_false_positive ? 'FALSE POSITIVE' : h.severity}
          </span>
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

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
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
  container.innerHTML = '';

  if (workOrders.length === 0) {
    container.innerHTML = `<div class="col-span-3 text-center p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400 text-xs italic">No scheduled work orders for ${currentStateFilter}.</div>`;
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
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clustered Hazard Defects:</p>
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
  const modal = document.getElementById('citizen-portal-modal');
  if (modal) {
    modal.classList.remove('hidden');
    const link = document.getElementById('citizen-portal-link');
    if (link) {
      const portalUrl = `${window.location.origin}/report`;
      link.textContent = portalUrl;
      link.href = portalUrl;
    }
    lucide.createIcons();
  }
}

function closeCitizenPortalModal() {
  const modal = document.getElementById('citizen-portal-modal');
  if (modal) modal.classList.add('hidden');
}

function copyCitizenPortalLink() {
  const portalUrl = `${window.location.origin}/report`;
  navigator.clipboard.writeText(portalUrl).then(() => {
    const btn = event.target.closest('button');
    if (btn) {
      const original = btn.innerHTML;
      btn.innerHTML = '<span class="text-emerald-400">✓ Copied!</span>';
      setTimeout(() => { btn.innerHTML = original; lucide.createIcons(); }, 2000);
    }
  });
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

