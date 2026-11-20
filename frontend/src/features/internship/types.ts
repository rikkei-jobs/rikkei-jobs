export interface InternshipTask {
  id: number;
  title: string;
  acceptedScore: number;
  acceptedAt: string;
}

export interface CandidateInternship {
  id: number;
  batchId: string;
  batchName: string;
  groupName: string;
  topicName: string;
  mentorEmail: string;
  startDate: string;
  endDate: string;
  finalScore: number;
  syncedAt: string;
  tasks: InternshipTask[];
}

export type CandidateInternshipsData = CandidateInternship[];