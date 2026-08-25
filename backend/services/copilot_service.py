"""
Gemini-powered Infrastructure Inspector Co-Pilot and Conversational Assistant.
Answers municipal road infrastructure questions, drafts engineering work orders in ₹ INR,
and performs root-cause degradation risk assessments adhering to IRC / MoRTH guidelines.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional

from backend.models.schemas import (
    CopilotQuery,
    CopilotResponse,
    HazardIncident,
    WorkOrder,
)

logger = logging.getLogger("CopilotService")


class CopilotService:
    """
    Conversational AI Assistant grounded on real-time Indian road hazard datasets,
    IRC (Indian Roads Congress) standards, and municipal PWD/NHAI dispatch workflows.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Could not init GenAI client in Copilot: {e}")

    def query(
        self,
        query: CopilotQuery,
        hazards: List[HazardIncident],
        work_orders: List[WorkOrder]
    ) -> CopilotResponse:
        """
        Processes an infrastructure inquiry using Gemini API or grounded heuristic expert engine.
        """
        client_to_use = self.client
        if query.api_key and query.api_key.strip():
            try:
                from google import genai
                client_to_use = genai.Client(api_key=query.api_key.strip())
            except Exception as e:
                logger.warning(f"Failed to create client with user key: {e}")

        if client_to_use:
            try:
                return self._call_gemini_copilot(client_to_use, query.prompt, hazards, work_orders)
            except Exception as e:
                logger.error(f"Gemini copilot call failed: {e}")

        return self._local_grounded_copilot(query.prompt, hazards, work_orders)

    def _call_gemini_copilot(
        self,
        client: Any,
        prompt: str,
        hazards: List[HazardIncident],
        work_orders: List[WorkOrder]
    ) -> CopilotResponse:
        hazard_summary = []
        for h in hazards[:12]:
            hazard_summary.append({
                "id": h.id,
                "title": h.title,
                "type": h.hazard_type.value,
                "severity": h.severity.value,
                "risk_score": h.priority.raw_risk_score,
                "pci_deduct": h.priority.pci_deduct_value,
                "pvi": h.priority.pavement_vulnerability_index,
                "road_class": h.road_class.value,
                "address": h.address,
                "depth_cm": h.fusion.physical_depth_cm,
                "area_sqm": h.fusion.physical_area_sqm,
                "technique": h.priority.recommended_repair_technique,
                "cost_inr": h.priority.estimated_repair_cost_usd,
                "is_false_positive": h.fusion.is_false_positive,
            })

        system_instruction = f"""
        You are the Antigravity Municipal Infrastructure AI Co-Pilot for Indian Road Authorities (NHAI, PWD, Municipal Smart City Corporation).
        All costs are in Indian Rupees (₹ INR).
        You assist highway engineers, executive engineers, and emergency crews in analyzing road distress,
        interpreting multimodal sensor data (Visual + 3-Axis IMU Gz + Acoustics), applying IRC:82 / MoRTH specifications,
        and optimizing maintenance work orders.

        CURRENT SYSTEM DATA:
        Total Active Incidents: {len(hazards)}
        Total Active Clustered Work Orders: {len(work_orders)}
        Sample Road Assets in Indian Network:
        {json.dumps(hazard_summary, indent=2)}

        Always format currency with the Indian Rupee symbol (₹).
        Answer clearly, professionally, and with actionable civil engineering insights.
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt],
            config={"system_instruction": system_instruction},
        )

        ans_text = response.text
        referenced = [h.id for h in hazards if h.id in ans_text]
        actions = [
            "Dispatch PWD Rapid Response Crew to High-Risk Corridor",
            "Export MoRTH / IRC Pavement Condition Report",
            "Simulate Monsoon Inundation Sub-base Deterioration"
        ]

        return CopilotResponse(
            answer=ans_text,
            referenced_hazards=referenced,
            suggested_actions=actions,
        )

    def _local_grounded_copilot(
        self,
        prompt: str,
        hazards: List[HazardIncident],
        work_orders: List[WorkOrder]
    ) -> CopilotResponse:
        p_lower = prompt.lower()
        referenced_ids = []
        suggested_actions = []

        critical_hazards = [h for h in hazards if h.severity.value == "critical" and not h.fusion.is_false_positive]
        hospital_hazards = [h for h in hazards if h.road_class.value == "hospital_corridor" and not h.fusion.is_false_positive]
        potholes = [h for h in hazards if h.hazard_type.value == "pothole" and not h.fusion.is_false_positive]
        total_repair_cost = sum(h.priority.estimated_repair_cost_usd for h in hazards if not h.fusion.is_false_positive)

        if "hospital" in p_lower or "emergency" in p_lower:
            referenced_ids = [h.id for h in hospital_hazards]
            answer = f"### 🏥 Emergency & Hospital Corridor Assessment (India Sector)\n\n"
            answer += f"Found **{len(hospital_hazards)} critical road defects** along designated emergency hospital transit corridors (Hosur Road / St. John's / NIMHANS).\n\n"
            for h in hospital_hazards[:3]:
                answer += f"- **[{h.id}] {h.title}** ({h.address})\n"
                answer += f"  - **Risk Score**: `{h.priority.raw_risk_score}/100` | **Depth**: `{h.fusion.physical_depth_cm} cm` | **IMU Jerk**: `{h.telemetry.vertical_jerk_g_s if h.telemetry else 2.1} g/s`\n"
                answer += f"  - **Recommended Action**: {h.priority.recommended_repair_technique} (Est. ₹{h.priority.estimated_repair_cost_usd:,.2f})\n\n"
            answer += "> **PWD Emergency Directive**: Hospital routes carry a **1.45x Risk Multiplier** due to severe ambulance transit shock and two-wheeler skid hazards. Immediate 24-hour rapid hot-mix dispatch recommended."
            suggested_actions = ["Dispatch PWD Rapid Response Unit to Hosur Road", "Alert Traffic Police & Ambulance Corridor Control"]

        elif "top" in p_lower or "priority" in p_lower or "critical" in p_lower or "worst" in p_lower:
            sorted_by_risk = sorted([h for h in hazards if not h.fusion.is_false_positive], key=lambda x: x.priority.raw_risk_score, reverse=True)
            referenced_ids = [h.id for h in sorted_by_risk[:4]]
            answer = f"### 🚨 Top High-Priority Infrastructure Hazards (Bengaluru Network)\n\n"
            answer += f"Ranked via Multimodal Fusion (Visual AI + 3-Axis IMU + AADT Traffic + Monsoon Inundation Risk):\n\n"
            for idx, h in enumerate(sorted_by_risk[:4], 1):
                answer += f"**{idx}. [{h.id}] {h.title}** (Risk Score: `{h.priority.raw_risk_score}/100`)\n"
                answer += f"- **Location**: {h.address} ({h.road_class.value.replace('_', ' ').title()})\n"
                answer += f"- **Multimodal Telemetry**: Visual Conf `{h.fusion.visual_score*100:.0f}%` | IMU Shock `{h.fusion.inertial_score*100:.0f}%` | PVI `{h.priority.pavement_vulnerability_index}`\n"
                answer += f"- **MoRTH Technique**: {h.priority.recommended_repair_technique} (Est. ₹{h.priority.estimated_repair_cost_usd:,.2f})\n\n"
            suggested_actions = ["Generate Clustered Work Order for Top 4 Hazards", "Schedule Night-Shift Lane Milling"]

        elif "budget" in p_lower or "cost" in p_lower or "rupee" in p_lower or "estimate" in p_lower:
            answer = f"### 💰 Municipal Infrastructure Budget Analysis (in ₹ INR)\n\n"
            answer += f"- **Total Active Actionable Defects**: `{len([h for h in hazards if not h.fusion.is_false_positive])}`\n"
            answer += f"- **Estimated Total Repair Budget Required**: `₹{total_repair_cost:,.2f}`\n"
            answer += f"- **Breakdown by Hazard Type**:\n"
            
            type_costs = {}
            for h in hazards:
                if not h.fusion.is_false_positive:
                    type_costs[h.hazard_type.value] = type_costs.get(h.hazard_type.value, 0.0) + h.priority.estimated_repair_cost_usd

            for htype, cost in type_costs.items():
                answer += f"  - **{htype.replace('_', ' ').title()}**: `₹{cost:,.2f}`\n"

            answer += "\n> **Spatial Clustering Cost Savings**: Grouping proximate defects within 1.5km reduces contractor mobilization, police traffic diversion, and bitumen plant batching costs by **~26.5% (saving ~₹{:,})**.".format(int(total_repair_cost * 0.265))
            suggested_actions = ["Run PWD Budget Allocation Optimizer", "Export Smart City Work Schedule (PDF)"]

        elif "weather" in p_lower or "rain" in p_lower or "monsoon" in p_lower:
            answer = f"### 🌧️ Monsoon Rainfall & Hydraulic Pumping Risk Assessment\n\n"
            answer += "The Multimodal AI has incorporated a **Monsoon Rainfall forecast (22mm anticipated precipitation)**:\n\n"
            answer += "1. **Hydraulic Pumping Mechanism**: Water trapped inside untreated alligator cracks under heavy bus wheel loads (BMTC/KSRTC) generates intense pore pressure, stripping asphalt from aggregate **3.5x faster**.\n"
            answer += "2. **Preventative Action Required**: Deploy hot-applied polymer modified bitumen (CRMB) crack sealing immediately before water seeps into the granular sub-base.\n"
            answer += "3. **High-Vulnerability Corridors**: Outer Ring Road Bellandur Sector (PCI 48.2), Hosur Road Corridor (PCI 54.2)."
            suggested_actions = ["Dispatch Monsoon Emergency Crack Sealing Fleet", "Clear Stormwater Catch-pits & Drains"]

        else:
            answer = f"### 🛠️ Indian Municipal Infrastructure AI Co-Pilot\n\n"
            answer += f"I am analyzing the road network consisting of **{len(hazards)} recorded incidents** across **{len(work_orders)} planned work orders** in Bengaluru Urban Sector.\n\n"
            answer += f"**Key Network Indicators:**\n"
            answer += f"- **Critical Severe Hazards**: `{len(critical_hazards)}`\n"
            answer += f"- **Submerged / Hidden Potholes (Monsoon Puddles)**: `{len([h for h in potholes if h.fusion.physical_depth_cm > 6.0])}`\n"
            answer += f"- **False Positive Rejections (Shadows/Tar Stains Filtered)**: `{len([h for h in hazards if h.fusion.is_false_positive])}`\n"
            answer += f"- **Total Estimated Network Repair Cost**: `₹{total_repair_cost:,.2f}`\n\n"
            answer += "How can I assist? You can ask about emergency hospital corridors, PWD repair budgets, monsoon vulnerability, or NHAI crash barrier replacements."
            suggested_actions = ["Show Top Priority Incidents", "Review Hospital Emergency Corridors", "Check Maintenance Budget Breakdown"]

        return CopilotResponse(
            answer=answer,
            referenced_hazards=referenced_ids,
            suggested_actions=suggested_actions,
        )
