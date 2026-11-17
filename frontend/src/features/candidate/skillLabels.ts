import type { EvidenceSource, SkillLevel } from './api/skillProfile';

export const LEVEL_LABELS: Record<SkillLevel, string> = {
  BASIC: 'Cơ bản',
  INTERMEDIATE: 'Khá',
  ADVANCED: 'Tốt',
  EXPERT: 'Xuất sắc',
};

export const LEVEL_RANGES: ReadonlyArray<{ level: SkillLevel; range: string }> = [
  { level: 'BASIC', range: '0 - 39' },
  { level: 'INTERMEDIATE', range: '40 - 69' },
  { level: 'ADVANCED', range: '70 - 84' },
  { level: 'EXPERT', range: '85 - 100' },
];

export const SOURCE_LABELS: Record<EvidenceSource, string> = {
  LMS: 'Bảng điểm LMS',
  EXAM: 'Bài thi',
  INTERNSHIP: 'Thực tập IOC',
  MENTOR: 'Mentor đánh giá',
  SELF: 'Tự đánh giá',
};

/** Display order of skill groups; unknown groups are appended after these. */
export const GROUP_ORDER: readonly string[] = [
  'PROGRAMMING',
  'BACKEND',
  'FRONTEND',
  'DEVOPS',
  'QUALITY',
  'SOFT_SKILL',
];

export const GROUP_LABELS: Record<string, string> = {
  PROGRAMMING: 'Lập trình nền tảng',
  BACKEND: 'Backend và dữ liệu',
  FRONTEND: 'Frontend',
  DEVOPS: 'Công cụ và vận hành',
  QUALITY: 'Chất lượng và bảo mật',
  SOFT_SKILL: 'Kỹ năng mềm',
  GENERAL: 'Khác',
};

export const formatScore = (score: number): string =>
  Number.isInteger(score) ? String(score) : score.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(iso));
