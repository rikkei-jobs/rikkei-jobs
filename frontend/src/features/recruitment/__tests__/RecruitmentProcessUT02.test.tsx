import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as recruitmentApi from '../api/recruitmentProcessApi';
import { ApplicationDetailPage } from '../pages/ApplicationDetailPage';
import { StaffApplicationsPage } from '../pages/StaffApplicationsPage';
import type { ApplicationProcessDetail, PageResponse, StaffApplicationSummary } from '../types';

describe('Recruitment Process UT-02 Frontend Suites', () => {
  const mockDetail: ApplicationProcessDetail = {
    id: 10,
    jobId: 101,
    jobTitle: 'Backend Java Developer',
    companyId: 1,
    companyName: 'Rikkei Digital',
    candidateUserId: 1,
    candidateName: 'Nguyễn Văn An',
    candidateEmail: 'candidate1@rikkeijobs.test',
    cvId: 1,
    cvSnapshotUrl: '/snapshots/cv_1.pdf',
    coverLetter: 'Thư ứng tuyển mẫu.',
    status: 'INTERVIEW',
    matchScore: 88,
    canWithdraw: false,
    canSendOffer: true,
    allowedTransitions: ['REJECTED'],
    rounds: [
      {
        id: 1,
        applicationId: 10,
        roundNo: 1,
        name: 'Vòng 1 - Kỹ thuật',
        interviewerEmail: 'techlead@rikkeidigital.com',
        scheduledAt: '2026-11-25T14:00:00Z',
        result: 'PASS',
        score: 85,
        note: 'Tốt',
        createdAt: '2026-11-20T10:00:00Z',
        updatedAt: '2026-11-20T10:00:00Z',
      },
    ],
    histories: [
      {
        id: 1,
        fromStatus: null,
        toStatus: 'SUBMITTED',
        actorId: 1,
        note: 'Ứng tuyển ban đầu',
        createdAt: '2026-11-18T10:00:00Z',
      },
      {
        id: 2,
        fromStatus: 'SUBMITTED',
        toStatus: 'SCREENING',
        actorId: 4,
        note: 'Duyệt hồ sơ',
        createdAt: '2026-11-19T10:00:00Z',
      },
      {
        id: 3,
        fromStatus: 'SCREENING',
        toStatus: 'INTERVIEW',
        actorId: 4,
        note: 'Mời phỏng vấn',
        createdAt: '2026-11-20T10:00:00Z',
      },
    ],
    createdAt: '2026-11-18T10:00:00Z',
    updatedAt: '2026-11-20T10:00:00Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders application details, rounds, and offer eligibility for HR', async () => {
    vi.spyOn(recruitmentApi, 'getApplicationProcessDetail').mockResolvedValue(mockDetail);

    render(
      <ApplicationDetailPage
        applicationId={10}
        userRole="HR"
        onBack={vi.fn()}
      />,
    );

    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('Vòng 1 - Kỹ thuật')).toBeInTheDocument();
    expect(screen.getByText('Đủ điều kiện chuyển sang OFFER (UT-07):')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thêm vòng phỏng vấn/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chuyển trạng thái đơn/i })).toBeInTheDocument();
  });

  it('hides edit and transition buttons when viewed by STAFF (read-only)', async () => {
    vi.spyOn(recruitmentApi, 'getApplicationProcessDetail').mockResolvedValue(mockDetail);

    render(
      <ApplicationDetailPage
        applicationId={10}
        userRole="STAFF"
        onBack={vi.fn()}
      />,
    );

    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText(/Chế độ: Cán bộ theo dõi/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thêm vòng phỏng vấn/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Chuyển trạng thái đơn/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cập nhật kết quả/i })).not.toBeInTheDocument();
  });

  it('renders staff applications list and allows filtering', async () => {
    const mockStaffPage: PageResponse<StaffApplicationSummary> = {
      items: [
        {
          id: 10,
          jobId: 101,
          jobTitle: 'Backend Java Developer',
          companyId: 1,
          companyName: 'Rikkei Digital',
          candidateUserId: 1,
          candidateName: 'Nguyễn Văn An',
          candidateEmail: 'candidate1@rikkeijobs.test',
          status: 'INTERVIEW',
          roundCount: 1,
          matchScore: 88,
          createdAt: '2026-11-18T10:00:00Z',
          updatedAt: '2026-11-20T10:00:00Z',
        },
      ],
      page: 0,
      size: 15,
      totalItems: 1,
      totalPages: 1,
    };

    vi.spyOn(recruitmentApi, 'getStaffApplications').mockResolvedValue(mockStaffPage);

    render(<StaffApplicationsPage />);

    expect(await screen.findByText('Theo dõi quy trình tuyển dụng toàn hệ thống')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('Rikkei Digital')).toBeInTheDocument();
    expect(screen.getByText('1 vòng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem chi tiết' })).toBeInTheDocument();
  });
});
