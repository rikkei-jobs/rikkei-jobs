import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api/applicationApi';
import { CandidateJobsPage } from '../pages/CandidateJobsPage';

describe('CandidateJobsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('disables applying when the candidate already applied to the job', async () => {
    vi.spyOn(api, 'getApprovedJobs').mockResolvedValue({
      items: [
        {
          id: 101,
          title: 'Backend Engineer',
          description: 'Build services',
          companyName: 'Rikkei Digital',
          location: 'Hà Nội',
          employmentType: 'FULL_TIME',
          salaryRange: null,
          status: 'APPROVED',
          deadline: '2027-01-01T00:00:00Z',
          createdAt: '2026-11-01T00:00:00Z',
          updatedAt: '2026-11-01T00:00:00Z',
        },
      ],
      page: 1,
      size: 100,
      totalItems: 1,
      totalPages: 1,
    });
    vi.spyOn(api, 'getCandidateCvs').mockResolvedValue({
      items: [
        {
          id: 5,
          title: 'CV kỹ sư backend',
          originalFilename: 'backend.pdf',
          fileSize: 4096,
          updatedAt: '2026-11-10T00:00:00Z',
        },
      ],
      page: 1,
      size: 100,
      totalItems: 1,
      totalPages: 1,
    });
    vi.spyOn(api, 'getMyApplications').mockResolvedValue({
      items: [
        {
          id: 8,
          jobId: 101,
          jobTitle: 'Backend Engineer',
          companyName: 'Rikkei Digital',
          status: 'REJECTED',
          canWithdraw: false,
          createdAt: '2026-11-10T00:00:00Z',
          updatedAt: '2026-11-10T00:00:00Z',
        },
      ],
      page: 1,
      size: 100,
      totalItems: 1,
      totalPages: 1,
    });

    render(<CandidateJobsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Đã ứng tuyển' })).toBeDisabled();
    });
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ứng tuyển của tôi' }));
    expect(await screen.findByText('Ứng tuyển của tôi')).toBeInTheDocument();
  });
});
