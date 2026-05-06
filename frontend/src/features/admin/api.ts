import { apiJson } from "../../lib/apiClient";

export interface InvitationRead {
  id: number;
  email: string;
  full_name: string | null;
  role_codes: string[];
  token_prefix: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  invited_by: number | null;
  created_at: string;
}

export interface InvitationCreateInput {
  email: string;
  full_name?: string;
  role_codes?: string[];
  expires_in_days?: number;
}

export interface InvitationCreateResponse {
  invitation: InvitationRead;
  token: string;
  accept_url: string;
}

export interface InvitationListResponse {
  items: InvitationRead[];
}

export interface UserRead {
  user_uid: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  roles: { code: string; name: string }[];
}

export interface UserListResponse {
  items: UserRead[];
  page: number;
  page_size: number;
  total: number;
}

export interface AssetClassRead {
  code: string;
  domain: string;
  name: string;
  geometry_type: string;
  attribute_schema: Record<string, unknown>;
  default_criticality: number | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
}

export interface TenantRead {
  id: number;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ---- Invitations ----

export function listInvitations(): Promise<InvitationListResponse> {
  return apiJson<InvitationListResponse>("/api/v1/invitations");
}

export function createInvitation(
  input: InvitationCreateInput,
): Promise<InvitationCreateResponse> {
  return apiJson<InvitationCreateResponse>("/api/v1/invitations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function revokeInvitation(id: number): Promise<InvitationRead> {
  return apiJson<InvitationRead>(`/api/v1/invitations/${id}`, {
    method: "DELETE",
  });
}

export function acceptInvitation(input: {
  token: string;
  full_name: string;
  password: string;
}): Promise<{ ok: boolean; tenant_slug: string | null; email: string }> {
  return apiJson("/api/v1/invitations/accept", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ---- Users ----

export function listUsers(): Promise<UserListResponse> {
  return apiJson<UserListResponse>("/api/v1/users?page_size=200");
}

export function updateUserRoles(
  user_uid: string,
  role_codes: string[],
): Promise<UserRead> {
  return apiJson<UserRead>(`/api/v1/users/${user_uid}/roles`, {
    method: "POST",
    body: JSON.stringify({ role_codes }),
  });
}

export function deactivateUser(user_uid: string): Promise<UserRead> {
  return apiJson<UserRead>(`/api/v1/users/${user_uid}`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: false }),
  });
}

// ---- Tenant ----

export function getTenant(): Promise<TenantRead> {
  return apiJson<TenantRead>("/api/v1/tenant");
}

export function updateTenant(input: {
  name?: string;
  settings?: Record<string, unknown>;
}): Promise<TenantRead> {
  return apiJson<TenantRead>("/api/v1/tenant", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ---- Asset class schema ----

export function listAssetClasses(): Promise<AssetClassRead[]> {
  return apiJson<AssetClassRead[]>("/api/v1/asset-classes");
}

export function updateAssetClass(
  code: string,
  patch: Partial<{
    name: string;
    attribute_schema: Record<string, unknown>;
    default_criticality: number;
    icon: string;
    color: string;
    is_active: boolean;
  }>,
): Promise<AssetClassRead> {
  return apiJson<AssetClassRead>(`/api/v1/asset-classes/${code}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
