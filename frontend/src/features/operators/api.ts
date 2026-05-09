import { apiJson } from "../../lib/apiClient";

export interface OperatorAreaToday {
  id: number;
  code: string;
  name: string;
  kind: string;
  priority: number;
}

export interface OperatorLoad {
  user_id: number;
  user_uid: string;
  full_name: string;
  employee_number: string | null;
  title: string | null;
  email: string;
  role_codes: string[];
  notify_on_assignment: boolean;
  open_wos: number;
  in_progress_wos: number;
  overdue_wos: number;
  due_today_wos: number;
  emergency_wos: number;
  today_areas: OperatorAreaToday[];
}

export interface OperatorLoadResponse {
  items: OperatorLoad[];
  on_date: string;
}

export function getOperatorLoad(on_date?: string): Promise<OperatorLoadResponse> {
  const q = on_date ? `?on_date=${encodeURIComponent(on_date)}` : "";
  return apiJson<OperatorLoadResponse>(`/api/v1/operators/load${q}`);
}
