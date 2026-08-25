"""
Database Seed and Export Utility for SadakSuraksha AI.
Populates database instances from Pan-India demo fixtures or exports to JSON.
"""

import json
from pathlib import Path
from backend.data.demo_data import get_demo_hazards, get_demo_road_segments
from backend.core.prioritization_engine import PrioritizationEngine

def export_fixtures_json(output_dir: Path = None):
    if output_dir is None:
        output_dir = Path(__file__).parent / "fixtures"
    output_dir.mkdir(parents=True, exist_ok=True)

    hazards = get_demo_hazards()
    roads = get_demo_road_segments()
    pe = PrioritizationEngine()
    work_orders = pe.cluster_and_generate_work_orders(hazards)

    hazards_json = [h.model_dump() for h in hazards]
    roads_json = [r.model_dump() for r in roads]
    wo_json = [wo.model_dump() for wo in work_orders]

    with open(output_dir / "hazards.json", "w", encoding="utf-8") as f:
        json.dump(hazards_json, f, indent=2, ensure_ascii=False)

    with open(output_dir / "roads.json", "w", encoding="utf-8") as f:
        json.dump(roads_json, f, indent=2, ensure_ascii=False)

    with open(output_dir / "work_orders.json", "w", encoding="utf-8") as f:
        json.dump(wo_json, f, indent=2, ensure_ascii=False)

    print(f"✓ Seed fixtures exported to {output_dir}")
    print(f"  - Hazards: {len(hazards)}")
    print(f"  - Road Segments: {len(roads)}")
    print(f"  - Work Orders: {len(work_orders)}")

if __name__ == "__main__":
    export_fixtures_json()
