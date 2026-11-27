export type EvaluationContext = 'INTERNSHIP' | 'INTERVIEW';

export interface EvaluationCriterion {
  id: number;
  skillId: number | null;
  description: string;
  weight: number;
}

export interface EvaluationTemplate {
  id: number;
  name: string;
  position: string | null;
  context: EvaluationContext;
  active: boolean;
  criteria: EvaluationCriterion[];
}

export type MentorEvaluationStatus = 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED';

export interface MentorEvaluationTask {
  userId: number;
  fullName: string;
  email: string;
  evaluationId: number | null;
  status: MentorEvaluationStatus;
  batchId: string | null;
  batchName: string | null;
  interviewRoundId: number | null;
}

export interface MentorEvaluationTasksResponse {
  context: EvaluationContext;
  batchId: string | null;
  total: number;
  items: MentorEvaluationTask[];
}
export type EvaluationStatus = 'DRAFT' | 'SUBMITTED';

export interface EvaluationScore {
  id: number | null;
  criterionId: number;
  score: number | null;
  comment: string | null;
}

export interface EvaluationResponse {
  id: number;
  templateId: number;
  userId: number;
  mentorId: number;
  context: EvaluationContext;
  batchId: string | null;
  interviewRoundId: number | null;
  status: EvaluationStatus;
  overallComment: string | null;
  submittedAt: string | null;
  scores: EvaluationScore[];
}

export interface CreateEvaluationRequest {
  templateId: number;
  userId: number;
  context: EvaluationContext;
  batchId: string | null;
  interviewRoundId: number | null;
  overallComment: string | null;
  scores: {
    criterionId: number;
    score: number | null;
    comment: string | null;
  }[];
}

export interface UpdateEvaluationRequest {
  overallComment: string | null;
  scores: {
    criterionId: number;
    score: number | null;
    comment: string | null;
  }[];
}
