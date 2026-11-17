import { ApiError } from '../../shared/api/auth';

/**
 * Types and DTOs for Candidate Evaluations feature.
 * Matches Backend Spring Boot DTOs and evaluation response contract.
 */

export type EvaluationContext = 'INTERVIEW' | 'INTERNSHIP';

export interface EvaluationMentorDto {
  id: number;
  name: string;
  email?: string;
}

export interface EvaluationScoreDto {
  criterionId: number;
  criterionDescription: string;
  skillCode?: string;
  score: number;
  comment: string | null;
}

export interface CandidateEvaluation {
  id: number;
  mentor: EvaluationMentorDto;
  templateId: number;
  context: EvaluationContext;
  submittedAt: string;
  overallComment: string | null;
  scores: EvaluationScoreDto[];
}

export interface CandidateEvaluationsData {
  userId: number;
  evaluations: CandidateEvaluation[];
}

export interface ErrorResponse {
  code: string;
  message: string;
}

export class CandidateEvaluationsApiError extends ApiError {
  constructor(code: string, message: string, status: number) {
    super(status, message, code);
    this.name = 'CandidateEvaluationsApiError';
  }
}

/**
 * Types and DTOs for Job Recommendations feature (T023D8B).
 */

export interface JobSkillDto {
  skillCode: string;
  skillName: string;
  requiredLevel: number;
  candidateScore: number;
  mandatory: boolean;
  satisfied: boolean;
}

export interface JobRecommendation {
  id: number;
  jobId: number;
  title: string;
  companyName: string;
  location: string;
  salaryRange: string;
  deadline: string;
  score: number;
  explanation: string;
  isAiGenerated: boolean;
  rank: number;
  matchingSkills: string[];
  missingSkills: string[];
  requiredSkills: JobSkillDto[];
}

export interface JobRecommendationsResponse {
  items: JobRecommendation[];
  total: number;
  candidateId: number;
  isCached: boolean;
  cachedAt: string;
  activeProvider: string;
}
