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
  message?: string | null;
}

export interface TargetPosition {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export type GapTargetType = 'POSITION' | 'JOB';

export interface GapTarget {
  type: GapTargetType;
  id: number;
  code: string | null;
  name: string;
  description: string | null;
}

export type GapPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface GapItem {
  skillId: number;
  skillCode: string;
  skillName: string;
  required: number;
  current: number;
  gap: number;
  priority: GapPriority;
}

export interface GapAnalysisResponse {
  target: GapTarget;
  readiness: number;
  items: GapItem[];
}

export interface JobSkillRequirement {
  skillCode: string;
  skillName: string;
  requiredLevel: number;
  mandatory: boolean;
}

export interface JobDetail {
  id: number;
  title: string;
  companyName: string;
  location: string | null;
  salaryRange: string | null;
  deadline: string;
  description: string | null;
  requiredSkills: JobSkillRequirement[];
}
