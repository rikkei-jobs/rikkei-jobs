import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { JobRecommendationsSection } from './JobRecommendationsSection';
import * as api from './api';
import type { JobRecommendationsResponse } from './types';

describe('JobRecommendationsSection Component', () => {
  const mockResponse: JobRecommendationsResponse = {
    items: [
      {
        id: 1,
        jobId: 1,
        title: 'Kỹ sư Java Backend',
        companyName: 'Rikkeisoft',
        location: 'Hà Nội',
        salaryRange: '15 - 25 triệu',
        deadline: '2027-12-31T23:59:59+07:00',
        score: 95,
        explanation:
          'Hồ sơ của bạn phù hợp 95% với vị trí này nhờ năng lực tốt về Java và Spring Boot.',
        isAiGenerated: true,
        rank: 1,
        matchingSkills: ['Lập trình Java', 'Framework Spring Boot'],
        missingSkills: [],
        requiredSkills: [
          {
            skillCode: 'JAVA',
            skillName: 'Lập trình Java',
            requiredLevel: 75,
            candidateScore: 85,
            mandatory: true,
            satisfied: true,
          },
        ],
      },
      {
        id: 2,
        jobId: 2,
        title: 'Fresher Java Developer',
        companyName: 'FPT Software',
        location: 'Đà Nẵng',
        salaryRange: '8 - 14 triệu',
        deadline: '2027-12-31T23:59:59+07:00',
        score: 70,
        explanation: 'Gợi ý hệ thống dựa trên điểm kỹ năng phù hợp.',
        isAiGenerated: false,
        rank: 2,
        matchingSkills: ['Lập trình Java'],
        missingSkills: ['Cơ sở dữ liệu & SQL (35/50)'],
        requiredSkills: [
          {
            skillCode: 'JAVA',
            skillName: 'Lập trình Java',
            requiredLevel: 60,
            candidateScore: 80,
            mandatory: true,
            satisfied: true,
          },
        ],
      },
    ],
    total: 2,
    candidateId: 1,
    isCached: true,
    cachedAt: '2026-11-11T06:00:00Z',
    activeProvider: 'MOCK',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders section title and recommendations cards correctly', async () => {
    vi.spyOn(api, 'fetchJobRecommendations').mockResolvedValueOnce(mockResponse);

    render(<JobRecommendationsSection initialUserId={1} />);

    expect(screen.getByText(/Việc làm phù hợp với bạn/i)).toBeInTheDocument();
    expect(screen.getByText(/Đang phân tích hồ sơ kỹ năng/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Kỹ sư Java Backend')).toBeInTheDocument();
      expect(screen.getByText('Fresher Java Developer')).toBeInTheDocument();
    });

    expect(screen.getByText('95% khớp')).toBeInTheDocument();
    expect(screen.getByText('70% khớp')).toBeInTheDocument();
    expect(screen.getByText('✨ Do AI tạo')).toBeInTheDocument();
    expect(screen.getByText('⚙️ Gợi ý hệ thống')).toBeInTheDocument();
    expect(screen.getByText(/Đã lưu bộ nhớ đệm/i)).toBeInTheDocument();
  });

  it('triggers fresh calculation when clicking "Làm mới"', async () => {
    const fetchSpy = vi
      .spyOn(api, 'fetchJobRecommendations')
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce({
        ...mockResponse,
        isCached: false,
      });

    render(<JobRecommendationsSection initialUserId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Kỹ sư Java Backend')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole('button', { name: /Làm mới/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(10, true, 1);
    });
  });

  it('changes candidate when selecting from dropdown', async () => {
    const fetchSpy = vi.spyOn(api, 'fetchJobRecommendations').mockResolvedValue(mockResponse);

    render(<JobRecommendationsSection initialUserId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Kỹ sư Java Backend')).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Chọn ứng viên/i);
    fireEvent.change(select, { target: { value: '2' } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(10, false, 2);
    });
  });

  it('displays error message when API call fails', async () => {
    vi.spyOn(api, 'fetchJobRecommendations').mockRejectedValueOnce(
      new Error('Mạng không khả dụng'),
    );

    render(<JobRecommendationsSection initialUserId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Mạng không khả dụng/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
  });
});
