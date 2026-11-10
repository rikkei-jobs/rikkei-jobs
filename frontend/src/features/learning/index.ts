/**
 * Module 5: Learning (Đào tạo bổ sung & LMS)
 * Phân tích khoảng thiếu hụt kỹ năng (Skill Gap), đề xuất môn học bổ sung trên LMS.
 */
export interface CourseRecommendationSummary {
  courseId: string;
  courseName: string;
  targetSkill: string;
  gapScore: number;
}

export const learningModuleConfig = {
  id: 'learning',
  code: 'MOD-05',
  name: 'Đào tạo bổ sung (Learning)',
  description:
    'Phân tích khoảng thiếu hụt kỹ năng (Skill Gap) so với JD mục tiêu, gợi ý khóa học LMS để hoàn thiện năng lực.',
  roleTarget: 'CANDIDATE, MENTOR',
  badge: 'Module 5',
};
