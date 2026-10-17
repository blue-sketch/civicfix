from datetime import datetime, timezone
from typing import Dict, Any, Optional

SEVERITY_WEIGHTS = {
    'LOW': 20.0,
    'MEDIUM': 45.0,
    'HIGH': 70.0,
    'CRITICAL': 100.0,
}

CATEGORY_IMPACT = {
    'WATERLOGGING': 85.0,
    'FALLEN_TREE': 80.0,
    'POTHOLE': 75.0,
    'DAMAGED_INFRASTRUCTURE': 70.0,
    'WATER_LEAK': 65.0,
    'STREETLIGHT': 50.0,
    'GARBAGE': 40.0,
    'ROAD_CRACK': 35.0,
    'OTHER': 30.0,
}

def calculate_priority_score(
    severity: str,
    category: str,
    created_at: datetime,
    corroboration_count: int = 1,
    is_resolved: bool = False
) -> Dict[str, Any]:
    """
    Deterministic, explainable priority calculation as specified in Civic Fix specification:
    priority_score = 0.35 * severity_score + 0.30 * impact_score + 0.25 * age_score + 0.10 * corroboration_score
    """
    # 1. Severity Score (0-100)
    sev_key = str(severity).upper()
    severity_score = SEVERITY_WEIGHTS.get(sev_key, 45.0)

    # 2. Impact Score (0-100)
    cat_key = str(category).upper()
    impact_score = CATEGORY_IMPACT.get(cat_key, 30.0)

    # 3. Age Score (0-100) with 14-day saturation interval
    if is_resolved:
        age_hours = 0.0
        age_score = 0.0
    else:
        now = datetime.now(timezone.utc)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        age_seconds = max(0.0, (now - created_at).total_seconds())
        age_hours = age_seconds / 3600.0
        # 14 days = 336 hours
        age_score = min(100.0, (age_hours / 336.0) * 100.0)

    # 4. Corroboration Score (0-100)
    if corroboration_count <= 1:
        corroboration_score = 15.0
    elif corroboration_count == 2:
        corroboration_score = 40.0
    elif corroboration_count == 3:
        corroboration_score = 65.0
    elif corroboration_count == 4:
        corroboration_score = 85.0
    else:
        corroboration_score = 100.0

    # Weighted calculation
    weighted_score = (
        0.35 * severity_score +
        0.30 * impact_score +
        0.25 * age_score +
        0.10 * corroboration_score
    )
    final_score = round(min(100.0, max(0.0, weighted_score)), 1)

    # Determine priority band
    if final_score >= 75.0 or sev_key == 'CRITICAL':
        priority_band = 'CRITICAL'
    elif final_score >= 55.0:
        priority_band = 'HIGH'
    elif final_score >= 35.0:
        priority_band = 'MEDIUM'
    else:
        priority_band = 'LOW'

    # Safety emergency override flag
    is_emergency = (
        sev_key == 'CRITICAL' or 
        (sev_key == 'HIGH' and cat_key in ['WATERLOGGING', 'FALLEN_TREE', 'DAMAGED_INFRASTRUCTURE'])
    )

    reason = (
        f"Severity ({severity_score:.0f}/100, 35%), Category impact ({impact_score:.0f}/100, 30%), "
        f"Unresolved age ({age_score:.0f}/100, 25%, {age_hours:.1f}h open), "
        f"Independent reports ({corroboration_score:.0f}/100, 10%, {corroboration_count} reports)."
    )
    if is_emergency:
        reason += " [URGENT PUBLIC SAFETY OVERRIDE ACTIVE]"

    return {
        'score': final_score,
        'band': priority_band,
        'is_emergency': is_emergency,
        'breakdown': {
            'severity_component': round(severity_score, 1),
            'impact_component': round(impact_score, 1),
            'age_component': round(age_score, 1),
            'corroboration_component': round(corroboration_score, 1),
            'age_hours': round(age_hours, 1),
            'corroboration_count': corroboration_count,
            'weights': {'severity': 0.35, 'impact': 0.30, 'age': 0.25, 'corroboration': 0.10}
        },
        'explanation': reason
    }
