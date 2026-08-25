"""
nc_deadlines.py
===============
North Carolina Statutory Deadline Engine with N.C. R. Civ. P. 6(a) holiday/weekend rules.
"""

from __future__ import annotations

import datetime
from dataclasses import dataclass

@dataclass
class DeadlineRule:
    code: str
    title: str
    rule_citation: str
    days: int
    calendar_days: bool  # False = business days
    description: str

NC_RULES = {
    "nc_civ_proc_12_a_1": DeadlineRule(
        code="nc_civ_proc_12_a_1",
        title="Answer to Complaint",
        rule_citation="N.C. R. Civ. P. 12(a)(1)",
        days=30,
        calendar_days=True,
        description="Defendant must serve answer within 30 days after service of summons and complaint."
    ),
    "nc_civ_proc_33_a": DeadlineRule(
        code="nc_civ_proc_33_a",
        title="Interrogatory Responses",
        rule_citation="N.C. R. Civ. P. 33(a)",
        days=30,
        calendar_days=True,
        description="Responses or objections to interrogatories must be served within 30 days."
    ),
    "nc_civ_proc_34_b": DeadlineRule(
        code="nc_civ_proc_34_b",
        title="Document Production Responses",
        rule_citation="N.C. R. Civ. P. 34(b)",
        days=30,
        calendar_days=True,
        description="Response to request for production of documents due within 30 days."
    ),
    "nc_app_r_3_c": DeadlineRule(
        code="nc_app_r_3_c",
        title="Notice of Appeal (Civil)",
        rule_citation="N.C. R. App. P. 3(c)",
        days=30,
        calendar_days=True,
        description="Notice of appeal in civil action must be filed within 30 days of entry of judgment."
    ),
    "nc_civ_proc_59_b": DeadlineRule(
        code="nc_civ_proc_59_b",
        title="Motion for New Trial",
        rule_citation="N.C. R. Civ. P. 59(b)",
        days=10,
        calendar_days=True,
        description="Motion for a new trial shall be served not later than 10 days after entry of judgment."
    ),
}

NC_STATE_HOLIDAYS_2026 = {
    datetime.date(2026, 1, 1),   # New Year's Day
    datetime.date(2026, 1, 19),  # MLK Jr. Day
    datetime.date(2026, 5, 25),  # Memorial Day
    datetime.date(2026, 6, 19),  # Juneteenth
    datetime.date(2026, 7, 3),   # Independence Day (Observed)
    datetime.date(2026, 9, 7),   # Labor Day
    datetime.date(2026, 11, 11), # Veterans Day
    datetime.date(2026, 11, 26), # Thanksgiving Day
    datetime.date(2026, 11, 27), # Day after Thanksgiving
    datetime.date(2026, 12, 24), # Christmas Eve
    datetime.date(2026, 12, 25), # Christmas Day
}

def apply_nc_rule_6_a(target_date: datetime.date) -> tuple[datetime.date, list[str]]:
    adjustments = []
    curr = target_date

    while True:
        if curr.weekday() == 5:
            curr += datetime.timedelta(days=2)
            adjustments.append(f"Saturday rolled forward to Monday ({curr.isoformat()}) per N.C. R. Civ. P. 6(a)")
            continue
        if curr.weekday() == 6:
            curr += datetime.timedelta(days=1)
            adjustments.append(f"Sunday rolled forward to Monday ({curr.isoformat()}) per N.C. R. Civ. P. 6(a)")
            continue
        if curr in NC_STATE_HOLIDAYS_2026:
            curr += datetime.timedelta(days=1)
            adjustments.append(f"NC State Holiday rolled forward to next day ({curr.isoformat()}) per Rule 6(a)")
            continue
        break

    return curr, adjustments

def calculate_deadline(rule_code: str, trigger_date_str: str) -> dict[str, str | int | list[str]]:
    if rule_code not in NC_RULES:
        raise ValueError(f"Unknown rule code: {rule_code}")

    rule = NC_RULES[rule_code]
    trig_dt = datetime.date.fromisoformat(trigger_date_str)

    if rule.calendar_days:
        raw_dt = trig_dt + datetime.timedelta(days=rule.days)
    else:
        added = 0
        raw_dt = trig_dt
        while added < rule.days:
            raw_dt += datetime.timedelta(days=1)
            if raw_dt.weekday() < 5 and raw_dt not in NC_STATE_HOLIDAYS_2026:
                added += 1

    final_dt, adj_reasons = apply_nc_rule_6_a(raw_dt)

    return {
        "rule_code": rule.code,
        "title": rule.title,
        "citation": rule.rule_citation,
        "trigger_date": trigger_date_str,
        "calculated_date": final_dt.isoformat(),
        "raw_date": raw_dt.isoformat(),
        "adjustments": adj_reasons,
        "description": rule.description,
    }
