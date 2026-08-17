import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface AuditLog {
  id: number;
  userId: number | null;
  organizationId: number | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  success: boolean;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AuditLogsParams {
  page?: number;
  limit?: number;
  orgId?: number;
  userId?: number;
  action?: string;
  success?: boolean;
  from?: string;
  to?: string;
}

export function getAuditLogsQueryKey(params: AuditLogsParams = {}) {
  return ["admin", "audit-logs", params] as const;
}

export function useAuditLogs(params: AuditLogsParams = {}) {
  const { page = 1, limit = 50, orgId, userId, action, success, from, to } = params;
  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(limit));
  if (orgId != null) query.set("orgId", String(orgId));
  if (userId != null) query.set("userId", String(userId));
  if (action) query.set("action", action);
  if (success != null) query.set("success", String(success));
  if (from) query.set("from", from);
  if (to) query.set("to", to);

  return useQuery<AuditLogsResponse>({
    queryKey: getAuditLogsQueryKey(params),
    queryFn: () => customFetch<AuditLogsResponse>(`/admin/audit-logs?${query.toString()}`),
  });
}

export function useAuditLogActions() {
  return useQuery<string[]>({
    queryKey: ["admin", "audit-log-actions"],
    queryFn: () => customFetch<string[]>("/admin/audit-logs/actions"),
    staleTime: 60_000,
  });
}

export interface UserConsent {
  id: number;
  documentType: string;
  documentVersion: string;
  acceptedAt: string;
}

export function getUserConsentsQueryKey() {
  return ["users", "me", "consents"] as const;
}

export function useMyConsents() {
  return useQuery<UserConsent[]>({
    queryKey: getUserConsentsQueryKey(),
    queryFn: () => customFetch<UserConsent[]>("/users/me/consents"),
  });
}
