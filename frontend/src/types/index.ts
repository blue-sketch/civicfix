export type UserRole = 'CITIZEN' | 'MUNICIPAL_OFFICER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  department_id?: number | null;
  is_active: boolean;
  created_at: string;
}

export interface OfficerAccount extends User {
  department_id?: number | null;
}

export type IssueCategory =
  | 'POTHOLE'
  | 'ROAD_CRACK'
  | 'GARBAGE'
  | 'WATER_LEAK'
  | 'STREETLIGHT'
  | 'WATERLOGGING'
  | 'FALLEN_TREE'
  | 'DAMAGED_INFRASTRUCTURE'
  | 'OTHER';

export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IssueStatus =
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CERTIFIED'
  | 'CLOSED'
  | 'REOPENED'
  | 'REJECTED';

export interface IssuePhoto {
  id: number;
  photo_url: string;
  photo_type: string;
  caption?: string;
  created_at: string;
}

export interface IssueAssignment {
  id: number;
  department_id?: number;
  department_name?: string;
  team_id?: number;
  team_name?: string;
  assigned_to_user_id?: number;
  assigned_to_name?: string;
  assigned_by_name?: string;
  notes?: string;
  is_current: boolean;
  assigned_at: string;
}

export interface IssueUpdate {
  id: number;
  actor_id?: number;
  actor_name?: string;
  from_status?: IssueStatus;
  to_status: IssueStatus;
  note?: string;
  created_at: string;
}

export interface IssueComment {
  id: number;
  author_id: number;
  author_name: string;
  author_role: string;
  comment_text: string;
  is_internal: boolean;
  created_at: string;
}

export interface IssueDuplicateCandidate {
  candidate_id: number;
  other_issue_id: string;
  other_ticket_id: string;
  other_title: string;
  category: string;
  status: string;
  confidence_score: number;
  relationship_status: 'CANDIDATE' | 'CONFIRMED' | 'REJECTED';
  is_canonical: boolean;
}

export interface PriorityBreakdown {
  severity_component: number;
  impact_component: number;
  age_component: number;
  corroboration_component: number;
  age_hours: number;
  corroboration_count: number;
  weights: {
    severity: number;
    impact: number;
    age: number;
    corroboration: number;
  };
}

export interface PriorityInfo {
  score: number;
  band: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  is_emergency: boolean;
  breakdown: PriorityBreakdown;
  explanation: string;
}

export interface IssueDetail {
  id: string;
  ticket_id: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  latitude: floatNumber;
  longitude: floatNumber;
  address_text?: string;
  ward_id?: number;
  ward_name?: string;
  department_id?: number;
  department_name?: string;
  reporter_id: number;
  reporter_name?: string;
  is_anonymous: boolean;
  canonical_issue_id?: string;
  priority_score: number;
  priority_breakdown?: PriorityInfo;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  verified_at?: string;
  resolved_at?: string;
  certified_at?: string;
  certified_by_name?: string;
  closed_at?: string;
  photos: IssuePhoto[];
  assignments: IssueAssignment[];
  updates: IssueUpdate[];
  comments: IssueComment[];
  duplicate_candidates: IssueDuplicateCandidate[];
}

type floatNumber = number;

export interface MapIssue {
  id: string;
  ticket_id: string;
  title: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  latitude: number;
  longitude: number;
  priority_score: number;
  priority_band: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  address_text?: string;
  ward_name?: string;
  created_at: string;
}

export interface IssueListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: IssueDetail[];
}

export interface OverviewMetrics {
  total_reports: number;
  open_issues: number;
  high_priority_issues: number;
  resolved_this_month: number;
  avg_resolution_hours: number;
  median_resolution_hours: number;
  overdue_issues: number;
  resolution_rate_percent: number;
}

export interface CategoryMetric {
  category: string;
  count: number;
  percentage: number;
}

export interface StatusMetric {
  status: string;
  count: number;
}

export interface TrendPoint {
  date: string;
  submitted: number;
  resolved: number;
}

export interface WardMetric {
  ward_id: number;
  ward_name: string;
  open_count: number;
  resolved_count: number;
  total_count: number;
}

export interface TeamMetric {
  team_id: number;
  team_name: string;
  department_name: string;
  active_tasks: number;
  resolved_tasks: number;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface Ward {
  id: number;
  name: string;
  code: string;
  zone: string;
}

export interface Team {
  id: number;
  name: string;
  department_id: number;
  department_name?: string;
  leader_name?: string;
  members: {
    id: number;
    full_name: string;
    email: string;
    role: string;
  }[];
}

export interface SavedRoute {
  id: number;
  name: string;
  created_by: number;
  creator_name?: string;
  waypoints_geojson: {
    type: string;
    features: {
      type: string;
      geometry: {
        type: string;
        coordinates: [number, number];
      };
      properties?: Record<string, any>;
    }[];
  };
  total_distance_km: number;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  event_type: string;
  created_at: string;
}
