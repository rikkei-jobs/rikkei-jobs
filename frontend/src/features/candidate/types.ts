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
