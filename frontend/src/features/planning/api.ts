import { apiJson } from "../../lib/apiClient";

export interface DailyAssignmentRead {
  id: number;
  user_id: number;
  area_id: number;
  on_date: string;
  priority: number;
  user_full_name: string | null;
  user_employee_number: string | null;
  area_code: string | null;
  area_name: string | null;
  area_kind: string | null;
}

export interface DailyAssignmentListResponse {
  items: DailyAssignmentRead[];
  on_date: string;
}

export interface DailyAssignmentCreateInput {
  user_id: number;
  area_id: number;
  on_date: string;
  priority?: number;
}

export function listDailyAssignments(date: string): Promise<DailyAssignmentListResponse> {
  return apiJson<DailyAssignmentListResponse>(
    `/api/v1/daily-assignments?date=${encodeURIComponent(date)}`,
  );
}

export function createDailyAssignment(
  input: DailyAssignmentCreateInput,
): Promise<DailyAssignmentRead> {
  return apiJson<DailyAssignmentRead>("/api/v1/daily-assignments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteDailyAssignment(id: number): Promise<void> {
  return apiJson<void>(`/api/v1/daily-assignments/${id}`, { method: "DELETE" });
}

export interface ServiceAreaListItem {
  id: number;
  code: string;
  name: string;
  kind: "maintenance" | "water_system" | "sewer_system" | "storm_system";
  color: string | null;
}

export interface ServiceAreaListResponse {
  items: ServiceAreaListItem[];
}

export function listServiceAreas(): Promise<ServiceAreaListResponse> {
  return apiJson<ServiceAreaListResponse>("/api/v1/service-areas");
}

