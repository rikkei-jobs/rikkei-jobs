import { ApiError } from '../../shared/api/auth';

/** Turns an API failure into a Vietnamese message; AbortError keeps the current state. */
export const describeGapError = (err: unknown): string | null => {
  if (err instanceof Error && err.name === 'AbortError') {
    return null;
  }
  if (err instanceof ApiError) {
    return `Không tải được dữ liệu phân tích (${err.message})`;
  }
  return 'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
};
