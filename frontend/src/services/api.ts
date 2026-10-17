import type {
  User,
  IssueDetail,
  IssueListResponse,
  MapIssue,
  OverviewMetrics,
  CategoryMetric,
  StatusMetric,
  TrendPoint,
  WardMetric,
  TeamMetric,
  Department,
  Ward,
  Team,
  SavedRoute,
  NotificationItem,
  IssueCategory,
  IssueStatus,
  IssueSeverity
} from '../types';

const API_BASE = '/api/v1';

function getAuthHeaders(isFormData: boolean = false): HeadersInit {
  const token = localStorage.getItem('civicfix_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'Network request failed';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await res.text() || res.statusText;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async register(userData: any): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Issues
  async listIssues(params: {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
    status?: string;
    severity?: string;
    ward_id?: number;
    reporter_id?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<IssueListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.page_size) query.set('page_size', params.page_size.toString());
    if (params.search) query.set('search', params.search);
    if (params.category && params.category !== 'ALL') query.set('category', params.category);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.severity && params.severity !== 'ALL') query.set('severity', params.severity);
    if (params.ward_id) query.set('ward_id', params.ward_id.toString());
    if (params.reporter_id) query.set('reporter_id', params.reporter_id.toString());
    if (params.sort_by) query.set('sort_by', params.sort_by);
    if (params.sort_order) query.set('sort_order', params.sort_order);

    const res = await fetch(`${API_BASE}/issues?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getMapIssues(params: {
    min_lat?: number;
    max_lat?: number;
    min_lon?: number;
    max_lon?: number;
    category?: string;
    status?: string;
    severity?: string;
    ward_id?: number;
  }): Promise<MapIssue[]> {
    const query = new URLSearchParams();
    if (params.min_lat !== undefined) query.set('min_lat', params.min_lat.toString());
    if (params.max_lat !== undefined) query.set('max_lat', params.max_lat.toString());
    if (params.min_lon !== undefined) query.set('min_lon', params.min_lon.toString());
    if (params.max_lon !== undefined) query.set('max_lon', params.max_lon.toString());
    if (params.category && params.category !== 'ALL') query.set('category', params.category);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.severity && params.severity !== 'ALL') query.set('severity', params.severity);
    if (params.ward_id) query.set('ward_id', params.ward_id.toString());

    const res = await fetch(`${API_BASE}/issues/map?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getIssue(id: string): Promise<IssueDetail> {
    const res = await fetch(`${API_BASE}/issues/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createIssue(data: {
    title: string;
    description: string;
    category: IssueCategory;
    severity: IssueSeverity;
    latitude: number;
    longitude: number;
    address_text?: string;
    ward_id?: number;
    is_anonymous?: boolean;
  }): Promise<IssueDetail> {
    const res = await fetch(`${API_BASE}/issues`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateIssueStatus(issueId: string, data: { status: IssueStatus; note?: string; resolution_notes?: string }): Promise<IssueDetail> {
    const res = await fetch(`${API_BASE}/issues/${issueId}/status`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async verifyIssue(issueId: string): Promise<IssueDetail> {
    const res = await fetch(`${API_BASE}/issues/${issueId}/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async assignIssue(issueId: string, data: { department_id?: number; team_id?: number; assigned_to_user_id?: number; notes?: string }): Promise<IssueDetail> {
    const res = await fetch(`${API_BASE}/issues/${issueId}/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async resolveIssue(issueId: string, resolutionNotes: string, evidencePhoto?: File): Promise<IssueDetail> {
    const formData = new FormData();
    formData.append('resolution_notes', resolutionNotes);
    if (evidencePhoto) {
      formData.append('evidence_photo', evidencePhoto);
    }
    const res = await fetch(`${API_BASE}/issues/${issueId}/resolve`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: formData,
    });
    return handleResponse(res);
  },

  async certifyIssue(issueId: string, notes?: string): Promise<IssueDetail> {
    const res = await fetch(`${API_BASE}/issues/${issueId}/certify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes }),
    });
    return handleResponse(res);
  },

  async reopenIssue(issueId: string, note: string): Promise<IssueDetail> {
    const formData = new FormData();
    formData.append('note', note);
    const res = await fetch(`${API_BASE}/issues/${issueId}/reopen`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: formData,
    });
    return handleResponse(res);
  },

  async addComment(issueId: string, commentText: string, isInternal: boolean = false) {
    const res = await fetch(`${API_BASE}/issues/${issueId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ comment_text: commentText, is_internal: isInternal }),
    });
    return handleResponse(res);
  },

  async uploadPhoto(issueId: string, file: File, caption?: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('photo_type', 'REPORT');
    if (caption) formData.append('caption', caption);

    const res = await fetch(`${API_BASE}/issues/${issueId}/photos`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: formData,
    });
    return handleResponse(res);
  },

  async confirmDuplicate(issueId: string, candidateId: number) {
    const res = await fetch(`${API_BASE}/issues/${issueId}/duplicates/${candidateId}/confirm`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async rejectDuplicate(issueId: string, candidateId: number) {
    const res = await fetch(`${API_BASE}/issues/${issueId}/duplicates/${candidateId}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Analytics
  async getOverviewMetrics(): Promise<OverviewMetrics> {
    const res = await fetch(`${API_BASE}/analytics/overview`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async getCategoryMetrics(): Promise<CategoryMetric[]> {
    const res = await fetch(`${API_BASE}/analytics/categories`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async getStatusMetrics(): Promise<StatusMetric[]> {
    const res = await fetch(`${API_BASE}/analytics/statuses`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async getTrends(days: number = 14): Promise<TrendPoint[]> {
    const res = await fetch(`${API_BASE}/analytics/trends?days=${days}`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async getWardMetrics(): Promise<WardMetric[]> {
    const res = await fetch(`${API_BASE}/analytics/wards`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async getTeamMetrics(): Promise<TeamMetric[]> {
    const res = await fetch(`${API_BASE}/analytics/teams`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  // Teams & Structure
  async listDepartments(): Promise<Department[]> {
    const res = await fetch(`${API_BASE}/departments`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async listWards(): Promise<Ward[]> {
    const res = await fetch(`${API_BASE}/wards`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async listTeams(): Promise<Team[]> {
    const res = await fetch(`${API_BASE}/teams`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  // Routes
  async listSavedRoutes(): Promise<SavedRoute[]> {
    const res = await fetch(`${API_BASE}/routes`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async createSavedRoute(name: string, waypoints: [number, number][], distanceKm: number): Promise<SavedRoute> {
    const geojson = {
      type: 'FeatureCollection',
      features: waypoints.map((pt, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pt[1], pt[0]] },
        properties: { order: i + 1 }
      }))
    };
    const res = await fetch(`${API_BASE}/routes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name,
        waypoints_geojson: geojson,
        total_distance_km: distanceKm
      }),
    });
    return handleResponse(res);
  },

  async deleteSavedRoute(routeId: number) {
    const res = await fetch(`${API_BASE}/routes/${routeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Notifications
  async listNotifications(): Promise<NotificationItem[]> {
    const res = await fetch(`${API_BASE}/notifications`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  async markNotificationRead(id: number): Promise<NotificationItem> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  }
};
