import { ApiError } from '../../shared/api/auth';

/**
 * Types and DTOs for Candidate Evaluations feature.
 * Exactly matches Backend Spring Boot DTOs and evaluation response contract.
 */

export type EvaluationContext = 'INTERVIEW' | 'INTERNSHIP';

export interface EvaluationMentorDto {
  id: number;
  name: string;
}

export interface EvaluationScoreDto {
  criterionId: number;
  criterionDescription: string;
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
