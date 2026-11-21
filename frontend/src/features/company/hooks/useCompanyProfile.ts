import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/auth';
import { getMyCompany, updateMyCompany } from '../api/companyProfile';
import type { CompanyFormValues, CompanyProfile } from '../types/company.types';
import { mapCompanyApiErrorMessage, toUpdateCompanyRequest } from '../utils/companyValidation';

export type CompanyLoadStatus = 'loading' | 'empty' | 'error' | 'ready';

export interface UseCompanyProfileResult {
  readonly profile: CompanyProfile | null;
  readonly loadStatus: CompanyLoadStatus;
  readonly loadError: string | null;
  readonly isSaving: boolean;
  readonly saveSuccess: string | null;
  readonly saveError: string | null;
  readonly isSaveConflict: boolean;
  readonly retryLoad: () => void;
  readonly saveProfile: (values: CompanyFormValues) => Promise<boolean>;
  readonly syncProfile: (updated: CompanyProfile) => void;
  readonly clearSaveFeedback: () => void;
}

export function useCompanyProfile(): UseCompanyProfileResult {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loadStatus, setLoadStatus] = useState<CompanyLoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaveConflict, setIsSaveConflict] = useState<boolean>(false);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  useEffect(() => {
    const controller = new AbortController();

    const loadCompany = async () => {
      setLoadStatus('loading');
      setLoadError(null);

      try {
        const company = await getMyCompany(controller.signal);
        if (controller.signal.aborted) {
          return;
        }
        setProfile(company);
        setLoadStatus('ready');
      } catch (err: unknown) {
        if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setProfile(null);
          setLoadError(mapCompanyApiErrorMessage(err, 'load'));
          setLoadStatus('empty');
          return;
        }
        setLoadError(mapCompanyApiErrorMessage(err, 'load'));
        setLoadStatus('error');
      }
    };

    void loadCompany();

    return () => {
      controller.abort();
    };
  }, [reloadNonce]);

  const retryLoad = useCallback(() => {
    setSaveSuccess(null);
    setSaveError(null);
    setIsSaveConflict(false);
    setReloadNonce((current) => current + 1);
  }, []);

  const clearSaveFeedback = useCallback(() => {
    setSaveSuccess(null);
    setSaveError(null);
    setIsSaveConflict(false);
  }, []);

  const syncProfile = useCallback((updated: CompanyProfile) => {
    setProfile(updated);
  }, []);

  const saveProfile = useCallback(
    async (values: CompanyFormValues): Promise<boolean> => {
      if (
        !profile ||
        typeof profile.version !== 'number' ||
        !Number.isFinite(profile.version) ||
        !Number.isInteger(profile.version) ||
        profile.version < 0
      ) {
        setSaveSuccess(null);
        setIsSaveConflict(false);
        setSaveError('Thiếu thông tin phiên bản hồ sơ công ty. Vui lòng tải lại dữ liệu trước khi lưu.');
        return false;
      }

      setIsSaving(true);
      setSaveSuccess(null);
      setSaveError(null);
      setIsSaveConflict(false);

      try {
        const payload = toUpdateCompanyRequest(values, profile.version);
        const updated = await updateMyCompany(payload);
        setProfile(updated);
        setSaveSuccess('Đã lưu thay đổi hồ sơ công ty.');
        return true;
      } catch (err: unknown) {
        setIsSaveConflict(err instanceof ApiError && err.status === 409);
        setSaveError(mapCompanyApiErrorMessage(err, 'save'));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [profile],
  );

  return {
    profile,
    loadStatus,
    loadError,
    isSaving,
    saveSuccess,
    saveError,
    isSaveConflict,
    retryLoad,
    saveProfile,
    syncProfile,
    clearSaveFeedback,
  };
}
