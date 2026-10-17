import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.issue import Issue, IssueDuplicate

def calculate_text_similarity(text1: str, text2: str) -> float:
    """Calculates normalized token-based Jaccard similarity between two descriptions."""
    if not text1 or not text2:
        return 0.0
    
    tokens1 = set(re.findall(r'\b\w{3,}\b', text1.lower()))
    tokens2 = set(re.findall(r'\b\w{3,}\b', text2.lower()))
    
    if not tokens1 or not tokens2:
        return 0.0
    
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)

def find_duplicate_candidates(
    db: Session,
    latitude: float,
    longitude: float,
    category: str,
    description: str,
    current_issue_id: Optional[str] = None,
    max_radius_meters: float = 80.0
) -> List[Dict[str, Any]]:
    """
    Searches nearby unresolved complaints within spatial radius using PostGIS geography,
    evaluating distance, category match, and description similarity.
    """
    sql = text("""
        SELECT 
            id, ticket_id, title, description, category, status, severity,
            latitude, longitude, created_at, reporter_id,
            ST_Distance(
                location_geom::geography, 
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
            ) as distance_meters
        FROM issues
        WHERE status NOT IN ('REJECTED', 'CLOSED')
          AND location_geom IS NOT NULL
          AND ST_DWithin(
                location_geom::geography, 
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, 
                :radius
          )
          AND (:exclude_id IS NULL OR id != :exclude_id)
        ORDER BY distance_meters ASC
        LIMIT 10;
    """)
    
    try:
        with db.begin_nested():
            results = db.execute(
                sql, 
                {
                    'lon': longitude, 
                    'lat': latitude, 
                    'radius': max_radius_meters, 
                    'exclude_id': current_issue_id
                }
            ).fetchall()
    except Exception:
        # Fallback to standard SQL trigonometry / Haversine formula (supported natively in PostgreSQL)
        fallback_sql = text("""
            SELECT 
                id, ticket_id, title, description, category, status, severity,
                latitude, longitude, created_at, reporter_id,
                (6371000 * acos(
                    LEAST(1.0, GREATEST(-1.0,
                        cos(radians(:lat)) * cos(radians(latitude)) * 
                        cos(radians(longitude) - radians(:lon)) + 
                        sin(radians(:lat)) * sin(radians(latitude))
                    ))
                )) as distance_meters
            FROM issues
            WHERE status NOT IN ('REJECTED', 'CLOSED')
              AND (:exclude_id IS NULL OR id != :exclude_id)
            ORDER BY distance_meters ASC
            LIMIT 10;
        """)
        raw_results = db.execute(
            fallback_sql, 
            {
                'lon': longitude, 
                'lat': latitude, 
                'exclude_id': current_issue_id
            }
        ).fetchall()
        results = [r for r in raw_results if r.distance_meters is not None and r.distance_meters <= max_radius_meters]

    candidates = []
    for r in results:
        dist = float(r.distance_meters)
        cand_cat = str(r.category)
        
        # Category similarity
        cat_match = 1.0 if cand_cat.upper() == str(category).upper() else 0.1
        
        # Distance score
        distance_factor = max(0.0, 1.0 - (dist / max_radius_meters))
        
        # Description text similarity
        text_sim = calculate_text_similarity(description, r.description or '')
        
        # Composite heuristic match score (0 - 100)
        composite_score = (0.40 * cat_match + 0.40 * distance_factor + 0.20 * text_sim) * 100.0
        
        if composite_score >= 45.0 or (dist < 30.0 and cat_match == 1.0):
            reason_items = [f"{dist:.1f}m away"]
            if cat_match == 1.0:
                reason_items.append("identical category")
            else:
                reason_items.append(f"different category ({cand_cat})")
            if text_sim > 0.3:
                reason_items.append(f"{int(text_sim * 100)}% keyword match")
            
            candidates.append({
                'issue_id': r.id,
                'ticket_id': r.ticket_id,
                'title': r.title,
                'category': cand_cat,
                'status': str(r.status),
                'severity': str(r.severity),
                'distance_meters': round(dist, 1),
                'confidence_score': round(composite_score, 1),
                'match_reason': ', '.join(reason_items),
                'created_at': r.created_at.isoformat() if r.created_at else None
            })
            
    return candidates
