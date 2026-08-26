/**
 * Sadak Suraksha AI - Internationalization (i18n) Engine
 * Complete English & Natural Hindi (हिंदी) Translation Dictionary
 */

(function () {
  'use strict';

  const translations = {
    en: {
      // Header & Gov Bar
      gov_india: "भारत सरकार | Government of India",
      gov_morth: "सड़क परिवहन और राजमार्ग मंत्रालय | Ministry of Road Transport & Highways",
      nhai_helpline: "NHAI 24/7 Helpline:",
      live_telemetry_badge: "IRC:82 LIVE TELEMETRY",
      app_title: "SADAK-SURAKSHA",
      app_badge: "AI 🇮🇳",
      header_dept: "NHAI • NATIONAL COMMAND",
      header_title_sub: "National Multimodal AI Road Hazard & Infrastructure Maintenance Intelligence Platform",
      header_mandate_1: "MoRTH IRC:82 Standard Pavement Monitoring",
      header_mandate_2: "16 State Transport Corridors",
      citizen_portal_btn: "Citizen Portal ↗",
      exit_session_btn: "Exit Session",

      // Navigation & Filter Bar
      nav_dropdown_label: "GIS Hazard Map",
      state_label: "State:",
      city_label: "City:",
      actions_tools_btn: "Actions & Tools",
      tools_heading: "Engineering Tools",
      tools_status_active: "Active",
      tool_ingest_title: "Ingest Road Incident",
      tool_ingest_sub: "Submit manual shock / defect data",
      tool_gemini_title: "Gemini API Key",
      tool_gemini_sub: "Configure cloud multimodal AI",
      tool_exit_title: "Switch Role / Exit",
      tool_exit_sub: "Return to role gateway",

      // Navigation Modules Dropdown
      nav_gis_map: "GIS Hazard Map",
      nav_gis_map_desc: "Live geotagged road defect triage",
      nav_forecast: "AI Road Forecast",
      nav_forecast_desc: "7-day predictive risk corridors",
      nav_resource: "Resource Intelligence",
      nav_resource_desc: "Auto-dispatch PWD repair units",
      nav_studio: "Sensor Fusion Studio",
      nav_studio_desc: "Interactive 4-modal physics corroboration",
      nav_patrol: "Patrol Simulator",
      nav_patrol_desc: "Live GPS telemetry & road anomaly feed",
      nav_work_orders: "PWD Work Orders",
      nav_work_orders_desc: "Clustered contractor repair dispatches",
      nav_copilot: "NHAI Assistant",
      nav_copilot_desc: "MoRTH IRC:82 natural language copilot",
      nav_audit: "Audit & Compliance",
      nav_audit_desc: "IRC:82 compliance & budget analytics",
      nav_citizen: "Citizen Portal",
      nav_citizen_desc: "Public ticket tracking & reporting",

      // Stats Strip
      kpi_critical_hazards: "Critical Hazards",
      kpi_critical_desc: "Emergency 24h PWD action required for deep potholes >8cm and structural cave-ins on hospital corridors and high-speed transit routes.",
      kpi_active_incidents: "Active Incidents",
      kpi_active_desc: "Live verified road defects across 16 states currently under AI sensor, CCTV, and citizen 311 monitoring awaiting contractor closure.",
      kpi_work_dispatches: "Work Dispatches",
      kpi_work_desc: "Spatially clustered road repair and asphalt paving work orders auto-generated and dispatched to regional PWD teams.",
      kpi_noise_filtered: "Noise Filtered",
      kpi_noise_desc: "Harmless tree shadows, road paint marks, and sensor vibration noise successfully rejected by 4-Modal Sensor Fusion AI.",

      // Priority Backlog Feed Box
      feed_box_title: "Priority Backlog",
      feed_box_subtitle: "Live Defect Triage",
      feed_box_hint: "Click to expand backlog",
      feed_filter_all: "All",
      feed_filter_pothole: "Potholes",
      feed_filter_water: "Waterlogging",
      feed_filter_structural: "Structural",
      feed_search_ph: "Search hazards, roads, cities...",

      // Severity Legend
      legend_severity: "SEVERITY",
      legend_all: "All",
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
      // Header & Gov Bar
      gov_india: "भारत सरकार | Government of India",
      gov_morth: "सड़क परिवहन और राजमार्ग मंत्रालय | Ministry of Road Transport & Highways",
      nhai_helpline: "एनएचएआई 24/7 हेल्पलाइन:",
      live_telemetry_badge: "IRC:82 लाइव टेलीमेट्री",
      app_title: "सड़क-सुरक्षा",
      app_badge: "एआई 🇮🇳",
      header_dept: "एनएचएआई • राष्ट्रीय कमान",
      header_title_sub: "राष्ट्रीय मल्टीमॉडल एआई सड़क खतरा एवं अवसंरचना रखरखाव इंटेलिजेंस मंच",
      header_mandate_1: "सड़क मंत्रालय IRC:82 मानक सड़क निगरानी",
      header_mandate_2: "16 राज्य परिवहन गलियारे",
      citizen_portal_btn: "नागरिक पोर्टल ↗",
      exit_session_btn: "सत्र समाप्त",

      // Navigation & Filter Bar
      nav_dropdown_label: "जीआईएस खतरा मानचित्र",
      state_label: "राज्य:",
      city_label: "शहर:",
      actions_tools_btn: "कार्रवाई एवं उपकरण",
      tools_heading: "इंजीनियरिंग उपकरण",
      tools_status_active: "सक्रिय",
      tool_ingest_title: "सड़क घटना दर्ज करें",
      tool_ingest_sub: "मैनुअल कंपन / दोष डेटा सबमिट करें",
      tool_gemini_title: "जेमिनी एपीआई कुंजी",
      tool_gemini_sub: "क्लाउड मल्टीमॉडल एआई कॉन्फ़िगर करें",
      tool_exit_title: "भूमिका बदलें / बाहर निकलें",
      tool_exit_sub: "रोल गेटवे पर वापस जाएं",

      // Navigation Modules Dropdown
      nav_gis_map: "जीआईएस खतरा मानचित्र",
      nav_gis_map_desc: "लाइव जियोटैग की गई सड़क दोष प्राथमिकता",
      nav_forecast: "एआई सड़क पूर्वानुमान",
      nav_forecast_desc: "7-दिवसीय पूर्वानुमानित जोखिम गलियारे",
      nav_resource: "संसाधन इंटेलिजेंस",
      nav_resource_desc: "पीडब्ल्यूडी मरम्मत इकाइयों का स्वचालित प्रेषण",
      nav_studio: "सेंसर फ़्यूज़न स्टूडियो",
      nav_studio_desc: "इंटरैक्टिव 4-मॉडल भौतिकी सत्यापन",
      nav_patrol: "गश्ती सिम्युलेटर",
      nav_patrol_desc: "लाइव जीपीएस टेलीमेट्री एवं सड़क विसंगति फ़ीड",
      nav_work_orders: "पीडब्ल्यूडी कार्य आदेश",
      nav_work_orders_desc: "समूहीकृत ठेकेदार मरम्मत प्रेषण",
      nav_copilot: "एनएचएआई एआई सहायक",
      nav_copilot_desc: "सड़क मंत्रालय IRC:82 प्राकृतिक भाषा सहायक",
      nav_audit: "ऑडिट एवं अनुपालन",
      nav_audit_desc: "IRC:82 अनुपालन एवं बजट विश्लेषण",
      nav_citizen: "नागरिक पोर्टल",
      nav_citizen_desc: "सार्वजनिक टिकट ट्रैकिंग एवं रिपोर्टिंग",

      // Stats Strip
      kpi_critical_hazards: "गंभीर खतरे",
      kpi_critical_desc: "अस्पताल गलियारों और हाई-स्पीड पारगमन मार्गों पर >8 सेमी गहरे गड्ढों और धंसने के लिए तत्काल 24 घंटे में पीडब्ल्यूडी कार्रवाई आवश्यक।",
      kpi_active_incidents: "सक्रिय घटनाएं",
      kpi_active_desc: "16 राज्यों में लाइव सत्यापित सड़क दोष जो वर्तमान में एआई सेंसर, सीसीटीवी और नागरिक 311 निगरानी में ठेकेदार द्वारा मरम्मत की प्रतीक्षा में हैं।",
      kpi_work_dispatches: "कार्य प्रेषण",
      kpi_work_desc: "क्षेत्रीय पीडब्ल्यूडी टीमों को स्वचालित रूप से उत्पन्न और प्रेषित स्थानिक रूप से समूहीकृत सड़क मरम्मत और डामरीकरण कार्य आदेश।",
      kpi_noise_filtered: "शोर फ़िल्टर किया गया",
      kpi_noise_desc: "4-मॉडल सेंसर फ्यूज़न एआई द्वारा पेड़ की हानिरहित छाया, सड़क के पेंट के निशान और सेंसर कंपन के शोर को सफलतापूर्वक खारिज किया गया।",

      // Priority Backlog Feed Box
      feed_box_title: "प्राथमिकता बैकलॉग",
      feed_box_subtitle: "लाइव दोष प्राथमिकता",
      feed_box_hint: "बैकलॉग देखने के लिए क्लिक करें",
      feed_filter_all: "सभी",
      feed_filter_pothole: "सड़क गड्ढे",
      feed_filter_water: "जलभराव",
      feed_filter_structural: "संरचनात्मक क्षति",
      feed_search_ph: "खतरे, सड़कें, शहर खोजें...",

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
        btnHi.className = 'nhai-lang-btn active';
        btnEn.className = 'nhai-lang-btn';
      } else {
        btnEn.className = 'nhai-lang-btn active';
        btnHi.className = 'nhai-lang-btn';
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
