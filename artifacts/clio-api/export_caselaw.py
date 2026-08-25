"""
export_caselaw.py
=================
Exports and unifies all Federal and State case law records from SQLite, SEED_CASES,
and legal_database.json into a clean, rich JSON payload for online and offline PWA search.
"""

import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / "data" / "federal_case_law.db"
JSON_PATH = BASE_DIR / "legal_database.json"

def categorize_case(title: str, holding: str, key_principles: str, topics: list) -> str:
    text = (title + " " + holding + " " + key_principles + " " + " ".join(topics)).lower()
    if any(k in text for k in ["922(g)", "firearm", "gun", "second amendment", "bruen", "rahimi", "felon in possession", "armored"]):
        return "922g_firearms"
    elif any(k in text for k in ["rico", "racketeer", "enterprise", "conspiracy", "1962"]):
        return "rico_conspiracy"
    elif any(k in text for k in ["drug", "narcotic", "trafficking", "controlled substance", "841", "methamphetamine", "fentanyl", "cocaine"]):
        return "drug_trafficking"
    elif any(k in text for k in ["murder", "homicide", "manslaughter", "capital", "death penalty", "1111"]):
        return "murder_homicide"
    elif any(k in text for k in ["fourth amendment", "fifth amendment", "sixth amendment", "eighth amendment", "warrant", "search", "miranda", "gideon", "suppress"]):
        return "constitutional"
    elif any(k in text for k in ["ednc", "wdnc", "mdnc", "ca4", "fourth circuit", "north carolina"]):
        return "nc_federal"
    else:
        return "general_precedent"

def main():
    cases_by_cite = {}
    
    # 1. Load from legal_database.json (rich detail)
    if JSON_PATH.exists():
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            jdata = json.load(f)
            for item in jdata:
                cite = item.get("citation", "").strip()
                title = item.get("case_name", "").strip()
                topics = item.get("primary_topics", [])
                cat = categorize_case(title, item.get("summary", ""), item.get("rule_of_law", ""), topics)
                cases_by_cite[cite] = {
                    "title": title,
                    "citation": cite,
                    "year": item.get("year", 2024),
                    "court": item.get("court", "SCOTUS"),
                    "practice_area": item.get("jurisdiction", "Federal Criminal Precedent"),
                    "holding": item.get("summary", ""),
                    "key_principles": item.get("rule_of_law", ""),
                    "rule_of_law": item.get("rule_of_law", ""),
                    "application_notes": item.get("application_notes", ""),
                    "related_statutes": item.get("related_statutes", []),
                    "primary_topics": topics,
                    "status": "Precedential",
                    "lexis_cite": f"{item.get('year', 2024)} U.S. LEXIS",
                    "category": cat,
                    "source": "federal" if "U.S." in item.get("court", "") or "Federal" in item.get("jurisdiction", "") else "state"
                }

    # 2. Load from SQLite federal_case_law.db
    if DB_PATH.exists():
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        rows = cur.execute("SELECT * FROM federal_case_law").fetchall()
        for r in rows:
            cite = r["citation"].strip()
            title = r["title"].strip()
            holding = r["holding"].strip()
            kp = r["key_principles"].strip()
            court = r["court"].strip()
            cat = categorize_case(title, holding, kp, [r["practice_area"]])
            
            if cite not in cases_by_cite:
                cases_by_cite[cite] = {
                    "title": title,
                    "citation": cite,
                    "year": r["year"],
                    "court": court,
                    "practice_area": r["practice_area"],
                    "holding": holding,
                    "key_principles": kp,
                    "rule_of_law": kp.split(";")[0] if ";" in kp else kp,
                    "application_notes": f"Precedential authority binding in {court}. Review holding and status.",
                    "related_statutes": [],
                    "primary_topics": [r["practice_area"]],
                    "status": r["status"],
                    "lexis_cite": r["lexis_cite"] or "",
                    "category": cat,
                    "source": "state" if court in ["NC SC", "NC COA"] else "federal"
                }
        conn.close()

    # 3. Load SEED_CASES from case_law_db.py
    try:
        from case_law_db import SEED_CASES
        for s in SEED_CASES:
            cite = s["citation"].strip()
            if cite not in cases_by_cite:
                title = s["title"].strip()
                holding = s["holding"].strip()
                kp = s["key_principles"].strip()
                court = s["court"].strip()
                cat = categorize_case(title, holding, kp, [s["practice_area"]])
                cases_by_cite[cite] = {
                    "title": title,
                    "citation": cite,
                    "year": s["year"],
                    "court": court,
                    "practice_area": s["practice_area"],
                    "holding": holding,
                    "key_principles": kp,
                    "rule_of_law": kp.split(";")[0] if ";" in kp else kp,
                    "application_notes": f"Precedential authority binding in {court}.",
                    "related_statutes": [],
                    "primary_topics": [s["practice_area"]],
                    "status": s["status"],
                    "lexis_cite": s.get("lexis_cite", ""),
                    "category": cat,
                    "source": "state" if court in ["NC SC", "NC COA"] else "federal"
                }
    except Exception as e:
        print("SEED_CASES warning:", e)

    export_list = list(cases_by_cite.values())
    export_list.sort(key=lambda x: (x["year"], x["title"]), reverse=True)
    
    # Write to clio-api
    out_api = BASE_DIR / "case_law_export.json"
    with open(out_api, "w", encoding="utf-8") as f:
        json.dump(export_list, f, indent=2)
    print(f"Exported {len(export_list)} cases to {out_api}")

    # Write to kinetic-editorial public data dir
    out_public_dir = BASE_DIR.parent / "kinetic-editorial" / "public" / "data"
    out_public_dir.mkdir(parents=True, exist_ok=True)
    out_public = out_public_dir / "case_law_export.json"
    with open(out_public, "w", encoding="utf-8") as f:
        json.dump(export_list, f, indent=2)
    print(f"Exported {len(export_list)} cases to {out_public}")

if __name__ == "__main__":
    main()
