/**
 * Sadak Suraksha AI - Internationalization (i18n) Engine
 * Complete English & Natural Hindi (हिंदी) Translation Dictionary
 */

(function () {
  'use strict';

  const translations = {
    en: {
      // Header
      app_title: "SADAK-SURAKSHA",
      app_badge: "AI 🇮🇳",
      system_live: "System Live",
      app_subtitle: "AI-Powered Road Safety & Maintenance Platform",
      location_label: "Location:",
      all_india: "🇮🇳 All India",
      select_city: "Select City",
      theme_light: "Light",
      theme_dark: "Dark",
      report_road_issue: "Report Road Issue",
      citizen_portal: "📱 Citizen Portal",
      gemini_key: "Gemini Key",

      // Navigation Dock
      nav_dashboard: "Dashboard",
      nav_ai_intel: "AI Intelligence",
      nav_operations: "Operations",
      nav_insights: "Insights",

      // Dropdown: AI Intelligence
      nav_forecast: "AI Road Forecast",
      nav_forecast_desc: "7-day predictive risk corridors",
      nav_inspection: "AI Inspection",
      nav_inspection_desc: "Upload photos or road video streams",
      nav_assistant: "AI Assistant",
      nav_assistant_desc: "Ask maintenance & query assistant",

      // Dropdown: Operations
      nav_resources: "Resource Intelligence",
      nav_resources_desc: "Auto-dispatch PWD repair units",
      nav_tasks: "Repair Tasks",
      nav_tasks_desc: "Work orders & track crew progress",
      nav_live_data: "Live Data",
      nav_live_data_desc: "Inspect real-time CCTV/IoT sensor feeds",

      // Dropdown: Insights
      nav_reports: "Reports & Insights",
      nav_reports_desc: "Export GIS audit & compliance metrics",
      nav_city_analytics: "City Analytics",
      nav_city_analytics_desc: "Urban infrastructure health scoring",
      nav_trends: "Trends & Statistics",
      nav_trends_desc: "Hazard patterns & historical analysis",

      // KPI Metrics
      kpi_active_issues: "ACTIVE ISSUES",
      kpi_active_sub: "Live Geotagged Hazards",
      kpi_critical_issues: "CRITICAL SEVERITY",
      kpi_critical_sub: "Immediate Danger",
      kpi_road_health: "ROAD HEALTH INDEX",
      kpi_road_health_sub: "Avg Structural Quality",
      kpi_repair_teams: "REPAIR TEAMS",
      kpi_repair_teams_sub: "Active / Standby Units",
      kpi_false_positives: "FALSE POSITIVES",
      kpi_false_positives_sub: "Filtered by AI Fusion",
      kpi_est_cost: "EST. REPAIR COST",
      kpi_est_cost_sub: "Prioritized Budget Need",

      // Severity Legend
      legend_severity: "SEVERITY",
      legend_all: "ALL",
      severity_critical: "Critical",
      severity_high: "High",
      severity_medium: "Medium",
      severity_low: "Low",

      // Workflow Statuses
      status_unresolved: "UNRESOLVED",
      status_in_progress: "IN PROGRESS",
      status_resolved: "RESOLVED",
      status_verified: "Verified",
      status_audited_fp: "Audited (FP)",

      // Hazard Types
      hazard_pothole: "Pothole",
      hazard_waterlogging: "Waterlogging",
      hazard_guardrail: "Guardrail Damage",
      hazard_debris: "Road Debris",
      hazard_signage: "Signage Problem",
      hazard_distress: "Road Distress",
      hazard_other: "Other",

      // Reporting Sources
      source_citizen: "Citizen Report",
      source_cctv: "CCTV Camera",
      source_patrol: "Municipal Patrol",
      source_engineer: "Field Engineer",
      source_emergency: "Hospital Emergency",

      // Incident Feed
      feed_title: "INCIDENT FEED",
      feed_subtitle: "Live verified road safety issues",
      feed_search_placeholder: "Search issues, roads, cities...",
      sort_highest_risk: "Highest Risk",
      sort_lowest_risk: "Lowest Risk",
      sort_newest: "Newest First",
      sort_oldest: "Oldest First",
      filter_all: "All",
      view_details: "View Details →",
      risk_label: "Risk:",
      open_maps: "Open in Google Maps ↗",
      est_cost_label: "Est. Repair Cost:",
      empty_incidents: "No incidents matching the selected filters.",

      // Report Road Issue Modal
      modal_report_title: "Report Road Issue",
      modal_report_subtitle: "Fast reporting for citizens, patrol units, and municipal authorities",
      form_state: "State",
      form_city: "City",
      form_road: "Road / Landmark",
      form_road_placeholder: "e.g. NH-52 Bypass, Near City Hospital",
      form_road_type: "Road Type",
      form_issue_type: "Issue Type",
      form_severity: "Severity Level",
      form_source: "Reporting Source",
      form_photo: "Photo / Visual Evidence",
      form_desc: "Description / Citizen Notes",
      form_desc_placeholder: "Describe the hazard size, lane obstruction, or danger level...",
      form_submit: "Submit Road Issue",
      form_cancel: "Cancel",
      form_submitting: "Submitting...",

      // Citizen Portal Modal
      portal_title: "Sadak Suraksha Citizen Portal",
      portal_tab_report: "Report Road Hazard",
      portal_tab_track: "Track Report Status",
      portal_track_placeholder: "Enter Ticket ID (e.g. CIT-10492)",
      portal_track_btn: "Track Status",
      portal_total_reports: "Total Reports",
      portal_ai_verified: "AI Verified",
      portal_pending: "Pending",
      portal_close: "Close",
      portal_open_standalone: "Open Full Portal",

      // AI Road Forecast View
      forecast_title: "AI Road Health Forecast & Predictive Maintenance",
      forecast_subtitle: "7-day structural deterioration, weather impact & risk projections across key transit corridors",
      forecast_corridor_heading: "Critical Monitored Corridors",
      forecast_metrics_heading: "7-Day Risk & Weather Telemetry",
      forecast_action: "Recommended PWD Action",
      forecast_corridor_jaipur: "Jaipur - Ajmer Expressway (NH-48)",
      forecast_corridor_delhi: "Delhi - Gurgaon Expressway (NH-48)",
      forecast_corridor_mumbai: "Mumbai - Pune Expressway",
      forecast_corridor_bangalore: "Bengaluru Outer Ring Road (ORR)",
      forecast_corridor_chennai: "Chennai - Bengaluru Highway (NH-48)",
      forecast_corridor_hyderabad: "Hyderabad Nehru Outer Ring Road",

      // Resource Intelligence View
      resource_title: "PWD Resource Intelligence & Automated Crew Dispatch",
      resource_subtitle: "Real-time repair crew allocations, workload distribution, and automated equipment dispatching",
      resource_active_crews: "Active Repair Crews",
      resource_utilization: "Resource Utilization",
      resource_allocation_table: "PWD Maintenance Crew Allocations",
      resource_th_crew: "Crew ID & Unit",
      resource_th_assigned: "Assigned Corridor",
      resource_th_specialty: "Equipment / Specialty",
      resource_th_workload: "Workload Status",
      resource_th_action: "Action",
      resource_btn_redeploy: "Redeploy Unit",

      // Incident Details Modal
      modal_details_title: "Hazard Incident Details",
      modal_details_badge: "AI Multi-Sensor Fusion Verified",
      details_location: "Location & Geotag",
      details_road_type: "Road Type",
      details_est_cost: "Estimated Repair Cost",
      details_source: "Reporting Source",
      details_confidence: "AI Confidence",
      details_priority: "Priority Score",
      details_status: "Workflow Status",
      details_evidence: "Visual Evidence",
      details_btn_dispatch: "Dispatch PWD Team",
      details_btn_resolve: "Mark as Resolved",
      details_btn_close: "Close",

      // General
      close: "Close",
      save: "Save",
      submit: "Submit",
      loading: "Loading...",
      status: "Status"
    },

    hi: {
      // Header
      app_title: "सड़क-सुरक्षा",
      app_badge: "एआई 🇮🇳",
      system_live: "सिस्टम लाइव",
      app_subtitle: "एआई-संचालित सड़क सुरक्षा एवं रखरखाव मंच",
      location_label: "स्थान:",
      all_india: "🇮🇳 संपूर्ण भारत",
      select_city: "शहर चुनें",
      theme_light: "लाइट",
      theme_dark: "डार्क",
      report_road_issue: "सड़क समस्या दर्ज करें",
      citizen_portal: "📱 नागरिक पोर्टल",
      gemini_key: "जेमिनी कुंजी",

      // Navigation Dock
      nav_dashboard: "डैशबोर्ड",
      nav_ai_intel: "एआई इंटेलिजेंस",
      nav_operations: "परिचालन",
      nav_insights: "इनसाइट्स",

      // Dropdown: AI Intelligence
      nav_forecast: "एआई सड़क पूर्वानुमान",
      nav_forecast_desc: "7-दिवसीय पूर्वानुमानित जोखिम गलियारे",
      nav_inspection: "एआई निरीक्षण",
      nav_inspection_desc: "फ़ोटो या सड़क वीडियो स्ट्रीम अपलोड करें",
      nav_assistant: "एआई सहायक",
      nav_assistant_desc: "रखरखाव एवं प्रश्न सहायक से पूछें",

      // Dropdown: Operations
      nav_resources: "संसाधन इंटेलिजेंस",
      nav_resources_desc: "पीडब्ल्यूडी मरम्मत इकाइयों का स्वचालित प्रेषण",
      nav_tasks: "मरम्मत कार्य",
      nav_tasks_desc: "कार्य आदेश एवं टीम प्रगति ट्रैकिंग",
      nav_live_data: "लाइव डेटा",
      nav_live_data_desc: "रीयल-टाइम सीसीटीवी/आईओटी सेंसर फ़ीड देखें",

      // Dropdown: Insights
      nav_reports: "रिपोर्ट एवं इनसाइट्स",
      nav_reports_desc: "जीआईएस ऑडिट एवं अनुपालन रिपोर्ट निर्यात करें",
      nav_city_analytics: "शहर विश्लेषण",
      nav_city_analytics_desc: "शहरी बुनियादी ढांचा स्वास्थ्य स्कोरिंग",
      nav_trends: "रुझान एवं सांख्यिकी",
      nav_trends_desc: "खतरे के पैटर्न एवं ऐतिहासिक विश्लेषण",

      // KPI Metrics
      kpi_active_issues: "सक्रिय समस्याएँ",
      kpi_active_sub: "लाइव जियोटैग किए गए खतरे",
      kpi_critical_issues: "गंभीर समस्याएँ",
      kpi_critical_sub: "तत्काल खतरे वाली सड़कें",
      kpi_road_health: "सड़क स्वास्थ्य सूचकांक",
      kpi_road_health_sub: "औसत संरचनात्मक गुणवत्ता",
      kpi_repair_teams: "उपलब्ध टीमें",
      kpi_repair_teams_sub: "सक्रिय / स्टैंडबाय इकाइयां",
      kpi_false_positives: "गलत रिपोर्टें",
      kpi_false_positives_sub: "एआई फ़्यूज़न द्वारा फ़िल्टर",
      kpi_est_cost: "अनुमानित लागत",
      kpi_est_cost_sub: "प्राथमिकता बजट आवश्यकता",

      // Severity Legend
      legend_severity: "गंभीरता",
      legend_all: "सभी",
      severity_critical: "गंभीर",
      severity_high: "उच्च",
      severity_medium: "मध्यम",
      severity_low: "कम",

      // Workflow Statuses
      status_unresolved: "अनसुलझा",
      status_in_progress: "प्रगति पर",
      status_resolved: "हल किया गया",
      status_verified: "सत्यापित",
      status_audited_fp: "ऑडिटेड (गलत)",

      // Hazard Types
      hazard_pothole: "गड्ढा",
      hazard_waterlogging: "जलभराव",
      hazard_guardrail: "सुरक्षा रेलिंग क्षति",
      hazard_debris: "सड़क पर मलबा",
      hazard_signage: "सड़क संकेत समस्या",
      hazard_distress: "सड़क क्षति",
      hazard_other: "अन्य",

      // Reporting Sources
      source_citizen: "नागरिक रिपोर्ट",
      source_cctv: "सीसीटीवी कैमरा",
      source_patrol: "नगरपालिका गश्ती",
      source_engineer: "फील्ड इंजीनियर",
      source_emergency: "अस्पताल आपातकाल",

      // Incident Feed
      feed_title: "घटना फ़ीड",
      feed_subtitle: "लाइव सत्यापित सड़क सुरक्षा समस्याएँ",
      feed_search_placeholder: "समस्याएँ, सड़कें, शहर खोजें...",
      sort_highest_risk: "उच्चतम जोखिम",
      sort_lowest_risk: "न्यूनतम जोखिम",
      sort_newest: "नवीनतम पहले",
      sort_oldest: "पुराने पहले",
      filter_all: "सभी",
      view_details: "विवरण देखें →",
      risk_label: "जोखिम:",
      open_maps: "गूगल मैप्स में खोलें ↗",
      est_cost_label: "अनुमानित मरम्मत लागत:",
      empty_incidents: "चयनित फ़िल्टर के अनुसार कोई घटना नहीं मिली।",

      // Report Road Issue Modal
      modal_report_title: "सड़क समस्या दर्ज करें",
      modal_report_subtitle: "नागरिकों, गश्ती इकाइयों और नगरपालिका अधिकारियों के लिए त्वरित रिपोर्टिंग",
      form_state: "राज्य",
      form_city: "शहर",
      form_road: "सड़क / लैंडमार्क",
      form_road_placeholder: "उदा. एनएच-52 बाईपास, सिटी अस्पताल के पास",
      form_road_type: "सड़क का प्रकार",
      form_issue_type: "समस्या का प्रकार",
      form_severity: "गंभीरता स्तर",
      form_source: "रिपोर्टिंग स्रोत",
      form_photo: "फ़ोटो / विज़ुअल साक्ष्य",
      form_desc: "विवरण / नागरिक टिप्पणी",
      form_desc_placeholder: "गड्ढे का आकार, लेन अवरोध या खतरे के स्तर का विवरण दें...",
      form_submit: "सड़क समस्या सबमिट करें",
      form_cancel: "रद्द करें",
      form_submitting: "सबमिट हो रहा है...",

      // Citizen Portal Modal
      portal_title: "सड़क सुरक्षा नागरिक पोर्टल",
      portal_tab_report: "सड़क खतरे की रिपोर्ट करें",
      portal_tab_track: "रिपोर्ट की स्थिति ट्रैक करें",
      portal_track_placeholder: "टिकट आईडी दर्ज करें (उदा. CIT-10492)",
      portal_track_btn: "स्थिति जांचें",
      portal_total_reports: "कुल रिपोर्टें",
      portal_ai_verified: "एआई सत्यापित",
      portal_pending: "लंबित",
      portal_close: "बंद करें",
      portal_open_standalone: "पूर्ण पोर्टल खोलें",

      // AI Road Forecast View
      forecast_title: "एआई सड़क स्वास्थ्य पूर्वानुमान एवं निवारक रखरखाव",
      forecast_subtitle: "प्रमुख पारगमन गलियारों में 7-दिवसीय ढांचागत क्षरण, मौसम प्रभाव और जोखिम प्रक्षेपण",
      forecast_corridor_heading: "महत्वपूर्ण निगरानी गलियारे",
      forecast_metrics_heading: "7-दिवसीय जोखिम एवं मौसम टेलीमेट्री",
      forecast_action: "अनुशंसित पीडब्ल्यूडी कार्रवाई",
      forecast_corridor_jaipur: "जयपुर - अजमेर एक्सप्रेसवे (एनएच-48)",
      forecast_corridor_delhi: "दिल्ली - गुड़गांव एक्सप्रेसवे (एनएच-48)",
      forecast_corridor_mumbai: "मुंबई - पुणे एक्सप्रेसवे",
      forecast_corridor_bangalore: "बेंगलुरु आउटर रिंग रोड (ओआरआर)",
      forecast_corridor_chennai: "चेन्नई - बेंगलुरु हाईवे (एनएच-48)",
      forecast_corridor_hyderabad: "हैदराबाद नेहरू आउटर रिंग रोड",

      // Resource Intelligence View
      resource_title: "पीडब्ल्यूडी संसाधन इंटेलिजेंस एवं स्वचालित टीम प्रेषण",
      resource_subtitle: "रीयल-टाइम मरम्मत टीम आवंटन, कार्यभार वितरण और स्वचालित उपकरण प्रेषण",
      resource_active_crews: "सक्रिय मरम्मत दल",
      resource_utilization: "संसाधन उपयोग",
      resource_allocation_table: "पीडब्ल्यूडी रखरखाव दल आवंटन",
      resource_th_crew: "क्रू आईडी एवं इकाई",
      resource_th_assigned: "आवंटित गलियारा",
      resource_th_specialty: "उपकरण / विशेषता",
      resource_th_workload: "कार्यभार स्थिति",
      resource_th_action: "कार्रवाई",
      resource_btn_redeploy: "टीम पुनः तैनात करें",

      // Incident Details Modal
      modal_details_title: "सड़क घटना विवरण",
      modal_details_badge: "एआई मल्टी-सेंसर फ़्यूज़न द्वारा सत्यापित",
      details_location: "स्थान एवं जियोटैग",
      details_road_type: "सड़क का प्रकार",
      details_est_cost: "अनुमानित मरम्मत लागत",
      details_source: "रिपोर्टिंग स्रोत",
      details_confidence: "एआई विश्वसनीयता",
      details_priority: "प्राथमिकता स्कोर",
      details_status: "कार्यप्रवाह स्थिति",
      details_evidence: "विज़ुअल साक्ष्य",
      details_btn_dispatch: "पीडब्ल्यूडी टीम भेजें",
      details_btn_resolve: "हल किया गया चिह्नित करें",
      details_btn_close: "बंद करें",

      // General
      close: "बंद करें",
      save: "सहेजें",
      submit: "सबमिट करें",
      loading: "लोड हो रहा है...",
      status: "स्थिति"
    }
  };

  // Helper translations for dynamic values
  const severityTranslations = {
    critical: { en: 'CRITICAL', hi: 'गंभीर' },
    high: { en: 'HIGH', hi: 'उच्च' },
    medium: { en: 'MEDIUM', hi: 'मध्यम' },
    low: { en: 'LOW', hi: 'कम' }
  };

  const workflowTranslations = {
    unresolved: { en: 'UNRESOLVED', hi: 'अनसुलझा' },
    in_progress: { en: 'IN PROGRESS', hi: 'प्रगति पर' },
    resolved: { en: 'RESOLVED', hi: 'हल किया गया' }
  };

  const hazardTypeTranslations = {
    pothole: { en: 'Pothole', hi: 'गड्ढा' },
    waterlogging: { en: 'Waterlogging', hi: 'जलभराव' },
    guardrail_damage: { en: 'Guardrail Damage', hi: 'सुरक्षा रेलिंग क्षति' },
    guardrail: { en: 'Guardrail Damage', hi: 'सुरक्षा रेलिंग क्षति' },
    debris: { en: 'Road Debris', hi: 'सड़क पर मलबा' },
    road_debris: { en: 'Road Debris', hi: 'सड़क पर मलबा' },
    signage: { en: 'Signage Problem', hi: 'सड़क संकेत समस्या' },
    signage_problem: { en: 'Signage Problem', hi: 'सड़क संकेत समस्या' },
    distress: { en: 'Road Distress', hi: 'सड़क क्षति' },
    road_distress: { en: 'Road Distress', hi: 'सड़क क्षति' },
    crack: { en: 'Road Cracks', hi: 'सड़क दरारें' },
    other: { en: 'Other Hazard', hi: 'अन्य खतरा' }
  };

  const sourceTranslations = {
    citizen: { en: 'Citizen Report', hi: 'नागरिक रिपोर्ट' },
    cctv: { en: 'CCTV Camera', hi: 'सीसीटीवी कैमरा' },
    patrol: { en: 'Municipal Patrol', hi: 'नगरपालिका गश्ती' },
    engineer: { en: 'Field Engineer', hi: 'फील्ड इंजीनियर' },
    emergency: { en: 'Hospital Emergency', hi: 'अस्पताल आपातकाल' }
  };

  // Current active language (Default: English)
  let currentLang = 'en';
  try {
    const saved = localStorage.getItem('sadak_language');
    if (saved === 'hi' || saved === 'en') {
      currentLang = saved;
    }
  } catch (e) {
    currentLang = 'en';
  }

  function getLanguage() {
    return currentLang;
  }

  function t(key, defaultText) {
    const dict = translations[currentLang] || translations.en;
    return dict[key] !== undefined ? dict[key] : (defaultText !== undefined ? defaultText : key);
  }

  function translateSeverity(sev) {
    const key = (sev || '').toLowerCase();
    const entry = severityTranslations[key];
    if (entry && entry[currentLang]) return entry[currentLang];
    return (sev || '').toUpperCase();
  }

  function translateWorkflowStatus(status) {
    const key = (status || '').toLowerCase().replace(/\s+/g, '_');
    const entry = workflowTranslations[key];
    if (entry && entry[currentLang]) return entry[currentLang];
    return (status || '').toUpperCase();
  }

  function translateHazardType(hazardType) {
    const key = (hazardType || '').toLowerCase().replace(/\s+/g, '_');
    const entry = hazardTypeTranslations[key];
    if (entry && entry[currentLang]) return entry[currentLang];
    return (hazardType || 'Pothole').replace(/_/g, ' ');
  }

  function translateSource(src) {
    const key = (src || '').toLowerCase().replace(/\s+/g, '_');
    const entry = sourceTranslations[key];
    if (entry && entry[currentLang]) return entry[currentLang];
    return src || 'Citizen Report';
  }

  function updateDOM() {
    // 1. Text Content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key && translations[currentLang] && translations[currentLang][key] !== undefined) {
        el.textContent = translations[currentLang][key];
      }
    });

    // 2. HTML Content
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (key && translations[currentLang] && translations[currentLang][key] !== undefined) {
        el.innerHTML = translations[currentLang][key];
      }
    });

    // 3. Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && translations[currentLang] && translations[currentLang][key] !== undefined) {
        el.setAttribute('placeholder', translations[currentLang][key]);
      }
    });

    // 4. Titles / Tooltips
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key && translations[currentLang] && translations[currentLang][key] !== undefined) {
        el.setAttribute('title', translations[currentLang][key]);
      }
    });

    // 5. Update Language Selector Buttons in Header
    const btnEn = document.getElementById('lang-btn-en');
    const btnHi = document.getElementById('lang-btn-hi');
    if (btnEn && btnHi) {
      if (currentLang === 'hi') {
        btnHi.className = 'px-2 py-0.5 rounded-lg text-xs font-bold transition-all bg-orange-600 text-white shadow-sm cursor-pointer';
        btnEn.className = 'px-2 py-0.5 rounded-lg text-xs font-medium transition-all text-slate-300 hover:text-white cursor-pointer';
      } else {
        btnEn.className = 'px-2 py-0.5 rounded-lg text-xs font-bold transition-all bg-cyan-600 text-white shadow-sm cursor-pointer';
        btnHi.className = 'px-2 py-0.5 rounded-lg text-xs font-medium transition-all text-slate-300 hover:text-white cursor-pointer';
      }
    }

    // 6. Update document lang attribute
    document.documentElement.lang = currentLang;
  }

  function setLanguage(lang) {
    if (lang !== 'en' && lang !== 'hi') return;
    currentLang = lang;
    try {
      localStorage.setItem('sadak_language', lang);
    } catch (e) {
      console.warn('localStorage not accessible for language saving', e);
    }

    updateDOM();

    // Re-render dynamic list items if window.allHazards is present
    if (window.allHazards && typeof window.renderIncidentFeed === 'function') {
      window.renderIncidentFeed(window.allHazards);
    }
    if (window.allHazards && typeof window.renderMapMarkers === 'function') {
      window.renderMapMarkers(window.allHazards);
    }

    // Refresh Lucide icons if available
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // Expose global API
  window.i18n = {
    t,
    getLanguage,
    setLanguage,
    translateSeverity,
    translateWorkflowStatus,
    translateHazardType,
    translateSource,
    updateDOM,
    translations
  };

  // Expose helper shortcut functions
  window.t = t;
  window.setLanguage = setLanguage;
  window.translateSeverity = translateSeverity;
  window.translateWorkflowStatus = translateWorkflowStatus;
  window.translateHazardType = translateHazardType;
  window.translateSource = translateSource;

  // Initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    updateDOM();
  });
})();
