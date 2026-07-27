/**
 * API hooks for the "Échanges avec Cocci" module.
 * Hand-written (not orval-generated) since these endpoints were added after
 * initial codegen. Uses the same customFetch infrastructure as the generated
 * client so Clerk bearer tokens and exercise headers are forwarded.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CocciFeedback {
  id: number;
  organizationId: number;
  userId: number;
  subject: string;
  requestType: string;
  message: string;
  attachmentUrl: string | null;
  wantsCallback: boolean;
  status: string;
  history: { date: string; status: string; note?: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CocciRating {
  id: number;
  organizationId: number;
  userId: number;
  stars: number;
  comment: string | null;
  createdAt: string;
}

// Admin-enriched feedback (includes org + user labels)
export interface AdminCocciFeedback extends CocciFeedback {
  organizationName: string;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string;
}

export interface AdminCocciRating extends CocciRating {
  organizationName: string;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string;
}

export interface AdminEchangesStats {
  totalRatings: number;
  averageStars: number;
  distribution: Record<string, number>; // "1"→n, "2"→n, …, "5"→n
  newFeedbackCount: number; // status="nouveau"
  newRatingCount: number;
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const getEchangesFeedbackQueryKey = (orgId: number) =>
  ["/api/echanges/feedback", orgId] as const;

export const getEchangesRatingsQueryKey = (orgId: number) =>
  ["/api/echanges/ratings", orgId] as const;

export const getAdminEchangesFeedbackQueryKey = () =>
  ["/api/admin/echanges/feedback"] as const;

export const getAdminEchangesRatingsQueryKey = () =>
  ["/api/admin/echanges/ratings"] as const;

export const getAdminEchangesStatsQueryKey = () =>
  ["/api/admin/echanges/stats"] as const;

// ─── User hooks ──────────────────────────────────────────────────────────────

export function useListEchangesFeedback(
  orgId: number,
  options?: { query?: UseQueryOptions<CocciFeedback[], Error> },
) {
  return useQuery<CocciFeedback[], Error>({
    queryKey: getEchangesFeedbackQueryKey(orgId),
    queryFn: () =>
      customFetch<CocciFeedback[]>(`/api/echanges/feedback?organizationId=${orgId}`),
    enabled: !!orgId,
    ...options?.query,
  });
}

export function useListEchangesRatings(
  orgId: number,
  options?: { query?: UseQueryOptions<CocciRating[], Error> },
) {
  return useQuery<CocciRating[], Error>({
    queryKey: getEchangesRatingsQueryKey(orgId),
    queryFn: () =>
      customFetch<CocciRating[]>(`/api/echanges/ratings?organizationId=${orgId}`),
    enabled: !!orgId,
    ...options?.query,
  });
}

export interface CreateFeedbackInput {
  organizationId: number;
  subject: string;
  requestType: string;
  message: string;
  attachmentUrl?: string | null;
  wantsCallback?: boolean;
}

export function useCreateEchangesFeedback(
  options?: UseMutationOptions<CocciFeedback, Error, CreateFeedbackInput>,
): UseMutationResult<CocciFeedback, Error, CreateFeedbackInput> {
  return useMutation<CocciFeedback, Error, CreateFeedbackInput>({
    mutationFn: (data) =>
      customFetch<CocciFeedback>("/api/echanges/feedback", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

export interface CreateRatingInput {
  organizationId: number;
  stars: number;
  comment?: string | null;
}

export function useCreateEchangesRating(
  options?: UseMutationOptions<CocciRating, Error, CreateRatingInput>,
): UseMutationResult<CocciRating, Error, CreateRatingInput> {
  return useMutation<CocciRating, Error, CreateRatingInput>({
    mutationFn: (data) =>
      customFetch<CocciRating>("/api/echanges/ratings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

// ─── Admin hooks ─────────────────────────────────────────────────────────────

export function useListAdminEchangesFeedback(
  options?: { query?: UseQueryOptions<AdminCocciFeedback[], Error> },
) {
  return useQuery<AdminCocciFeedback[], Error>({
    queryKey: getAdminEchangesFeedbackQueryKey(),
    queryFn: () =>
      customFetch<AdminCocciFeedback[]>("/api/admin/echanges/feedback"),
    ...options?.query,
  });
}

export function useListAdminEchangesRatings(
  options?: { query?: UseQueryOptions<AdminCocciRating[], Error> },
) {
  return useQuery<AdminCocciRating[], Error>({
    queryKey: getAdminEchangesRatingsQueryKey(),
    queryFn: () =>
      customFetch<AdminCocciRating[]>("/api/admin/echanges/ratings"),
    ...options?.query,
  });
}

export function useGetAdminEchangesStats(
  options?: { query?: UseQueryOptions<AdminEchangesStats, Error> },
) {
  return useQuery<AdminEchangesStats, Error>({
    queryKey: getAdminEchangesStatsQueryKey(),
    queryFn: () =>
      customFetch<AdminEchangesStats>("/api/admin/echanges/stats"),
    ...options?.query,
  });
}

export interface UpdateFeedbackStatusInput {
  status: string;
  note?: string;
}

export function useUpdateAdminFeedbackStatus(
  options?: UseMutationOptions<
    AdminCocciFeedback,
    Error,
    { id: number; data: UpdateFeedbackStatusInput }
  >,
): UseMutationResult<
  AdminCocciFeedback,
  Error,
  { id: number; data: UpdateFeedbackStatusInput }
> {
  return useMutation({
    mutationFn: ({ id, data }) =>
      customFetch<AdminCocciFeedback>(`/api/admin/echanges/feedback/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    ...options,
  });
}
