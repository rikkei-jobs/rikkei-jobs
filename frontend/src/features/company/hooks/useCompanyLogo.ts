import { useCallback, useRef, useState } from 'react';
import { uploadCompanyLogo } from '../api/companyProfile';
import type { CompanyProfile } from '../types/company.types';
import {
  isRetryableLogoError,
  mapCompanyApiErrorMessage,
  validateLogoFile,
} from '../utils/companyValidation';

export type LogoImageStatus = 'empty' | 'loading' | 'ready' | 'error';

export interface UseCompanyLogoResult {
  readonly logoDisplayUrl: string | null;
  readonly logoImageStatus: LogoImageStatus;
  readonly imageKey: string | null;
  readonly isUploadingLogo: boolean;
  readonly logoError: string | null;
  readonly logoSuccess: string | null;
  readonly canRetryUpload: boolean;
  readonly handleLogoFileSelect: (file: File | null | undefined) => Promise<void>;
  readonly retryUpload: () => Promise<void>;
  readonly retryImageLoad: () => void;
  readonly handleImageLoad: () => void;
  readonly handleImageError: () => void;
  readonly clearLogoFeedback: () => void;
}

function buildRetryDisplayUrl(url: string, retryCount: number): string {
  if (retryCount <= 0 || !/^https?:\/\//i.test(url)) {
    return url;
  }
  const hashIndex = url.indexOf('#');
  const baseAndQuery = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hashFragment = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const separator = baseAndQuery.includes('?') ? '&' : '?';
  return `${baseAndQuery}${separator}retry=${retryCount}${hashFragment}`;
}

export function useCompanyLogo(
  logoUrl: string | null | undefined,
  onUploaded: (updatedCompany: CompanyProfile) => void,
): UseCompanyLogoResult {
  const [uploadSequence, setUploadSequence] = useState<number>(0);
  const [retryState, setRetryState] = useState<{ baseKey: string; count: number }>({
    baseKey: '',
    count: 0,
  });
  const [imageOutcome, setImageOutcome] = useState<{
    key: string;
    outcome: 'ready' | 'error';
  } | null>(null);

  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null);
  const [canRetryUpload, setCanRetryUpload] = useState<boolean>(false);

  const isUploadingRef = useRef<boolean>(false);
  const lastValidFileRef = useRef<File | null>(null);

  const normalizedLogoUrl = logoUrl && logoUrl.trim().length > 0 ? logoUrl.trim() : null;
  const baseKey = normalizedLogoUrl ? `${normalizedLogoUrl}::${uploadSequence}` : '';
  const imageRetryCount =
    normalizedLogoUrl && retryState.baseKey === baseKey ? retryState.count : 0;
  const imageKey = normalizedLogoUrl ? `${baseKey}::${imageRetryCount}` : null;
  const logoDisplayUrl = normalizedLogoUrl
    ? buildRetryDisplayUrl(normalizedLogoUrl, imageRetryCount)
    : null;
  const logoImageStatus: LogoImageStatus = !imageKey
    ? 'empty'
    : imageOutcome?.key === imageKey
      ? imageOutcome.outcome
      : 'loading';

  const handleImageLoad = useCallback(() => {
    if (!imageKey) {
      return;
    }
    setImageOutcome((prev) =>
      prev?.key === imageKey && prev.outcome === 'ready'
        ? prev
        : { key: imageKey, outcome: 'ready' },
    );
  }, [imageKey]);

  const handleImageError = useCallback(() => {
    if (!imageKey) {
      return;
    }
    setLogoSuccess(null);
    setImageOutcome((prev) =>
      prev?.key === imageKey && prev.outcome === 'error'
        ? prev
        : { key: imageKey, outcome: 'error' },
    );
  }, [imageKey]);

  const retryImageLoad = useCallback(() => {
    if (!normalizedLogoUrl) {
      return;
    }
    setRetryState({ baseKey, count: imageRetryCount + 1 });
  }, [normalizedLogoUrl, baseKey, imageRetryCount]);

  const clearLogoFeedback = useCallback(() => {
    lastValidFileRef.current = null;
    setCanRetryUpload(false);
    setLogoError(null);
    setLogoSuccess(null);
  }, []);

  const executeUpload = useCallback(
    async (file: File): Promise<void> => {
      if (isUploadingRef.current) {
        return;
      }

      isUploadingRef.current = true;
      setIsUploadingLogo(true);
      setLogoError(null);
      setLogoSuccess(null);
      setCanRetryUpload(false);

      try {
        const updatedCompany = await uploadCompanyLogo(file);
        lastValidFileRef.current = null;
        setCanRetryUpload(false);
        onUploaded(updatedCompany);
        // Increment sequence so identical CDN URLs still trigger a clean image reload
        setUploadSequence((current) => current + 1);
        setLogoSuccess('Đã tải lên logo công ty thành công.');
      } catch (err: unknown) {
        const retryable = isRetryableLogoError(err);
        lastValidFileRef.current = retryable ? file : null;
        setCanRetryUpload(retryable);
        setLogoError(mapCompanyApiErrorMessage(err, 'logo'));
      } finally {
        isUploadingRef.current = false;
        setIsUploadingLogo(false);
      }
    },
    [onUploaded],
  );

  const handleLogoFileSelect = useCallback(
    async (file: File | null | undefined): Promise<void> => {
      if (isUploadingRef.current) {
        return;
      }

      lastValidFileRef.current = null;
      setCanRetryUpload(false);
      setLogoError(null);
      setLogoSuccess(null);

      const validationError = validateLogoFile(file);
      if (validationError || !file) {
        setLogoError(validationError ?? 'Vui lòng chọn tệp logo để tải lên.');
        return;
      }

      lastValidFileRef.current = file;
      await executeUpload(file);
    },
    [executeUpload],
  );

  const retryUpload = useCallback(async (): Promise<void> => {
    if (isUploadingRef.current || !lastValidFileRef.current) {
      return;
    }
    await executeUpload(lastValidFileRef.current);
  }, [executeUpload]);

  return {
    logoDisplayUrl,
    logoImageStatus,
    imageKey,
    isUploadingLogo,
    logoError,
    logoSuccess,
    canRetryUpload,
    handleLogoFileSelect,
    retryUpload,
    retryImageLoad,
    handleImageLoad,
    handleImageError,
    clearLogoFeedback,
  };
}
