import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JobDetailPanel } from './JobDetailPanel';
import { ApiError } from '../../../shared/api/auth';
import * as api from '../api/gapAnalysis';
import type { GapAnalysisResponse, JobDetail } from '../types';

const JOB: JobDetail = {
  id: 7,
  title: 'Kỹ sư Java Backend',
  companyName: 'Rikkeisoft',
  location: 'Hà Nội',
  salaryRange: '15 - 25 triệu',
  deadline: '2027-12-31T23:59:59+07:00',
  description: 'Phát triển hệ thống Enterprise bằng Java và Spring Boot.',
  requiredSkills: [
    {
      skillCode: 'JAVA',
      skillName: 'Lập trình Java',
      requiredLevel: 75,
      mandatory: true,
    },
    {
      skillCode: 'DOCKER',
      skillName: 'Đóng gói ứng dụng Docker',
      requiredLevel: 60,
      mandatory: false,
    },
  ],
};

const ANALYSIS: GapAnalysisResponse = {
  target: {
    type: 'JOB',
    id: 7,
    code: null,
    name: 'Kỹ sư Java Backend',
    description: 'Phát triển hệ thống Enterprise bằng Java và Spring Boot.',
  },
  readiness: 80,
  items: [
    {
      skillId: 9,
      skillCode: 'DOCKER',
      skillName: 'Đóng gói ứng dụng Docker',
      required: 60,
      current: 0,
      gap: 60,
      priority: 'MEDIUM',
    },
  ],
};

const renderPanel = () =>
  render(
    <MemoryRouter>
      <JobDetailPanel jobId={7} />
    </MemoryRouter>,
  );

describe('JobDetailPanel (DT-01)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the JD and runs the gap analysis when clicking the action', async () => {
    vi.spyOn(api, 'fetchJobDetail').mockResolvedValue(JOB);
    const setTargetSpy = vi.spyOn(api, 'setMyTarget').mockResolvedValue(ANALYSIS.target);
    const gapSpy = vi.spyOn(api, 'fetchGapAnalysis').mockResolvedValue(ANALYSIS);

    renderPanel();

    expect(await screen.findByRole('heading', { name: 'Kỹ sư Java Backend' })).toBeInTheDocument();
    expect(screen.getByText('Rikkeisoft')).toBeInTheDocument();
    expect(screen.getByText(/Phát triển hệ thống Enterprise/i)).toBeInTheDocument();
    expect(screen.getByText('Bắt buộc')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quay lại trang ứng viên/i })).toHaveAttribute(
      'href',
      '/candidate',
    );

    fireEvent.click(screen.getByRole('button', { name: /Phân tích so với JD này/i }));

    await waitFor(() => {
      expect(setTargetSpy).toHaveBeenCalledWith({ jobId: 7 });
    });
    expect(gapSpy).toHaveBeenCalled();
    expect(await screen.findByTestId('gap-DOCKER')).toBeInTheDocument();
    expect(screen.getByTestId('jd-gap-readiness')).toHaveTextContent('Sẵn sàng 80%');
    expect(screen.getByText('Trung bình', { selector: '.gap-priority' })).toBeInTheDocument();
  });

  it('shows a not-found error for a draft, expired or unknown JD', async () => {
    vi.spyOn(api, 'fetchJobDetail').mockRejectedValue(
      new ApiError(404, 'Không tìm thấy JD đang tuyển dụng', 'NOT_FOUND'),
    );

    renderPanel();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Không tìm thấy JD đang tuyển dụng/i,
    );
  });

  it('shows an analysis error without dropping the JD', async () => {
    vi.spyOn(api, 'fetchJobDetail').mockResolvedValue(JOB);
    vi.spyOn(api, 'setMyTarget').mockRejectedValue(
      new ApiError(404, 'Không tìm thấy JD đang tuyển dụng', 'NOT_FOUND'),
    );

    renderPanel();

    await screen.findByRole('heading', { name: 'Kỹ sư Java Backend' });
    fireEvent.click(screen.getByRole('button', { name: /Phân tích so với JD này/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Không tìm thấy JD đang tuyển dụng/i,
    );
    expect(screen.getByRole('heading', { name: 'Kỹ sư Java Backend' })).toBeInTheDocument();
  });
});
