import { formatRoleList } from '../../shared/i18n/enumLabels';

/**
 * Module 4: Assessment (Đánh giá năng lực)
 * Phiếu đánh giá của Mentor theo khung 20 kỹ năng, tính chỉ số năng lực tổng hợp (0-100).
 */
export interface AssessmentSummary {
  skillCode: string;
  score: number;
  levelBand: 'BASIC' | 'GOOD' | 'ADVANCED' | 'EXCELLENT';
}

export const assessmentModuleConfig = {
  id: 'assessment',
  code: 'MOD-04',
  name: 'Đánh giá năng lực (Assessment)',
  description:
    'Phiếu đánh giá Mentor theo 20 kỹ năng được đánh giá, tự đánh giá, tính chỉ số năng lực tổng hợp (0-100) và cấp huy hiệu.',
  roleTarget: formatRoleList(['MENTOR', 'CANDIDATE', 'ADMIN']),
  badge: 'Module 4',
};

export {
  fetchEvaluationTemplates,
  type EvaluationTemplateCriterion,
  type EvaluationTemplateItem,
} from './api/evaluationTemplates';
