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
