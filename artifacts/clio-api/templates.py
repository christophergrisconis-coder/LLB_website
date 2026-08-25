"""
templates.py
============
Practice-Area Specific Extraction Templates for North Carolina Law.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

@dataclass
class PracticeTemplate:
    code: str
    name: str
    practice_area: str
    prompt_instructions: str
    required_fields: list[str]

TEMPLATES = {
    "family_law": PracticeTemplate(
        code="family_law",
        name="Family Law & Custody",
        practice_area="Family Law",
        prompt_instructions=(
            "Focus extraction on minor children names/ages, custody schedules (NC G.S. 50-13.2), "
            "missed visitation instances, marital asset values/ED claims (NC G.S. 50-20), "
            "and domestic claims (PSS/Alimony)."
        ),
        required_fields=["minor_children", "visitation_issues", "marital_assets"]
    ),
    "personal_injury": PracticeTemplate(
        code="personal_injury",
        name="Personal Injury & Tort",
        practice_area="Personal Injury",
        prompt_instructions=(
            "Extract date of loss, accident location, medical providers, total medical bills, "
            "lost wages, insurance carrier names/policy limits, and NC contributory negligence factors."
        ),
        required_fields=["date_of_loss", "medical_bills", "insurance_carriers"]
    ),
    "criminal_defense": PracticeTemplate(
        code="criminal_defense",
        name="Criminal Defense",
        practice_area="Criminal Defense",
        prompt_instructions=(
            "Extract arrest date, charging law enforcement agency, exact statutory offense class, "
            "bond amount/conditions, upcoming court date, and suppression/Fourth Amendment issues."
        ),
        required_fields=["arrest_date", "offenses", "bond_amount"]
    ),
    "estate_planning": PracticeTemplate(
        code="estate_planning",
        name="Estate Planning & Probate",
        practice_area="Estate Planning",
        prompt_instructions=(
            "Extract testator/grantor names, appointed executor/trustees, primary beneficiaries, "
            "real property legal descriptions, and healthcare power of attorney directives."
        ),
        required_fields=["executors", "beneficiaries", "real_property"]
    ),
    "civil_litigation": PracticeTemplate(
        code="civil_litigation",
        name="Civil Litigation & Contract",
        practice_area="Civil Litigation",
        prompt_instructions=(
            "Extract contract date, breach allegation, monetary damages claim, N.C.G.S. 75-1.1 unfair "
            "trade practice claims, and Rule 12 dismissal vulnerabilities."
        ),
        required_fields=["contract_date", "damages_claimed", "breach_allegations"]
    ),
}

def list_templates() -> list[dict[str, Any]]:
    return [{"code": t.code, "name": t.name, "practice_area": t.practice_area} for t in TEMPLATES.values()]

def get_template(code: str) -> PracticeTemplate | None:
    return TEMPLATES.get(code)
