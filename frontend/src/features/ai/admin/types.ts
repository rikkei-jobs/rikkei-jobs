export type AiProvider = 'MOCK' | 'OPENAI' | 'GEMINI' | 'CLAUDE';
export type AiFeature = 'RECOMMEND' | 'CV' | 'PRACTICE' | 'CHAT';
export type AiStatus = 'OK' | 'ERROR' | 'BLOCKED';

export interface AiConfig {
  readonly id: number;
  readonly provider: AiProvider;
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly dailyLimitPerUser: number;
  readonly enabled: boolean;
  readonly updatedBy: number | null;
  readonly updatedAt: string;
  readonly version: number;
}
export type UpdateAiConfig = Pick<
  AiConfig,
  'provider' | 'model' | 'temperature' | 'maxTokens' | 'dailyLimitPerUser' | 'enabled' | 'version'
>;
export interface AiLog {
  readonly id: number;
  readonly userId: number;
  readonly feature: AiFeature;
  readonly provider: AiProvider;
  readonly model: string;
  readonly promptMasked: string;
  readonly response: string;
  readonly tokensIn: number | null;
  readonly tokensOut: number | null;
  readonly latencyMs: number;
  readonly status: AiStatus;
  readonly createdAt: string;
}
export interface AiLogPage {
  readonly items: readonly AiLog[];
  readonly total: number;
  readonly page: number;
  readonly size: number;
  readonly totalCapped?: boolean;
}
export interface UsageBucket {
  readonly date: string | null;
  readonly feature: AiFeature | null;
  readonly calls: number;
  readonly ok: number;
  readonly errors: number;
  readonly blocked: number;
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly unknownTokenCalls: number;
}
export interface AiUsageSummary {
  readonly timezone: string;
  readonly from: string;
  readonly to: string;
  readonly daily: readonly UsageBucket[];
  readonly byFeature: readonly UsageBucket[];
}
export interface LogFilters {
  readonly feature: AiFeature | '';
  readonly status: AiStatus | '';
  readonly userId: string;
  readonly from: string;
  readonly to: string;
}
export const FEATURE_LABELS: Record<AiFeature, string> = {
  RECOMMEND: 'Gợi ý việc làm',
  CV: 'Góp ý CV',
  PRACTICE: 'Luyện phỏng vấn',
  CHAT: 'Trò chuyện',
};
export const STATUS_LABELS: Record<AiStatus, string> = {
  OK: 'Thành công',
  ERROR: 'Lỗi dịch vụ',
  BLOCKED: 'Bị chặn',
};
