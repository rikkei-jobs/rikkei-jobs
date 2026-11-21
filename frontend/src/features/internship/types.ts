export interface InternshipTask {
  readonly id: number;
  readonly title: string;
  readonly acceptedScore: number | null;
  readonly acceptedAt: string | null;
}

export interface CandidateInternship {
  readonly id: number;
  readonly batchId: string;
  readonly batchName: string | null;
  readonly groupName: string | null;
  readonly topicName: string | null;
  readonly mentorEmail: string | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly finalScore: number | null;
  readonly syncedAt: string | null;
  readonly tasks: readonly InternshipTask[];
}

export type CandidateInternshipsData = readonly CandidateInternship[];
