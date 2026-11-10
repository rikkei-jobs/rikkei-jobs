/**
 * Module 7: AI Career Assistant (Trợ lý nghề nghiệp AI)
 * Gợi ý vị trí việc làm phù hợp, góp ý CV, luyện phỏng vấn thử (bảo vệ thông tin PII).
 */
export interface AiRecommendationSummary {
  matchPercentage: number;
  recommendedRole: string;
  reasons: string[];
}

export const aiModuleConfig = {
  id: 'ai',
  code: 'MOD-07',
  name: 'Trợ lý nghề nghiệp AI (AI Assistant)',
  description:
    'Gợi ý vị trí việc làm theo hồ sơ năng lực, góp ý cải thiện CV, mô phỏng phỏng vấn thử theo JD (bảo mật dữ liệu PII).',
  roleTarget: 'CANDIDATE, HR',
  badge: 'Module 7',
};
