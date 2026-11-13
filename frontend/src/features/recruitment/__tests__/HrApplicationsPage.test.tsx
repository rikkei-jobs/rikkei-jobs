import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api/applicationApi';
import { HrApplicationsPage } from '../pages/HrApplicationsPage';
import type { ApplicationDetail } from '../types';

const job = {
  id: 501,
  title: 'Backend Engineer',
  description: 'Build services',
  companyName: 'Rikkei Digital',
  location: 'Hà Nội',
  employmentType: 'FULL_TIME',
  salaryRange: null,
  status: 'APPROVED' as const,
  deadline: '2027-01-01T00:00:00Z',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};

const detail: ApplicationDetail = {
  id: 701,
  jobId: 501,
  jobTitle: 'Backend Engineer',
  companyName: 'Rikkei Digital',
  cvId: 4,
  cvSnapshotUrl: '/api/v1/hr/job-descriptions/501/applications/701/cv-snapshot',
  coverLetter: 'I would like to join.',
  status: 'SUBMITTED',
  canWithdraw: true,
  createdAt: '2026-11-10T00:00:00Z',
  updatedAt: '2026-11-10T00:00:00Z',
  histories: [
    {
      id: 1,
      fromStatus: null,
      toStatus: 'SUBMITTED',
      actorId: 4,
      note: 'Application submitted',
      createdAt: '2026-11-10T00:00:00Z',
    },
  ],
};

describe('HrApplicationsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'getHrJobs').mockResolvedValue({
      items: [job],
      page: 1,
      size: 100,
      totalItems: 1,
      totalPages: 1,
    });
    vi.spyOn(api, 'getHrApplications').mockResolvedValue({
      items: [
        {
          id: 701,
          candidateUserId: 81,
          cvSnapshotUrl: detail.cvSnapshotUrl,
          coverLetter: detail.coverLetter,
          status: 'SUBMITTED',
          createdAt: detail.createdAt,
          updatedAt: detail.updatedAt,
        },
      ],
      page: 1,
      size: 100,
      totalItems: 1,
      totalPages: 1,
    });
    vi.spyOn(api, 'getHrApplicationDetail').mockResolvedValue(detail);
  });

  it('opens a candidate application and sends a valid status transition', async () => {
    const updatedDetail: ApplicationDetail = { ...detail, status: 'SCREENING' };
    const updateStatus = vi
      .spyOn(api, 'updateHrApplicationStatus')
      .mockResolvedValue(updatedDetail);

    render(<HrApplicationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Xem hồ sơ' }));
    const statusSelect = await screen.findByLabelText('Trạng thái tiếp theo');
    fireEvent.change(statusSelect, { target: { value: 'SCREENING' } });
    fireEvent.change(screen.getByLabelText('Ghi chú xử lý'), {
      target: { value: 'Đạt yêu cầu sàng lọc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật trạng thái' }));

    await waitFor(() => {
      expect(updateStatus).toHaveBeenCalledWith(501, 701, 'SCREENING', 'Đạt yêu cầu sàng lọc');
    });
    expect(await screen.findByText('Đang sàng lọc')).toBeInTheDocument();
  });
});
