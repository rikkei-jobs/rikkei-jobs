export type SyncTrigger = 'NIGHTLY' | 'ON_OPEN' | 'MANUAL';

export type SyncStatus = 'SUCCESS' | 'FAILED';

export type ExternalSource = 'LMS' | 'EXAM' | 'PM';

export interface PageResponse<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface SourceSyncCounts {
  readonly fetched: number;
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly skipped: number;
}

export interface SyncCounts {
  readonly lms: SourceSyncCounts;
  readonly exam: SourceSyncCounts;
  readonly pm: SourceSyncCounts;
}

export interface SyncRunResponse {
  readonly id: number;
  readonly trigger: SyncTrigger;
  readonly userId: number | null;
  readonly candidateName: string | null;
  readonly status: SyncStatus;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly error: string | null;
  readonly counts: SyncCounts | null;
}

export interface ManualOverrideDto {
  readonly id: number;
  readonly field: string;
  readonly value: string;
  readonly reason: string;
  readonly staffId: number;
  readonly staffName: string | null;
  readonly createdAt: string;
}

export interface ExternalRecordResponse {
  readonly id: number;
  readonly userId: number;
  readonly source: ExternalSource;
  readonly sourceCode: string;
  readonly sourceKey: string;
  readonly title: string;
  readonly score: number;
  readonly recordedAt: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly syncedAt: string;
  readonly overrides: readonly ManualOverrideDto[];
}

export interface ManualOverrideRequest {
  readonly field: string;
  readonly value: string | number;
  readonly reason: string;
}

export interface CandidateSyncSummaryDto {
  readonly userId: number;
  readonly fullName: string;
  readonly email: string;
  readonly lmsUserId: string | null;
}

export interface SyncRunsQueryParams {
  readonly status?: SyncStatus | '';
  readonly userId?: number;
  readonly page?: number;
  readonly size?: number;
}

export interface ExternalRecordsQueryParams {
  readonly userId?: number;
  readonly page?: number;
  readonly size?: number;
}

export interface CandidateSearchParams {
  readonly q?: string;
  readonly page?: number;
  readonly size?: number;
}
