import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Icon } from '../../../shared/components/Icon';
import { Select } from '../../../shared/components/Select';
import { RoleHomeLayout } from '../../identity/pages/role-homes/RoleHomeLayout';
import {
  SOURCE_LABELS,
  TRIGGER_LABELS,
  formatSyncDateTime,
  getOverrideFieldLabel,
  isAbortError,
  isNonCanonicalPmRecord,
  mapDataSyncError,
  staffDataSyncApi,
} from '../api/staffDataSyncApi';
import { ManualOverrideDialog } from '../components/ManualOverrideDialog';
import { SyncStatusBadge } from '../components/SyncStatusBadge';
import type {
  CandidateSyncSummaryDto,
  ExternalRecordResponse,
  ExternalSource,
  PageResponse,
  SyncCounts,
  SyncRunResponse,
  SyncStatus,
} from '../types/dataSync.types';
import '../styles/staffDataSync.css';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const MAX_SEARCH_QUERY_LENGTH = 100;

interface CandidatesSnapshot {
  readonly page: PageResponse<CandidateSyncSummaryDto>;
  readonly query: string;
  readonly pageNumber: number;
}

interface RecordsSnapshot {
  readonly candidateId: number;
  readonly page: PageResponse<ExternalRecordResponse>;
  readonly pageNumber: number;
}

interface RunsSnapshot {
  readonly page: PageResponse<SyncRunResponse>;
  readonly status: SyncStatus | '';
  readonly scopedUserId: number | undefined;
  readonly scopedCandidateName: string | null;
  readonly pageNumber: number;
}

interface SyncFeedbackState {
  readonly kind: 'success' | 'error';
  readonly message: string;
}

type PaginationFocusIntent = 'prev' | 'next' | null;
type RunsFocusIntent = 'prev' | 'next' | 'reset' | null;

interface PayloadFieldDescriptor {
  readonly key: string;
  readonly label: string;
  readonly isDate?: boolean;
  readonly isNumeric?: boolean;
}

const PAYLOAD_FIELDS_BY_SOURCE: Readonly<
  Record<ExternalSource, readonly PayloadFieldDescriptor[]>
> = {
  LMS: [
    { key: 'subjectCode', label: 'Mã môn' },
    { key: 'subjectName', label: 'Tên môn học' },
    { key: 'score', label: 'Điểm LMS (0–10)', isNumeric: true },
    { key: 'attendanceRate', label: 'Tỷ lệ chuyên cần (%)', isNumeric: true },
    { key: 'homeworkRate', label: 'Tỷ lệ bài tập (%)', isNumeric: true },
    { key: 'rpoint', label: 'R-Point', isNumeric: true },
  ],
  EXAM: [
    { key: 'examCode', label: 'Mã kỳ thi' },
    { key: 'subjectCode', label: 'Mã môn' },
    { key: 'score', label: 'Điểm thi (0–10)', isNumeric: true },
    { key: 'takenAt', label: 'Thời điểm thi', isDate: true, isNumeric: true },
  ],
  PM: [
    { key: 'batchId', label: 'Mã đợt thực tập' },
    { key: 'topicName', label: 'Tên đề tài' },
    { key: 'finalScore', label: 'Điểm thực tập PM (0–10)', isNumeric: true },
    { key: 'endDate', label: 'Ngày kết thúc', isNumeric: true },
  ],
};

function formatPayloadValue(
  raw: unknown,
  descriptor: PayloadFieldDescriptor,
): string {
  if (raw === null || raw === undefined || raw === '') {
    return '—';
  }
  if (descriptor.isDate && typeof raw === 'string') {
    return formatSyncDateTime(raw);
  }
  return String(raw);
}

function formatCandidateQueryDescription(query: string): string {
  return query ? `từ khóa "${query}"` : 'tất cả ứng viên';
}

function formatRunsStatusLabel(status: SyncStatus | ''): string {
  if (status === 'SUCCESS') {
    return 'Thành công';
  }
  if (status === 'FAILED') {
    return 'Thất bại';
  }
  return 'Tất cả trạng thái';
}

function formatRunsFilterDescription(
  status: SyncStatus | '',
  scopedUserId: number | undefined,
  candidateName?: string | null,
): string {
  const statusLabel = formatRunsStatusLabel(status);
  const candidateLabel =
    scopedUserId !== undefined
      ? candidateName || `Ứng viên #${scopedUserId}`
      : 'Tất cả ứng viên';
  return `${statusLabel} • ${candidateLabel}`;
}

function summarizeCounts(counts: SyncCounts | null): {
  readonly totalText: string;
  readonly detailText: string | null;
} {
  if (!counts) {
    return { totalText: '—', detailText: null };
  }
  const totalFetched = counts.lms.fetched + counts.exam.fetched + counts.pm.fetched;
  return {
    totalText: `${totalFetched} bản ghi`,
    detailText: `LMS ${counts.lms.fetched} / Bài thi ${counts.exam.fetched} / PM ${counts.pm.fetched}`,
  };
}

export const StaffDataSyncPage: React.FC = () => {
  const searchInputId = useId();
  const statusSelectId = useId();
  const candidateScopeSelectId = useId();

  const isMountedRef = useRef(true);

  // Candidate search state + debounce + snapshot + race safety (F2)
  const [searchInput, setSearchInput] = useState<string>('');
  const [appliedQuery, setAppliedQuery] = useState<string>('');
  const [candidatesPageNumber, setCandidatesPageNumber] = useState<number>(1);
  const [candidatesReloadSeq, setCandidatesReloadSeq] = useState<number>(0);
  const [candidatesSnapshot, setCandidatesSnapshot] = useState<CandidatesSnapshot | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState<boolean>(true);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const candidatesAbortRef = useRef<AbortController | null>(null);
  const candidatesSeqRef = useRef<number>(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const candidatesHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const candidatesRetryBtnRef = useRef<HTMLButtonElement | null>(null);
  const candidatesRetryFocusRef = useRef<'armed' | 'anchored' | null>(null);
  const candPaginationNavRef = useRef<HTMLElement | null>(null);
  const candPrevBtnRef = useRef<HTMLButtonElement | null>(null);
  const candNextBtnRef = useRef<HTMLButtonElement | null>(null);
  const candFocusIntentRef = useRef<PaginationFocusIntent>(null);
  const skipCandidatesFetchKeyRef = useRef<string | null>(null);

  // Selected candidate + records state + snapshot + race safety (F2)
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateSyncSummaryDto | null>(null);
  const selectedCandidateIdRef = useRef<number | null>(null);
  const selectedCandidateNameRef = useRef<string | null>(null);
  const selectedCandidateHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const [recordsPageNumber, setRecordsPageNumber] = useState<number>(1);
  const [recordsReloadSeq, setRecordsReloadSeq] = useState<number>(0);
  const [recordsSnapshot, setRecordsSnapshot] = useState<RecordsSnapshot | null>(null);
  const [recordsLoading, setRecordsLoading] = useState<boolean>(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const recordsAbortRef = useRef<AbortController | null>(null);
  const recordsSeqRef = useRef<number>(0);
  const syncBtnRef = useRef<HTMLButtonElement | null>(null);
  const recordsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const recordsRetryBtnRef = useRef<HTMLButtonElement | null>(null);
  const recordsRetryFocusRef = useRef<{
    readonly candidateId: number;
    phase: 'armed' | 'anchored';
  } | null>(null);
  const recordsPaginationNavRef = useRef<HTMLElement | null>(null);
  const recordsPrevBtnRef = useRef<HTMLButtonElement | null>(null);
  const recordsNextBtnRef = useRef<HTMLButtonElement | null>(null);
  const recordsFocusIntentRef = useRef<PaginationFocusIntent>(null);
  const skipRecordsFetchKeyRef = useRef<string | null>(null);

  // Sync runs table state + filters + snapshot + race safety (F2, F7)
  const [statusFilter, setStatusFilter] = useState<SyncStatus | ''>('');
  const [filterBySelectedCandidate, setFilterBySelectedCandidate] =
    useState<boolean>(false);
  const [runsPageNumber, setRunsPageNumber] = useState<number>(1);
  const [runsReloadSeq, setRunsReloadSeq] = useState<number>(0);
  const [runsSnapshot, setRunsSnapshot] = useState<RunsSnapshot | null>(null);
  const [runsLoading, setRunsLoading] = useState<boolean>(true);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [expandedRunErrorIds, setExpandedRunErrorIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const runsAbortRef = useRef<AbortController | null>(null);
  const runsSeqRef = useRef<number>(0);
  const runsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const runsRetryBtnRef = useRef<HTMLButtonElement | null>(null);
  const runsRetryFocusRef = useRef<'armed' | 'anchored' | null>(null);
  const runsPaginationNavRef = useRef<HTMLElement | null>(null);
  const runsPrevBtnRef = useRef<HTMLButtonElement | null>(null);
  const runsNextBtnRef = useRef<HTMLButtonElement | null>(null);
  const runsResetBtnRef = useRef<HTMLButtonElement | null>(null);
  const runsEmptyResetBtnRef = useRef<HTMLButtonElement | null>(null);
  const runsRefreshBtnRef = useRef<HTMLButtonElement | null>(null);
  const runsFocusIntentRef = useRef<RunsFocusIntent>(null);
  const skipRunsFetchKeyRef = useRef<string | null>(null);

  // Manual sync execution state per candidate + double-submit guard (F3, G5)
  const [syncBusyByCandidate, setSyncBusyByCandidate] = useState<
    Readonly<Record<number, boolean>>
  >({});
  const [syncFeedback, setSyncFeedback] = useState<SyncFeedbackState | null>(null);
  const syncInFlightIdsRef = useRef<Set<number>>(new Set());
  const syncAbortMapRef = useRef<Map<number, AbortController>>(new Map());
  const syncFocusStateRef = useRef<{
    readonly userId: number;
    phase: 'armed' | 'anchored';
  } | null>(null);

  // Manual override dialog state
  const [editingRecord, setEditingRecord] = useState<ExternalRecordResponse | null>(
    null,
  );
  const [overrideTriggerEl, setOverrideTriggerEl] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    isMountedRef.current = true;
    const abortMap = syncAbortMapRef.current;
    const inFlightIds = syncInFlightIdsRef.current;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      candidatesAbortRef.current?.abort();
      recordsAbortRef.current?.abort();
      runsAbortRef.current?.abort();
      for (const controller of abortMap.values()) {
        controller.abort();
      }
      abortMap.clear();
      inFlightIds.clear();
    };
  }, []);

  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    const normalized = searchInput.trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
    if (normalized === appliedQuery) {
      return undefined;
    }
    debounceTimerRef.current = window.setTimeout(() => {
      if (isMountedRef.current) {
        candFocusIntentRef.current = null;
        skipCandidatesFetchKeyRef.current = null;
        setCandidatesLoading(true);
        setAppliedQuery(normalized);
        setCandidatesPageNumber(1);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput, appliedQuery]);

  // Fetch candidate search list
  useEffect(() => {
    const fetchKey = `${appliedQuery}|${candidatesPageNumber}|${candidatesReloadSeq}`;
    const skipKey = skipCandidatesFetchKeyRef.current;
    // Always consume any pending skip key so a concurrent filter/query change cannot leave it stale
    skipCandidatesFetchKeyRef.current = null;
    if (skipKey === fetchKey) {
      return undefined;
    }

    candidatesAbortRef.current?.abort();
    const controller = new AbortController();
    candidatesAbortRef.current = controller;
    const seq = ++candidatesSeqRef.current;

    const loadCandidates = async () => {
      setCandidatesLoading(true);
      setCandidatesError(null);
      let reFetchingClampedPage = false;
      try {
        const result = await staffDataSyncApi.searchCandidates(
          {
            q: appliedQuery,
            page: candidatesPageNumber,
            size: PAGE_SIZE,
          },
          controller.signal,
        );
        if (
          !controller.signal.aborted &&
          isMountedRef.current &&
          seq === candidatesSeqRef.current
        ) {
          const clampedPage = Math.max(
            1,
            Math.min(candidatesPageNumber, Math.max(result.totalPages, 1)),
          );
          if (
            clampedPage < candidatesPageNumber &&
            result.items.length === 0 &&
            result.totalItems > 0
          ) {
            reFetchingClampedPage = true;
            setCandidatesPageNumber(clampedPage);
          } else {
            if (clampedPage !== candidatesPageNumber) {
              skipCandidatesFetchKeyRef.current = `${appliedQuery}|${clampedPage}|${candidatesReloadSeq}`;
              setCandidatesPageNumber(clampedPage);
            }
            setCandidatesSnapshot({
              page: result,
              query: appliedQuery,
              pageNumber: clampedPage,
            });
          }
        }
      } catch (err: unknown) {
        if (
          controller.signal.aborted ||
          isAbortError(err) ||
          !isMountedRef.current ||
          seq !== candidatesSeqRef.current
        ) {
          return;
        }
        setCandidatesError(
          mapDataSyncError(err, 'Không thể tải danh sách ứng viên. Vui lòng thử lại.'),
        );
      } finally {
        if (
          !reFetchingClampedPage &&
          !controller.signal.aborted &&
          isMountedRef.current &&
          seq === candidatesSeqRef.current
        ) {
          setCandidatesLoading(false);
        }
      }
    };

    void loadCandidates();

    return () => {
      controller.abort();
    };
  }, [appliedQuery, candidatesPageNumber, candidatesReloadSeq]);

  // Fetch external records for the selected candidate
  const selectedCandidateId = selectedCandidate?.userId ?? null;
  useEffect(() => {
    recordsAbortRef.current?.abort();
    if (selectedCandidateId === null) {
      skipRecordsFetchKeyRef.current = null;
      return undefined;
    }

    const fetchKey = `${selectedCandidateId}|${recordsPageNumber}|${recordsReloadSeq}`;
    const skipKey = skipRecordsFetchKeyRef.current;
    skipRecordsFetchKeyRef.current = null;
    if (skipKey === fetchKey) {
      return undefined;
    }

    const controller = new AbortController();
    recordsAbortRef.current = controller;
    const seq = ++recordsSeqRef.current;

    const loadRecords = async () => {
      setRecordsLoading(true);
      setRecordsError(null);
      let reFetchingClampedPage = false;
      try {
        const result = await staffDataSyncApi.listExternalRecords(
          {
            userId: selectedCandidateId,
            page: recordsPageNumber,
            size: PAGE_SIZE,
          },
          controller.signal,
        );
        if (
          !controller.signal.aborted &&
          isMountedRef.current &&
          seq === recordsSeqRef.current &&
          selectedCandidateIdRef.current === selectedCandidateId
        ) {
          const clampedPage = Math.max(
            1,
            Math.min(recordsPageNumber, Math.max(result.totalPages, 1)),
          );
          if (
            clampedPage < recordsPageNumber &&
            result.items.length === 0 &&
            result.totalItems > 0
          ) {
            reFetchingClampedPage = true;
            setRecordsPageNumber(clampedPage);
          } else {
            if (clampedPage !== recordsPageNumber) {
              skipRecordsFetchKeyRef.current = `${selectedCandidateId}|${clampedPage}|${recordsReloadSeq}`;
              setRecordsPageNumber(clampedPage);
            }
            setRecordsSnapshot({
              candidateId: selectedCandidateId,
              page: result,
              pageNumber: clampedPage,
            });
          }
        }
      } catch (err: unknown) {
        if (
          controller.signal.aborted ||
          isAbortError(err) ||
          !isMountedRef.current ||
          seq !== recordsSeqRef.current ||
          selectedCandidateIdRef.current !== selectedCandidateId
        ) {
          return;
        }
        setRecordsError(
          mapDataSyncError(
            err,
            'Không thể tải bản ghi dữ liệu ngoài của ứng viên. Vui lòng thử lại.',
          ),
        );
      } finally {
        if (
          !reFetchingClampedPage &&
          !controller.signal.aborted &&
          isMountedRef.current &&
          seq === recordsSeqRef.current &&
          selectedCandidateIdRef.current === selectedCandidateId
        ) {
          setRecordsLoading(false);
        }
      }
    };

    void loadRecords();

    return () => {
      controller.abort();
    };
  }, [selectedCandidateId, recordsPageNumber, recordsReloadSeq]);

  // Fetch sync runs table
  const scopedRunsUserId =
    filterBySelectedCandidate && selectedCandidate ? selectedCandidate.userId : undefined;
  useEffect(() => {
    const fetchKey = `${statusFilter}|${scopedRunsUserId ?? 'all'}|${runsPageNumber}|${runsReloadSeq}`;
    const skipKey = skipRunsFetchKeyRef.current;
    skipRunsFetchKeyRef.current = null;
    if (skipKey === fetchKey) {
      return undefined;
    }

    runsAbortRef.current?.abort();
    const controller = new AbortController();
    runsAbortRef.current = controller;
    const seq = ++runsSeqRef.current;
    const scopedCandidateNameAtDispatch =
      scopedRunsUserId !== undefined ? selectedCandidateNameRef.current : null;

    const loadRuns = async () => {
      setRunsLoading(true);
      setRunsError(null);
      let reFetchingClampedPage = false;
      try {
        const result = await staffDataSyncApi.listSyncRuns(
          {
            status: statusFilter,
            userId: scopedRunsUserId,
            page: runsPageNumber,
            size: PAGE_SIZE,
          },
          controller.signal,
        );
        if (
          !controller.signal.aborted &&
          isMountedRef.current &&
          seq === runsSeqRef.current
        ) {
          const clampedPage = Math.max(
            1,
            Math.min(runsPageNumber, Math.max(result.totalPages, 1)),
          );
          if (
            clampedPage < runsPageNumber &&
            result.items.length === 0 &&
            result.totalItems > 0
          ) {
            reFetchingClampedPage = true;
            setRunsPageNumber(clampedPage);
          } else {
            if (clampedPage !== runsPageNumber) {
              skipRunsFetchKeyRef.current = `${statusFilter}|${scopedRunsUserId ?? 'all'}|${clampedPage}|${runsReloadSeq}`;
              setRunsPageNumber(clampedPage);
            }
            setRunsSnapshot({
              page: result,
              status: statusFilter,
              scopedUserId: scopedRunsUserId,
              scopedCandidateName: scopedCandidateNameAtDispatch,
              pageNumber: clampedPage,
            });
          }
        }
      } catch (err: unknown) {
        if (
          controller.signal.aborted ||
          isAbortError(err) ||
          !isMountedRef.current ||
          seq !== runsSeqRef.current
        ) {
          return;
        }
        setRunsError(
          mapDataSyncError(err, 'Không thể tải lịch sử đồng bộ. Vui lòng thử lại.'),
        );
      } finally {
        if (
          !reFetchingClampedPage &&
          !controller.signal.aborted &&
          isMountedRef.current &&
          seq === runsSeqRef.current
        ) {
          setRunsLoading(false);
        }
      }
    };

    void loadRuns();

    return () => {
      controller.abort();
    };
  }, [statusFilter, scopedRunsUserId, runsPageNumber, runsReloadSeq]);

  const handleSelectCandidate = useCallback(
    (candidate: CandidateSyncSummaryDto) => {
      candFocusIntentRef.current = null;
      if (selectedCandidateIdRef.current === candidate.userId) {
        return;
      }
      selectedCandidateIdRef.current = candidate.userId;
      selectedCandidateNameRef.current = candidate.fullName;
      recordsFocusIntentRef.current = null;
      recordsRetryFocusRef.current = null;
      skipRecordsFetchKeyRef.current = null;
      setSelectedCandidate(candidate);
      setRecordsSnapshot(null);
      setRecordsLoading(true);
      setRecordsError(null);
      setRecordsPageNumber(1);
      setSyncFeedback(null);
      setEditingRecord(null);
      if (filterBySelectedCandidate) {
        runsFocusIntentRef.current = null;
        skipRunsFetchKeyRef.current = null;
        setRunsSnapshot(null);
        setRunsLoading(true);
        setRunsPageNumber(1);
      }
    },
    [filterBySelectedCandidate],
  );

  const handleOpenOverrideDialog = useCallback(
    (record: ExternalRecordResponse, triggerEl: HTMLElement) => {
      candFocusIntentRef.current = null;
      recordsFocusIntentRef.current = null;
      runsFocusIntentRef.current = null;
      setOverrideTriggerEl(triggerEl);
      setEditingRecord(record);
    },
    [],
  );

  const handleSyncCandidate = useCallback(async () => {
    const target = selectedCandidate;
    if (!target || syncInFlightIdsRef.current.has(target.userId)) {
      return;
    }

    const activeEl = document.activeElement;
    if (
      activeEl === syncBtnRef.current ||
      activeEl === document.body ||
      activeEl === null
    ) {
      syncFocusStateRef.current = { userId: target.userId, phase: 'armed' };
    }

    syncInFlightIdsRef.current.add(target.userId);
    setSyncBusyByCandidate((prev) => ({ ...prev, [target.userId]: true }));
    setSyncFeedback(null);

    syncAbortMapRef.current.get(target.userId)?.abort();
    const controller = new AbortController();
    syncAbortMapRef.current.set(target.userId, controller);

    try {
      await staffDataSyncApi.syncCandidate(target.userId, controller.signal);
      if (controller.signal.aborted || !isMountedRef.current) {
        return;
      }
      setSyncFeedback({
        kind: 'success',
        message: `Đã đồng bộ dữ liệu cho ứng viên ${target.fullName}.`,
      });
      if (selectedCandidateIdRef.current === target.userId) {
        skipRecordsFetchKeyRef.current = null;
        setRecordsLoading(true);
        setRecordsReloadSeq((seq) => seq + 1);
      }
      skipRunsFetchKeyRef.current = null;
      setRunsLoading(true);
      setRunsReloadSeq((seq) => seq + 1);
    } catch (err: unknown) {
      if (controller.signal.aborted || isAbortError(err) || !isMountedRef.current) {
        return;
      }
      const detail = mapDataSyncError(err, 'Dữ liệu hiện có vẫn được giữ nguyên.');
      setSyncFeedback({
        kind: 'error',
        message: `Đồng bộ dữ liệu cho ứng viên ${target.fullName} thất bại: ${detail}`,
      });
      // Refresh runs table even on sync failure so persisted FAILED row appears immediately
      skipRunsFetchKeyRef.current = null;
      setRunsLoading(true);
      setRunsReloadSeq((seq) => seq + 1);
    } finally {
      syncInFlightIdsRef.current.delete(target.userId);
      if (syncAbortMapRef.current.get(target.userId) === controller) {
        syncAbortMapRef.current.delete(target.userId);
      }
      if (isMountedRef.current) {
        setSyncBusyByCandidate((prev) => {
          if (!prev[target.userId]) {
            return prev;
          }
          const next = { ...prev };
          delete next[target.userId];
          return next;
        });
      }
    }
  }, [selectedCandidate]);

  const handleOverrideSuccess = useCallback((updatedRecord: ExternalRecordResponse) => {
    setEditingRecord(null);
    if (selectedCandidateIdRef.current === updatedRecord.userId) {
      setRecordsSnapshot((prev) => {
        if (!prev || prev.candidateId !== updatedRecord.userId) {
          return prev;
        }
        return {
          ...prev,
          page: {
            ...prev.page,
            items: prev.page.items.map((item) =>
              item.id === updatedRecord.id ? updatedRecord : item,
            ),
          },
        };
      });
      setSyncFeedback({
        kind: 'success',
        message: 'Đã lưu chỉnh sửa thủ công và tính lại chỉ số kỹ năng.',
      });
    }
  }, []);

  const handleResetRunFilters = useCallback(() => {
    runsFocusIntentRef.current = 'reset';
    skipRunsFetchKeyRef.current = null;
    setRunsLoading(true);
    setStatusFilter('');
    setFilterBySelectedCandidate(false);
    setRunsPageNumber(1);
  }, []);

  const toggleRunErrorDetail = useCallback((runId: number) => {
    setExpandedRunErrorIds((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  }, []);

  const candidatesPage = candidatesSnapshot?.page ?? null;
  const candidates = candidatesPage?.items ?? [];
  const candidateTotalPages = Math.max(candidatesPage?.totalPages ?? 1, 1);
  const normalizedSearchInput = searchInput.trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
  const hasPendingCandidatesSearch = normalizedSearchInput !== appliedQuery;
  const isCandidatesQueryStale =
    candidatesSnapshot !== null && candidatesSnapshot.query !== appliedQuery;
  const isCandidatesPageStale =
    candidatesSnapshot !== null && candidatesSnapshot.pageNumber !== candidatesPageNumber;
  const isCandidatesCurrentLoaded =
    candidatesSnapshot !== null &&
    !hasPendingCandidatesSearch &&
    !isCandidatesQueryStale &&
    !isCandidatesPageStale &&
    !candidatesLoading &&
    !candidatesError;
  const shownCandidatesQueryDesc = candidatesSnapshot
    ? formatCandidateQueryDescription(candidatesSnapshot.query)
    : '';
  const requestedCandidatesQueryDesc = formatCandidateQueryDescription(appliedQuery);

  const activeRecordsSnapshot =
    selectedCandidate && recordsSnapshot?.candidateId === selectedCandidate.userId
      ? recordsSnapshot
      : null;
  const recordsPage = activeRecordsSnapshot?.page ?? null;
  const records = recordsPage?.items ?? [];
  const recordsTotalPages = Math.max(recordsPage?.totalPages ?? 1, 1);
  const isRecordsStale =
    activeRecordsSnapshot !== null && activeRecordsSnapshot.pageNumber !== recordsPageNumber;
  const isRecordsCurrentLoaded =
    activeRecordsSnapshot !== null &&
    !isRecordsStale &&
    !recordsLoading &&
    !recordsError;

  const runsPage = runsSnapshot?.page ?? null;
  const runs = runsPage?.items ?? [];
  const runsTotalItems = runsPage?.totalItems ?? 0;
  const runsTotalPages = Math.max(runsPage?.totalPages ?? 1, 1);
  const isRunsFilterStale =
    runsSnapshot !== null &&
    (runsSnapshot.status !== statusFilter || runsSnapshot.scopedUserId !== scopedRunsUserId);
  const isRunsPageStale =
    runsSnapshot !== null && runsSnapshot.pageNumber !== runsPageNumber;
  const isRunsCurrentLoaded =
    runsSnapshot !== null &&
    !isRunsFilterStale &&
    !isRunsPageStale &&
    !runsLoading &&
    !runsError;
  const shownRunsFilterDesc = runsSnapshot
    ? formatRunsFilterDescription(
        runsSnapshot.status,
        runsSnapshot.scopedUserId,
        runsSnapshot.scopedCandidateName,
      )
    : '';
  const requestedRunsFilterDesc = formatRunsFilterDescription(
    statusFilter,
    scopedRunsUserId,
    selectedCandidate?.fullName ?? null,
  );
  const hasActiveRunFilters =
    statusFilter !== '' || (filterBySelectedCandidate && selectedCandidate !== null);

  const isSelectedCandidateSyncBusy = selectedCandidate
    ? Boolean(syncBusyByCandidate[selectedCandidate.userId])
    : false;

  const candidateScopeValue = useMemo(
    () => (filterBySelectedCandidate && selectedCandidate ? 'selected' : 'all'),
    [filterBySelectedCandidate, selectedCandidate],
  );

  const focusRecordsFallback = useCallback(() => {
    if (syncBtnRef.current && !syncBtnRef.current.disabled) {
      syncBtnRef.current.focus();
      return;
    }
    recordsHeadingRef.current?.focus();
  }, []);

  const isOverrideDialogOpen = editingRecord !== null;

  // Preserve keyboard focus across boundary-disabled pagination controls and filter reset (F2)
  useLayoutEffect(() => {
    const intent = candFocusIntentRef.current;
    if (!intent) {
      return;
    }
    if (isOverrideDialogOpen) {
      candFocusIntentRef.current = null;
      return;
    }
    const activeEl = document.activeElement;
    const focusBelongsHere =
      activeEl === null ||
      activeEl === document.body ||
      Boolean(candPaginationNavRef.current?.contains(activeEl));
    if (!focusBelongsHere) {
      candFocusIntentRef.current = null;
      return;
    }
    const targetBtn = intent === 'prev' ? candPrevBtnRef.current : candNextBtnRef.current;
    const siblingBtn = intent === 'prev' ? candNextBtnRef.current : candPrevBtnRef.current;
    if (targetBtn && !targetBtn.disabled) {
      if (!candidatesLoading) {
        candFocusIntentRef.current = null;
      }
      return;
    }
    if (siblingBtn && !siblingBtn.disabled) {
      siblingBtn.focus();
      candFocusIntentRef.current = candidatesLoading
        ? intent === 'prev'
          ? 'next'
          : 'prev'
        : null;
      return;
    }
    candFocusIntentRef.current = null;
    searchInputRef.current?.focus();
  }, [candidatesPageNumber, candidateTotalPages, candidatesLoading, isOverrideDialogOpen]);

  useLayoutEffect(() => {
    const intent = recordsFocusIntentRef.current;
    if (!intent) {
      return;
    }
    if (!selectedCandidate || isOverrideDialogOpen) {
      recordsFocusIntentRef.current = null;
      return;
    }
    const activeEl = document.activeElement;
    const focusBelongsHere =
      activeEl === null ||
      activeEl === document.body ||
      Boolean(recordsPaginationNavRef.current?.contains(activeEl));
    if (!focusBelongsHere) {
      recordsFocusIntentRef.current = null;
      return;
    }
    const targetBtn = intent === 'prev' ? recordsPrevBtnRef.current : recordsNextBtnRef.current;
    const siblingBtn = intent === 'prev' ? recordsNextBtnRef.current : recordsPrevBtnRef.current;
    if (targetBtn && !targetBtn.disabled) {
      if (!recordsLoading) {
        recordsFocusIntentRef.current = null;
      }
      return;
    }
    if (siblingBtn && !siblingBtn.disabled) {
      siblingBtn.focus();
      recordsFocusIntentRef.current = recordsLoading
        ? intent === 'prev'
          ? 'next'
          : 'prev'
        : null;
      return;
    }
    recordsFocusIntentRef.current = null;
    focusRecordsFallback();
  }, [
    selectedCandidate,
    recordsPageNumber,
    recordsTotalPages,
    recordsLoading,
    focusRecordsFallback,
    isOverrideDialogOpen,
  ]);

  useLayoutEffect(() => {
    const intent = runsFocusIntentRef.current;
    if (!intent) {
      return;
    }
    if (isOverrideDialogOpen) {
      runsFocusIntentRef.current = null;
      return;
    }
    const activeEl = document.activeElement;
    if (intent === 'reset') {
      const resetFocusBelongsHere =
        activeEl === null ||
        activeEl === document.body ||
        activeEl === runsResetBtnRef.current ||
        activeEl === runsEmptyResetBtnRef.current ||
        !activeEl.isConnected;
      if (!resetFocusBelongsHere) {
        runsFocusIntentRef.current = null;
        return;
      }
      if (!hasActiveRunFilters) {
        runsFocusIntentRef.current = null;
        const statusTrigger = document.getElementById(statusSelectId);
        if (statusTrigger && !statusTrigger.hasAttribute('disabled')) {
          statusTrigger.focus();
        } else {
          runsRefreshBtnRef.current?.focus();
        }
      }
      return;
    }
    const focusBelongsHere =
      activeEl === null ||
      activeEl === document.body ||
      Boolean(runsPaginationNavRef.current?.contains(activeEl));
    if (!focusBelongsHere) {
      runsFocusIntentRef.current = null;
      return;
    }
    const targetBtn = intent === 'prev' ? runsPrevBtnRef.current : runsNextBtnRef.current;
    const siblingBtn = intent === 'prev' ? runsNextBtnRef.current : runsPrevBtnRef.current;
    if (targetBtn && !targetBtn.disabled) {
      if (!runsLoading) {
        runsFocusIntentRef.current = null;
      }
      return;
    }
    if (siblingBtn && !siblingBtn.disabled) {
      siblingBtn.focus();
      runsFocusIntentRef.current = runsLoading ? (intent === 'prev' ? 'next' : 'prev') : null;
      return;
    }
    runsFocusIntentRef.current = null;
    runsRefreshBtnRef.current?.focus();
  }, [
    runsPageNumber,
    runsTotalPages,
    runsLoading,
    hasActiveRunFilters,
    statusSelectId,
    isOverrideDialogOpen,
  ]);

  // Preserve keyboard focus across disabled "Đồng bộ lại" and all 6 "Thử lại" buttons without stealing focus (G5)
  useLayoutEffect(() => {
    const state = syncFocusStateRef.current;
    if (!state) {
      return;
    }
    if (isOverrideDialogOpen || selectedCandidateId !== state.userId) {
      syncFocusStateRef.current = null;
      return;
    }
    const activeEl = document.activeElement;
    if (state.phase === 'armed') {
      if (isSelectedCandidateSyncBusy) {
        if (
          activeEl === null ||
          activeEl === document.body ||
          activeEl === syncBtnRef.current
        ) {
          selectedCandidateHeadingRef.current?.focus();
          state.phase = 'anchored';
        } else {
          syncFocusStateRef.current = null;
        }
      } else {
        syncFocusStateRef.current = null;
      }
      return;
    }
    if (!isSelectedCandidateSyncBusy) {
      syncFocusStateRef.current = null;
      if (activeEl === selectedCandidateHeadingRef.current) {
        syncBtnRef.current?.focus();
      }
    }
  }, [selectedCandidateId, isSelectedCandidateSyncBusy, isOverrideDialogOpen]);

  useLayoutEffect(() => {
    const phase = candidatesRetryFocusRef.current;
    if (!phase) {
      return;
    }
    if (isOverrideDialogOpen) {
      candidatesRetryFocusRef.current = null;
      return;
    }
    const activeEl = document.activeElement;
    if (phase === 'armed') {
      if (candidatesLoading) {
        if (
          activeEl === null ||
          activeEl === document.body ||
          activeEl === candidatesRetryBtnRef.current
        ) {
          candidatesHeadingRef.current?.focus();
          candidatesRetryFocusRef.current = 'anchored';
        } else {
          candidatesRetryFocusRef.current = null;
        }
      } else {
        candidatesRetryFocusRef.current = null;
        if (
          activeEl === null ||
          activeEl === document.body ||
          activeEl === candidatesRetryBtnRef.current
        ) {
          if (candidatesError) {
            candidatesRetryBtnRef.current?.focus();
          } else {
            searchInputRef.current?.focus();
          }
        }
      }
      return;
    }
    if (candidatesLoading) {
      return;
    }
    candidatesRetryFocusRef.current = null;
    if (activeEl !== candidatesHeadingRef.current) {
      return;
    }
    if (candidatesError) {
      candidatesRetryBtnRef.current?.focus();
    } else {
      searchInputRef.current?.focus();
    }
  }, [candidatesLoading, candidatesError, isOverrideDialogOpen]);

  useLayoutEffect(() => {
    const state = recordsRetryFocusRef.current;
    if (!state) {
      return;
    }
    if (isOverrideDialogOpen || selectedCandidateId !== state.candidateId) {
      recordsRetryFocusRef.current = null;
      return;
    }
    const activeEl = document.activeElement;
    if (state.phase === 'armed') {
      if (recordsLoading) {
        if (
          activeEl === null ||
          activeEl === document.body ||
          activeEl === recordsRetryBtnRef.current
        ) {
          recordsHeadingRef.current?.focus();
          state.phase = 'anchored';
        } else {
          recordsRetryFocusRef.current = null;
        }
      } else {
        recordsRetryFocusRef.current = null;
        if (
          activeEl === null ||
          activeEl === document.body ||
          activeEl === recordsRetryBtnRef.current
        ) {
          if (recordsError) {
            recordsRetryBtnRef.current?.focus();
          } else {
            focusRecordsFallback();
          }
        }
      }
      return;
    }
    if (recordsLoading) {
      return;
    }
    recordsRetryFocusRef.current = null;
    if (activeEl !== recordsHeadingRef.current) {
      return;
    }
    if (recordsError) {
      recordsRetryBtnRef.current?.focus();
    } else {
      focusRecordsFallback();
    }
  }, [
    selectedCandidateId,
    recordsLoading,
    recordsError,
    isOverrideDialogOpen,
    focusRecordsFallback,
  ]);

  useLayoutEffect(() => {
    const phase = runsRetryFocusRef.current;
    if (!phase) {
      return;
    }
    if (isOverrideDialogOpen) {
      runsRetryFocusRef.current = null;
      return;
    }
    const activeEl = document.activeElement;
    if (phase === 'armed') {
      if (runsLoading) {
        if (
          activeEl === null ||
          activeEl === document.body ||
          activeEl === runsRetryBtnRef.current
        ) {
          runsHeadingRef.current?.focus();
          runsRetryFocusRef.current = 'anchored';
        } else {
          runsRetryFocusRef.current = null;
        }
      } else {
        runsRetryFocusRef.current = null;
        if (
          activeEl === null ||
          activeEl === document.body ||
          activeEl === runsRetryBtnRef.current
        ) {
          if (runsError) {
            runsRetryBtnRef.current?.focus();
          } else {
            runsRefreshBtnRef.current?.focus();
          }
        }
      }
      return;
    }
    if (runsLoading) {
      return;
    }
    runsRetryFocusRef.current = null;
    if (activeEl !== runsHeadingRef.current) {
      return;
    }
    if (runsError) {
      runsRetryBtnRef.current?.focus();
    } else {
      runsRefreshBtnRef.current?.focus();
    }
  }, [runsLoading, runsError, isOverrideDialogOpen]);

  return (
    <RoleHomeLayout
      roleTitle="Nhân viên"
      roleBadgeClass="rj-role-staff"
      roleIcon="briefcase"
      density="dense"
      hideAccountCard
    >
      <section className="rj-stack-lg ds-page" aria-labelledby="ds-page-heading">
        <header className="rj-page-header">
          <div className="rj-row-between">
            <div className="rj-stack-xs">
              <h1 id="ds-page-heading" className="rj-page-title">
                Đồng bộ dữ liệu
              </h1>
              <p className="rj-page-subtitle">
                Theo dõi lịch sử đồng bộ từ LMS, bài thi, thực tập PM và xử lý chỉnh sửa dữ liệu
                ngoài theo từng ứng viên.
              </p>
            </div>
            <span className="rj-role-badge rj-role-staff">
              <Icon name="briefcase" size={14} />
              <span>Nhân viên • Kết nối dữ liệu</span>
            </span>
          </div>
        </header>

        <section className="rj-stack-md" aria-labelledby="ds-candidates-section-heading">
          <h2 id="ds-candidates-section-heading" className="ds-section-title">
            Tra cứu ứng viên và bản ghi đồng bộ
          </h2>

          <div className="ds-workspace-grid">
            <div className="rj-surface-card rj-stack-md ds-panel">
              <h3 ref={candidatesHeadingRef} tabIndex={-1} className="rj-role-card-title">
                Danh sách ứng viên
              </h3>

              <div className="rj-stack-xs">
                <label htmlFor={searchInputId} className="rj-label">
                  Tìm kiếm ứng viên
                </label>
                <div className="rj-input-wrapper ds-search-input-wrap">
                  <span className="rj-input-icon" aria-hidden="true">
                    <Icon name="search" size={18} />
                  </span>
                  <input
                    ref={searchInputRef}
                    id={searchInputId}
                    type="search"
                    maxLength={MAX_SEARCH_QUERY_LENGTH}
                    className="rj-input has-left-icon"
                    placeholder="Nhập tên, email hoặc mã LMS..."
                    value={searchInput}
                    onChange={(event) => {
                      candFocusIntentRef.current = null;
                      setSearchInput(event.target.value);
                    }}
                  />
                </div>
              </div>

              {candidatesLoading && candidatesSnapshot === null ? (
                <div
                  className="rj-stack-sm"
                  role="status"
                  aria-live="polite"
                  aria-label="Đang tải danh sách ứng viên"
                >
                  <span className="rj-sr-only">Đang tải danh sách ứng viên...</span>
                  <div className="rj-skeleton rj-skeleton-card" aria-hidden="true" />
                  <div className="rj-skeleton rj-skeleton-card" aria-hidden="true" />
                </div>
              ) : candidatesError && candidatesSnapshot === null ? (
                <div className="rj-alert rj-alert-danger" role="alert">
                  <Icon name="alert-circle" size={18} />
                  <div className="rj-stack-xs">
                    <p>{candidatesError}</p>
                    <button
                      ref={candidatesRetryBtnRef}
                      type="button"
                      className="rj-btn rj-btn-secondary"
                      onClick={() => {
                        const activeEl = document.activeElement;
                        if (
                          activeEl === candidatesRetryBtnRef.current ||
                          activeEl === document.body ||
                          activeEl === null
                        ) {
                          candidatesRetryFocusRef.current = 'armed';
                        }
                        skipCandidatesFetchKeyRef.current = null;
                        setCandidatesLoading(true);
                        setCandidatesReloadSeq((seq) => seq + 1);
                      }}
                    >
                      <Icon name="refresh" size={16} />
                      <span>Thử lại</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {candidatesError && (
                    <div className="rj-alert rj-alert-danger" role="alert">
                      <Icon name="alert-circle" size={18} />
                      <div className="rj-stack-xs">
                        <p>
                          {candidatesError}
                          {isCandidatesQueryStale && candidatesSnapshot
                            ? ` (Chưa tải được ${requestedCandidatesQueryDesc}; đang giữ danh sách của ${shownCandidatesQueryDesc}, trang ${candidatesSnapshot.pageNumber})`
                            : isCandidatesPageStale && candidatesSnapshot
                              ? ` (Chưa tải được trang ${candidatesPageNumber}; đang giữ dữ liệu trang ${candidatesSnapshot.pageNumber})`
                              : ''}
                        </p>
                        <button
                          ref={candidatesRetryBtnRef}
                          type="button"
                          className="rj-btn rj-btn-secondary"
                          onClick={() => {
                            const activeEl = document.activeElement;
                            if (
                              activeEl === candidatesRetryBtnRef.current ||
                              activeEl === document.body ||
                              activeEl === null
                            ) {
                              candidatesRetryFocusRef.current = 'armed';
                            }
                            skipCandidatesFetchKeyRef.current = null;
                            setCandidatesLoading(true);
                            setCandidatesReloadSeq((seq) => seq + 1);
                          }}
                        >
                          <Icon name="refresh" size={16} />
                          <span>Thử lại</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {candidatesLoading && !candidatesError && candidatesSnapshot && (
                    <div className="ds-stale-status" role="status" aria-live="polite">
                      <Icon name="spinner" size={16} className="rj-spin" />
                      <span>
                        {isCandidatesQueryStale
                          ? `Đang tìm ${requestedCandidatesQueryDesc}... Đang giữ kết quả của ${shownCandidatesQueryDesc} (trang ${candidatesSnapshot.pageNumber}).`
                          : isCandidatesPageStale
                            ? `Đang tải trang ${candidatesPageNumber}... Đang giữ kết quả trang ${candidatesSnapshot.pageNumber}.`
                            : 'Đang cập nhật danh sách ứng viên...'}
                      </span>
                    </div>
                  )}

                  {candidates.length === 0 ? (
                    <div className="rj-empty-state" aria-busy={candidatesLoading || undefined}>
                      <Icon name="user" size={24} />
                      <p>
                        {isCandidatesCurrentLoaded
                          ? 'Không tìm thấy ứng viên phù hợp.'
                          : isCandidatesQueryStale || hasPendingCandidatesSearch
                            ? `Không tìm thấy ứng viên phù hợp cho truy vấn trước (${shownCandidatesQueryDesc}).`
                            : isCandidatesPageStale && candidatesSnapshot
                              ? `Không có ứng viên nào ở trang ${candidatesSnapshot.pageNumber} (${shownCandidatesQueryDesc}).`
                              : `Kết quả lần tải trước (${shownCandidatesQueryDesc}): không tìm thấy ứng viên phù hợp.`}
                      </p>
                    </div>
                  ) : (
                    <ul
                      className="ds-candidate-list"
                      aria-busy={candidatesLoading || undefined}
                      aria-label="Kết quả tìm kiếm ứng viên"
                    >
                      {candidates.map((candidate) => {
                        const isSelected = selectedCandidate?.userId === candidate.userId;
                        return (
                          <li key={candidate.userId}>
                            <button
                              type="button"
                              className={`ds-candidate-item${isSelected ? ' is-selected' : ''}`}
                              aria-pressed={isSelected}
                              onClick={() => handleSelectCandidate(candidate)}
                            >
                              <span className="ds-candidate-name">{candidate.fullName}</span>
                              <span className="ds-candidate-meta">
                                <span>{candidate.email}</span>
                                <span className="rj-tabular-nums">
                                  {candidate.lmsUserId
                                    ? `LMS: ${candidate.lmsUserId}`
                                    : 'Chưa gắn mã LMS'}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {candidateTotalPages > 1 && (
                    <nav
                      ref={candPaginationNavRef}
                      className="ds-pagination"
                      aria-label="Phân trang ứng viên"
                    >
                      <span className="ds-page-indicator rj-tabular-nums">
                        {isCandidatesQueryStale && candidatesSnapshot
                          ? `Trang ${candidatesSnapshot.pageNumber} / ${candidateTotalPages} (truy vấn trước: ${shownCandidatesQueryDesc})`
                          : isCandidatesPageStale && candidatesSnapshot
                            ? candidatesLoading
                              ? `Trang ${candidatesSnapshot.pageNumber} / ${candidateTotalPages} (đang tải trang ${candidatesPageNumber})`
                              : candidatesError
                                ? `Trang ${candidatesSnapshot.pageNumber} / ${candidateTotalPages} (chưa tải được trang ${candidatesPageNumber})`
                                : `Trang ${candidatesSnapshot.pageNumber} / ${candidateTotalPages}`
                            : `Trang ${candidatesPageNumber} / ${candidateTotalPages}`}
                      </span>
                      <div className="ds-pagination-controls">
                        <button
                          ref={candPrevBtnRef}
                          type="button"
                          className="rj-btn rj-btn-secondary ds-table-action-btn"
                          disabled={candidatesPageNumber <= 1}
                          onClick={() => {
                            if (document.activeElement === candPrevBtnRef.current) {
                              candFocusIntentRef.current = 'prev';
                            }
                            skipCandidatesFetchKeyRef.current = null;
                            setCandidatesLoading(true);
                            setCandidatesPageNumber((current) => Math.max(1, current - 1));
                          }}
                        >
                          Trang trước
                        </button>
                        <button
                          ref={candNextBtnRef}
                          type="button"
                          className="rj-btn rj-btn-secondary ds-table-action-btn"
                          disabled={candidatesPageNumber >= candidateTotalPages}
                          onClick={() => {
                            if (document.activeElement === candNextBtnRef.current) {
                              candFocusIntentRef.current = 'next';
                            }
                            skipCandidatesFetchKeyRef.current = null;
                            setCandidatesLoading(true);
                            setCandidatesPageNumber((current) =>
                              Math.min(candidateTotalPages, current + 1),
                            );
                          }}
                        >
                          Trang sau
                        </button>
                      </div>
                    </nav>
                  )}
                </>
              )}
            </div>

            <div className="rj-surface-card rj-stack-md ds-panel">
              {!selectedCandidate ? (
                <div className="rj-empty-state">
                  <Icon name="user-check" size={24} />
                  <h3 className="rj-role-card-title">Chưa chọn ứng viên</h3>
                  <p>
                    Chọn một ứng viên ở danh sách bên cạnh để đồng bộ lại hoặc xem và sửa tay bản
                    ghi dữ liệu ngoài.
                  </p>
                </div>
              ) : (
                <>
                  <div className="ds-selected-header">
                    <div>
                      <h3
                        ref={selectedCandidateHeadingRef}
                        tabIndex={-1}
                        className="rj-role-card-title"
                      >
                        {selectedCandidate.fullName}
                      </h3>
                      <p className="ds-selected-meta">
                        {selectedCandidate.email} •{' '}
                        <span className="rj-tabular-nums">
                          {selectedCandidate.lmsUserId
                            ? `Mã LMS: ${selectedCandidate.lmsUserId}`
                            : 'Chưa gắn mã LMS'}
                        </span>
                      </p>
                    </div>
                    <button
                      ref={syncBtnRef}
                      type="button"
                      className="rj-btn rj-btn-primary"
                      disabled={isSelectedCandidateSyncBusy}
                      onClick={() => void handleSyncCandidate()}
                    >
                      <Icon
                        name={isSelectedCandidateSyncBusy ? 'spinner' : 'refresh'}
                        size={16}
                        className={isSelectedCandidateSyncBusy ? 'rj-spin' : undefined}
                      />
                      <span>{isSelectedCandidateSyncBusy ? 'Đang đồng bộ...' : 'Đồng bộ lại'}</span>
                    </button>
                  </div>

                  {syncFeedback && syncFeedback.kind === 'error' && (
                    <div className="rj-alert rj-alert-danger" role="alert">
                      <Icon name="alert-circle" size={18} />
                      <span>{syncFeedback.message}</span>
                    </div>
                  )}

                  {syncFeedback && syncFeedback.kind === 'success' && (
                    <div className="rj-alert rj-alert-success" role="status" aria-live="polite">
                      <Icon name="check-circle" size={18} />
                      <span>{syncFeedback.message}</span>
                    </div>
                  )}

                  <div className="rj-stack-sm">
                    <div className="rj-row-between">
                      <h3 ref={recordsHeadingRef} tabIndex={-1} className="rj-role-card-title">
                        Bản ghi dữ liệu ngoài
                      </h3>
                      {recordsPage && (
                        <span className="ds-page-indicator rj-tabular-nums">
                          {isRecordsStale && activeRecordsSnapshot
                            ? `${recordsPage.totalItems} bản ghi (đang hiển thị trang ${activeRecordsSnapshot.pageNumber})`
                            : recordsLoading || recordsError
                              ? `${recordsPage.totalItems} bản ghi (lần tải trước)`
                              : `${recordsPage.totalItems} bản ghi`}
                        </span>
                      )}
                    </div>

                    {recordsLoading && activeRecordsSnapshot === null ? (
                      <div
                        className="rj-stack-sm"
                        role="status"
                        aria-live="polite"
                        aria-label="Đang tải bản ghi dữ liệu ngoài"
                      >
                        <span className="rj-sr-only">Đang tải bản ghi dữ liệu ngoài...</span>
                        <div className="rj-skeleton rj-skeleton-card" aria-hidden="true" />
                        <div className="rj-skeleton rj-skeleton-card" aria-hidden="true" />
                      </div>
                    ) : recordsError && activeRecordsSnapshot === null ? (
                      <div className="rj-alert rj-alert-danger" role="alert">
                        <Icon name="alert-circle" size={18} />
                        <div className="rj-stack-xs">
                          <p>{recordsError}</p>
                          <button
                            ref={recordsRetryBtnRef}
                            type="button"
                            className="rj-btn rj-btn-secondary"
                            onClick={() => {
                              const activeEl = document.activeElement;
                              if (
                                selectedCandidate &&
                                (activeEl === recordsRetryBtnRef.current ||
                                  activeEl === document.body ||
                                  activeEl === null)
                              ) {
                                recordsRetryFocusRef.current = {
                                  candidateId: selectedCandidate.userId,
                                  phase: 'armed',
                                };
                              }
                              skipRecordsFetchKeyRef.current = null;
                              setRecordsLoading(true);
                              setRecordsReloadSeq((seq) => seq + 1);
                            }}
                          >
                            <Icon name="refresh" size={16} />
                            <span>Thử lại</span>
                          </button>
                        </div>
                      </div>
                    ) : activeRecordsSnapshot === null ? null : (
                      <>
                        {recordsError && (
                          <div className="rj-alert rj-alert-danger" role="alert">
                            <Icon name="alert-circle" size={18} />
                            <div className="rj-stack-xs">
                              <p>
                                {recordsError}
                                {isRecordsStale
                                  ? ` (Chưa tải được trang ${recordsPageNumber}; đang giữ dữ liệu trang ${activeRecordsSnapshot.pageNumber})`
                                  : ''}
                              </p>
                              <button
                                ref={recordsRetryBtnRef}
                                type="button"
                                className="rj-btn rj-btn-secondary"
                                onClick={() => {
                                  const activeEl = document.activeElement;
                                  if (
                                    selectedCandidate &&
                                    (activeEl === recordsRetryBtnRef.current ||
                                      activeEl === document.body ||
                                      activeEl === null)
                                  ) {
                                    recordsRetryFocusRef.current = {
                                      candidateId: selectedCandidate.userId,
                                      phase: 'armed',
                                    };
                                  }
                                  skipRecordsFetchKeyRef.current = null;
                                  setRecordsLoading(true);
                                  setRecordsReloadSeq((seq) => seq + 1);
                                }}
                              >
                                <Icon name="refresh" size={16} />
                                <span>Thử lại</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {recordsLoading && !recordsError && (
                          <div className="ds-stale-status" role="status" aria-live="polite">
                            <Icon name="spinner" size={16} className="rj-spin" />
                            <span>
                              {isRecordsStale
                                ? `Đang tải trang ${recordsPageNumber}... Đang giữ dữ liệu trang ${activeRecordsSnapshot.pageNumber}.`
                                : 'Đang cập nhật bản ghi dữ liệu ngoài...'}
                            </span>
                          </div>
                        )}

                        {records.length === 0 ? (
                          <div className="rj-empty-state" aria-busy={recordsLoading || undefined}>
                            <Icon name="file-text" size={24} />
                            <p>
                              {isRecordsCurrentLoaded
                                ? 'Ứng viên chưa có bản ghi dữ liệu ngoài nào.'
                                : isRecordsStale && activeRecordsSnapshot
                                  ? `Không có bản ghi dữ liệu ngoài nào ở trang ${activeRecordsSnapshot.pageNumber} (lần tải trước).`
                                  : 'Ở lần tải trước, ứng viên chưa có bản ghi dữ liệu ngoài nào.'}
                            </p>
                          </div>
                        ) : (
                          <ul
                            className="ds-records-list"
                            aria-busy={recordsLoading || undefined}
                          >
                            {records.map((record) => {
                              const payloadFields = PAYLOAD_FIELDS_BY_SOURCE[record.source];
                              const overriddenFields = new Set(
                                record.overrides.map((item) => item.field),
                              );
                              const nonEditablePm = isNonCanonicalPmRecord(record);

                              return (
                                <li key={record.id} className="ds-record-card">
                                  <div className="ds-record-head">
                                    <div>
                                      <div className="ds-record-title-row">
                                        <span className="ds-source-pill">
                                          {SOURCE_LABELS[record.source]}
                                        </span>
                                        <span className="ds-record-code">{record.sourceCode}</span>
                                        <span className="ds-record-code rj-tabular-nums">
                                          Điểm quy đổi: {record.score}
                                        </span>
                                      </div>
                                      <p className="ds-record-title">{record.title}</p>
                                      <div className="ds-record-timestamps rj-tabular-nums">
                                        <span>
                                          Đồng bộ lúc: {formatSyncDateTime(record.syncedAt)}
                                        </span>
                                        <span>
                                          Ghi nhận: {formatSyncDateTime(record.recordedAt)}
                                        </span>
                                      </div>
                                    </div>

                                    {nonEditablePm ? (
                                      <span className="ds-non-editable-note">
                                        Bản ghi lịch sử PM — không thể sửa tay
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        className="rj-btn rj-btn-secondary ds-table-action-btn"
                                        onClick={(event) =>
                                          handleOpenOverrideDialog(record, event.currentTarget)
                                        }
                                      >
                                        <Icon name="pencil" size={14} />
                                        <span>Sửa tay</span>
                                      </button>
                                    )}
                                  </div>

                                  <dl className="ds-payload-grid">
                                    {payloadFields.map((descriptor) => (
                                      <div key={descriptor.key} className="ds-payload-item">
                                        <dt>
                                          <span>{descriptor.label}</span>
                                          {overriddenFields.has(descriptor.key) && (
                                            <span className="ds-override-tag">Đã sửa tay</span>
                                          )}
                                        </dt>
                                        <dd className={descriptor.isNumeric ? 'rj-tabular-nums' : undefined}>
                                          {formatPayloadValue(
                                            record.payload[descriptor.key],
                                            descriptor,
                                          )}
                                        </dd>
                                      </div>
                                    ))}
                                  </dl>

                                  {record.overrides.length > 0 && (
                                    <div className="ds-history-block">
                                      <p className="ds-history-title">Lịch sử sửa tay</p>
                                      <ul className="ds-history-list">
                                        {record.overrides.map((entry) => (
                                          <li key={entry.id} className="ds-history-entry">
                                            <div>
                                              <strong>
                                                {getOverrideFieldLabel(record.source, entry.field)}
                                              </strong>{' '}
                                              → <span className="rj-tabular-nums">{entry.value}</span>
                                            </div>
                                            <div className="ds-history-meta rj-tabular-nums">
                                              {entry.staffName || `Nhân viên #${entry.staffId}`} •{' '}
                                              {formatSyncDateTime(entry.createdAt)} • Lý do:{' '}
                                              <span className="ds-history-reason">
                                                {entry.reason}
                                              </span>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        {recordsTotalPages > 1 && (
                          <nav
                            ref={recordsPaginationNavRef}
                            className="ds-pagination"
                            aria-label="Phân trang bản ghi ngoài"
                          >
                            <span className="ds-page-indicator rj-tabular-nums">
                              {isRecordsStale && activeRecordsSnapshot
                                ? recordsLoading
                                  ? `Trang ${activeRecordsSnapshot.pageNumber} / ${recordsTotalPages} (đang tải trang ${recordsPageNumber})`
                                  : recordsError
                                    ? `Trang ${activeRecordsSnapshot.pageNumber} / ${recordsTotalPages} (chưa tải được trang ${recordsPageNumber})`
                                    : `Trang ${activeRecordsSnapshot.pageNumber} / ${recordsTotalPages}`
                                : `Trang ${recordsPageNumber} / ${recordsTotalPages}`}
                            </span>
                            <div className="ds-pagination-controls">
                              <button
                                ref={recordsPrevBtnRef}
                                type="button"
                                className="rj-btn rj-btn-secondary ds-table-action-btn"
                                disabled={recordsPageNumber <= 1}
                                onClick={() => {
                                  if (document.activeElement === recordsPrevBtnRef.current) {
                                    recordsFocusIntentRef.current = 'prev';
                                  }
                                  skipRecordsFetchKeyRef.current = null;
                                  setRecordsLoading(true);
                                  setRecordsPageNumber((current) => Math.max(1, current - 1));
                                }}
                              >
                                Trang trước
                              </button>
                              <button
                                ref={recordsNextBtnRef}
                                type="button"
                                className="rj-btn rj-btn-secondary ds-table-action-btn"
                                disabled={recordsPageNumber >= recordsTotalPages}
                                onClick={() => {
                                  if (document.activeElement === recordsNextBtnRef.current) {
                                    recordsFocusIntentRef.current = 'next';
                                  }
                                  skipRecordsFetchKeyRef.current = null;
                                  setRecordsLoading(true);
                                  setRecordsPageNumber((current) =>
                                    Math.min(recordsTotalPages, current + 1),
                                  );
                                }}
                              >
                                Trang sau
                              </button>
                            </div>
                          </nav>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="rj-surface-card rj-stack-md" aria-labelledby="ds-runs-section-heading">
          <div className="ds-runs-header">
            <div className="ds-runs-heading-group">
              <h2
                ref={runsHeadingRef}
                tabIndex={-1}
                id="ds-runs-section-heading"
                className="ds-section-title"
              >
                Lịch sử các lần chạy đồng bộ
              </h2>
              {runsSnapshot !== null && (
                <p className="ds-page-indicator rj-tabular-nums">
                  {isRunsFilterStale
                    ? `Đang giữ kết quả bộ lọc trước (${shownRunsFilterDesc}): ${runsTotalItems} lần chạy`
                    : isRunsPageStale
                      ? `Tổng cộng ${runsTotalItems} lần chạy (đang hiển thị trang ${runsSnapshot.pageNumber})`
                      : runsLoading || runsError
                        ? `Tổng cộng ${runsTotalItems} lần chạy (lần tải trước)`
                        : `Tổng cộng ${runsTotalItems} lần chạy`}
                </p>
              )}
            </div>

            <div className="ds-runs-filters">
              <div className="ds-runs-filter-field">
                <Select
                  id={statusSelectId}
                  label="Trạng thái"
                  value={statusFilter}
                  onChange={(event) => {
                    const nextStatus = event.target.value as SyncStatus | '';
                    if (nextStatus !== statusFilter) {
                      runsFocusIntentRef.current = null;
                      skipRunsFetchKeyRef.current = null;
                      setRunsLoading(true);
                      setStatusFilter(nextStatus);
                      setRunsPageNumber(1);
                    }
                  }}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="SUCCESS">Thành công</option>
                  <option value="FAILED">Thất bại</option>
                </Select>
              </div>

              <div className="ds-runs-filter-field">
                <Select
                  id={candidateScopeSelectId}
                  label="Phạm vi ứng viên"
                  value={candidateScopeValue}
                  disabled={!selectedCandidate}
                  onChange={(event) => {
                    const nextScoped = event.target.value === 'selected';
                    if (nextScoped !== filterBySelectedCandidate) {
                      runsFocusIntentRef.current = null;
                      skipRunsFetchKeyRef.current = null;
                      setRunsLoading(true);
                      setFilterBySelectedCandidate(nextScoped);
                      setRunsPageNumber(1);
                    }
                  }}
                >
                  <option value="all">Tất cả ứng viên</option>
                  {selectedCandidate && (
                    <option value="selected">{selectedCandidate.fullName}</option>
                  )}
                </Select>
              </div>

              <div className="ds-filter-actions">
                <button
                  ref={runsResetBtnRef}
                  type="button"
                  className="rj-btn rj-btn-secondary"
                  disabled={!hasActiveRunFilters}
                  onClick={handleResetRunFilters}
                >
                  Đặt lại bộ lọc
                </button>
                <button
                  ref={runsRefreshBtnRef}
                  type="button"
                  className="rj-btn rj-btn-secondary"
                  onClick={() => {
                    skipRunsFetchKeyRef.current = null;
                    setRunsLoading(true);
                    setRunsReloadSeq((seq) => seq + 1);
                  }}
                >
                  <Icon name="refresh" size={16} />
                  <span>Làm mới</span>
                </button>
              </div>
            </div>
          </div>

          {runsLoading && runsSnapshot === null ? (
            <div
              className="rj-stack-sm"
              role="status"
              aria-live="polite"
              aria-label="Đang tải lịch sử đồng bộ"
            >
              <span className="rj-sr-only">Đang tải lịch sử đồng bộ...</span>
              <div className="rj-skeleton rj-skeleton-card" aria-hidden="true" />
              <div className="rj-skeleton rj-skeleton-card" aria-hidden="true" />
            </div>
          ) : runsError && runsSnapshot === null ? (
            <div className="rj-alert rj-alert-danger" role="alert">
              <Icon name="alert-circle" size={18} />
              <div className="rj-stack-xs">
                <p>{runsError}</p>
                <button
                  ref={runsRetryBtnRef}
                  type="button"
                  className="rj-btn rj-btn-primary"
                  onClick={() => {
                    const activeEl = document.activeElement;
                    if (
                      activeEl === runsRetryBtnRef.current ||
                      activeEl === document.body ||
                      activeEl === null
                    ) {
                      runsRetryFocusRef.current = 'armed';
                    }
                    skipRunsFetchKeyRef.current = null;
                    setRunsLoading(true);
                    setRunsReloadSeq((seq) => seq + 1);
                  }}
                >
                  <Icon name="refresh" size={16} />
                  <span>Thử lại</span>
                </button>
              </div>
            </div>
          ) : runsSnapshot === null ? null : (
            <>
              {runsError && (
                <div className="rj-alert rj-alert-danger" role="alert">
                  <Icon name="alert-circle" size={18} />
                  <div className="rj-stack-xs">
                    <p>
                      {runsError}
                      {isRunsFilterStale
                        ? ` (Chưa tải được bộ lọc "${requestedRunsFilterDesc}"; đang giữ dữ liệu của bộ lọc "${shownRunsFilterDesc}", trang ${runsSnapshot.pageNumber})`
                        : isRunsPageStale
                          ? ` (Chưa tải được trang ${runsPageNumber}; đang giữ dữ liệu trang ${runsSnapshot.pageNumber})`
                          : ''}
                    </p>
                    <button
                      ref={runsRetryBtnRef}
                      type="button"
                      className="rj-btn rj-btn-primary"
                      onClick={() => {
                        const activeEl = document.activeElement;
                        if (
                          activeEl === runsRetryBtnRef.current ||
                          activeEl === document.body ||
                          activeEl === null
                        ) {
                          runsRetryFocusRef.current = 'armed';
                        }
                        skipRunsFetchKeyRef.current = null;
                        setRunsLoading(true);
                        setRunsReloadSeq((seq) => seq + 1);
                      }}
                    >
                      <Icon name="refresh" size={16} />
                      <span>Thử lại</span>
                    </button>
                  </div>
                </div>
              )}

              {runsLoading && !runsError && (
                <div className="ds-stale-status" role="status" aria-live="polite">
                  <Icon name="spinner" size={16} className="rj-spin" />
                  <span>
                    {isRunsFilterStale
                      ? `Đang tải kết quả cho bộ lọc "${requestedRunsFilterDesc}"... Đang giữ dữ liệu của bộ lọc "${shownRunsFilterDesc}" (trang ${runsSnapshot.pageNumber}).`
                      : isRunsPageStale
                        ? `Đang tải trang ${runsPageNumber}... Đang giữ dữ liệu trang ${runsSnapshot.pageNumber}.`
                        : 'Đang làm mới lịch sử đồng bộ...'}
                  </span>
                </div>
              )}

              {runs.length === 0 ? (
                <div className="rj-empty-state" aria-busy={runsLoading || undefined}>
                  <Icon name="clock" size={24} />
                  {isRunsCurrentLoaded ? (
                    hasActiveRunFilters ? (
                      <>
                        <p>Không có lần chạy nào phù hợp bộ lọc hiện tại.</p>
                        <button
                          ref={runsEmptyResetBtnRef}
                          type="button"
                          className="rj-btn rj-btn-secondary"
                          onClick={handleResetRunFilters}
                        >
                          Đặt lại bộ lọc
                        </button>
                      </>
                    ) : (
                      <p>Chưa có lần chạy đồng bộ nào được ghi nhận.</p>
                    )
                  ) : (
                    <>
                      <p>
                        {isRunsFilterStale
                          ? runsSnapshot.status !== '' || runsSnapshot.scopedUserId !== undefined
                            ? `Không có lần chạy nào phù hợp bộ lọc trước (${shownRunsFilterDesc}).`
                            : `Chưa có lần chạy đồng bộ nào ở lần tải trước (${shownRunsFilterDesc}).`
                          : isRunsPageStale
                            ? `Không có lần chạy nào ở trang ${runsSnapshot.pageNumber} (${shownRunsFilterDesc}).`
                            : `Kết quả lần tải trước (${shownRunsFilterDesc}): không có lần chạy nào.`}
                      </p>
                      {hasActiveRunFilters && (
                        <button
                          ref={runsEmptyResetBtnRef}
                          type="button"
                          className="rj-btn rj-btn-secondary"
                          onClick={handleResetRunFilters}
                        >
                          Đặt lại bộ lọc
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="ds-table-scroll" aria-busy={runsLoading || undefined}>
                  <table className="ds-dense-table">
                    <thead>
                      <tr>
                        <th scope="col">Thời điểm</th>
                        <th scope="col">Kiểu</th>
                        <th scope="col">Trạng thái</th>
                        <th scope="col">Ứng viên</th>
                        <th scope="col">Số bản ghi</th>
                        <th scope="col">Lỗi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((run) => {
                        const countsSummary = summarizeCounts(run.counts);
                        const candidateDisplay =
                          run.candidateName ||
                          (run.userId ? `Ứng viên #${run.userId}` : 'Toàn hệ thống');
                        const isErrorExpanded = Boolean(run.error) && expandedRunErrorIds.has(run.id);
                        const errorDetailRowId = `ds-run-error-detail-${run.id}`;

                        return (
                          <React.Fragment key={run.id}>
                            <tr>
                              <td className="rj-tabular-nums">
                                {formatSyncDateTime(run.startedAt)}
                              </td>
                              <td>{TRIGGER_LABELS[run.trigger]}</td>
                              <td>
                                <SyncStatusBadge status={run.status} />
                              </td>
                              <td>
                                <span className="ds-cell-ellipsis" title={candidateDisplay}>
                                  {candidateDisplay}
                                </span>
                              </td>
                              <td className="rj-tabular-nums">
                                <span>{countsSummary.totalText}</span>
                                {countsSummary.detailText && (
                                  <span className="ds-counts-detail">
                                    {countsSummary.detailText}
                                  </span>
                                )}
                              </td>
                              <td>
                                {run.error ? (
                                  <div className="ds-run-error-cell">
                                    <span className="ds-cell-ellipsis">{run.error}</span>
                                    <button
                                      type="button"
                                      className="rj-btn rj-btn-ghost ds-error-toggle-btn"
                                      aria-expanded={isErrorExpanded}
                                      aria-controls={errorDetailRowId}
                                      aria-label={
                                        isErrorExpanded
                                          ? `Thu gọn chi tiết lỗi lần chạy #${run.id}`
                                          : `Xem chi tiết lỗi lần chạy #${run.id}`
                                      }
                                      onClick={() => toggleRunErrorDetail(run.id)}
                                    >
                                      <Icon
                                        name="chevron-down"
                                        size={14}
                                        className={isErrorExpanded ? 'ds-chevron-rotated' : undefined}
                                      />
                                      <span>{isErrorExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
                                    </button>
                                  </div>
                                ) : (
                                  '—'
                                )}
                              </td>
                            </tr>
                            {run.error && isErrorExpanded && (
                              <tr id={errorDetailRowId} className="ds-run-error-detail-row">
                                <td colSpan={6} className="ds-run-error-detail-cell">
                                  <div
                                    className="ds-run-error-detail-box"
                                    role="region"
                                    aria-label={`Chi tiết lỗi lần chạy #${run.id}`}
                                  >
                                    {run.error}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {runsTotalPages > 1 && (
                <nav
                  ref={runsPaginationNavRef}
                  className="ds-pagination"
                  aria-label="Phân trang lịch sử đồng bộ"
                >
                  <span className="ds-page-indicator rj-tabular-nums">
                    {isRunsFilterStale
                      ? `Trang ${runsSnapshot.pageNumber} / ${runsTotalPages} (bộ lọc trước: ${shownRunsFilterDesc})`
                      : isRunsPageStale
                        ? runsLoading
                          ? `Trang ${runsSnapshot.pageNumber} / ${runsTotalPages} (đang tải trang ${runsPageNumber})`
                          : runsError
                            ? `Trang ${runsSnapshot.pageNumber} / ${runsTotalPages} (chưa tải được trang ${runsPageNumber})`
                            : `Trang ${runsSnapshot.pageNumber} / ${runsTotalPages}`
                        : `Trang ${runsPageNumber} / ${runsTotalPages}`}
                  </span>
                  <div className="ds-pagination-controls">
                    <button
                      ref={runsPrevBtnRef}
                      type="button"
                      className="rj-btn rj-btn-secondary"
                      disabled={runsPageNumber <= 1}
                      onClick={() => {
                        if (document.activeElement === runsPrevBtnRef.current) {
                          runsFocusIntentRef.current = 'prev';
                        }
                        skipRunsFetchKeyRef.current = null;
                        setRunsLoading(true);
                        setRunsPageNumber((current) => Math.max(1, current - 1));
                      }}
                    >
                      <Icon name="arrow-left" size={16} />
                      <span>Trang trước</span>
                    </button>
                    <button
                      ref={runsNextBtnRef}
                      type="button"
                      className="rj-btn rj-btn-secondary"
                      disabled={runsPageNumber >= runsTotalPages}
                      onClick={() => {
                        if (document.activeElement === runsNextBtnRef.current) {
                          runsFocusIntentRef.current = 'next';
                        }
                        skipRunsFetchKeyRef.current = null;
                        setRunsLoading(true);
                        setRunsPageNumber((current) => Math.min(runsTotalPages, current + 1));
                      }}
                    >
                      <span>Trang sau</span>
                      <Icon name="arrow-right" size={16} />
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </section>
      </section>

      <ManualOverrideDialog
        isOpen={editingRecord !== null}
        record={editingRecord}
        triggerElement={overrideTriggerEl}
        onClose={() => setEditingRecord(null)}
        onSuccess={handleOverrideSuccess}
      />
    </RoleHomeLayout>
  );
};

export default StaffDataSyncPage;
