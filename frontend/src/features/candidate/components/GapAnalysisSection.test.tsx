import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../identity/context/AuthContext';
import { CandidateGapAnalysisPage } from '../../identity/pages/role-homes/CandidateGapAnalysisPage';
import { GapAnalysisSection } from './GapAnalysisSection';
import { ApiError } from '../../../shared/api/auth';
import * as api from '../api/gapAnalysis';
import type { GapAnalysisResponse, GapTarget, TargetPosition } from '../types';

const POSITIONS: TargetPosition[] = [
  {
    id: 1,
    code: 'JAVA_BACKEND_FRESHER',
    name: 'Java Backend Fresher',
    description: 'Backend Java',
  },
  {
    id: 2,
    code: 'FRONTEND_REACTJS_FRESHER',
    name: 'Frontend ReactJS Fresher',
    description: 'Frontend React',
  },
];

const JAVA_TARGET: GapTarget = {
  type: 'POSITION',
  id: 1,
  code: 'JAVA_BACKEND_FRESHER',
  name: 'Java Backend Fresher',
  description: 'Backend Java',
};

const JAVA_ANALYSIS: GapAnalysisResponse = {
  target: JAVA_TARGET,
  readiness: 71,
  items: [
    {
      skillId: 15,
      skillCode: 'CLEAN_CODE',
      skillName: 'Viết mã sạch & Tái cấu trúc',
      required: 60,
      current: 0,
      gap: 60,
      priority: 'HIGH',
    },
    {
      skillId: 9,
      skillCode: 'DOCKER',
      skillName: 'Đóng gói ứng dụng Docker',
      required: 60,
      current: 0,
      gap: 60,
      priority: 'HIGH',
    },
  ],
};

describe('GapAnalysisSection (DT-01)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'fetchTargetPositions').mockResolvedValue(POSITIONS);
  });

  it('prompts the candidate to choose a position when no target is saved', async () => {
    vi.spyOn(api, 'fetchMyTarget').mockRejectedValue(
      new ApiError(404, 'Chưa chọn vị trí hoặc JD mục tiêu', 'NOT_FOUND'),
    );
    const gapSpy = vi.spyOn(api, 'fetchGapAnalysis');

    render(<GapAnalysisSection />);

    expect(
      await screen.findByText(/Chọn một vị trí mục tiêu để xem khoảng thiếu hụt năng lực/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Vị trí mục tiêu/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('combobox', { name: /Vị trí mục tiêu/i }));
    expect(screen.getByRole('option', { name: 'Java Backend Fresher' })).toBeInTheDocument();
    expect(gapSpy).not.toHaveBeenCalled();
  });

  it('renders readiness and the missing-skill table for the saved position target', async () => {
    vi.spyOn(api, 'fetchMyTarget').mockResolvedValue(JAVA_TARGET);
    vi.spyOn(api, 'fetchGapAnalysis').mockResolvedValue(JAVA_ANALYSIS);

    render(<GapAnalysisSection />);

    expect(await screen.findByTestId('gap-readiness')).toHaveTextContent('Sẵn sàng 71%');
    expect(screen.getByTestId('gap-CLEAN_CODE')).toBeInTheDocument();
    expect(screen.getByTestId('gap-DOCKER')).toBeInTheDocument();
    expect(screen.queryByTestId('gap-JAVA')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Vị trí mục tiêu/i })).toHaveTextContent(
      'Java Backend Fresher',
    );
    expect(screen.getAllByText('Cao', { selector: '.gap-priority' })).toHaveLength(2);
    expect(screen.getByRole('table', { name: 'Kỹ năng còn thiếu' })).toBeInTheDocument();
  });

  it('persists a new position target and refreshes the gap result', async () => {
    const frontendTarget: GapTarget = {
      type: 'POSITION',
      id: 2,
      code: 'FRONTEND_REACTJS_FRESHER',
      name: 'Frontend ReactJS Fresher',
      description: null,
    };
    const frontendAnalysis: GapAnalysisResponse = {
      target: frontendTarget,
      readiness: 60,
      items: [
        {
          skillId: 8,
          skillCode: 'REACTJS',
          skillName: 'Thư viện ReactJS',
          required: 70,
          current: 0,
          gap: 70,
          priority: 'HIGH',
        },
      ],
    };

    vi.spyOn(api, 'fetchMyTarget').mockResolvedValue(JAVA_TARGET);
    vi.spyOn(api, 'fetchGapAnalysis')
      .mockResolvedValueOnce(JAVA_ANALYSIS)
      .mockResolvedValueOnce(frontendAnalysis);
    const setTargetSpy = vi.spyOn(api, 'setMyTarget').mockResolvedValue(frontendTarget);

    render(<GapAnalysisSection />);

    expect(await screen.findByTestId('gap-CLEAN_CODE')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('combobox', { name: /Vị trí mục tiêu/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Frontend ReactJS Fresher' }));

    await waitFor(() => {
      expect(setTargetSpy).toHaveBeenCalledWith({ positionId: 2 });
    });
    expect(await screen.findByTestId('gap-REACTJS')).toBeInTheDocument();
    expect(screen.getByTestId('gap-readiness')).toHaveTextContent('Sẵn sàng 60%');
    expect(screen.queryByTestId('gap-CLEAN_CODE')).not.toBeInTheDocument();
  });

  it('shows a JD target selected from the JD detail screen', async () => {
    const jobTarget: GapTarget = {
      type: 'JOB',
      id: 7,
      code: null,
      name: 'Kỹ sư Java Backend',
      description: 'Mô tả JD',
    };
    vi.spyOn(api, 'fetchMyTarget').mockResolvedValue(jobTarget);
    vi.spyOn(api, 'fetchGapAnalysis').mockResolvedValue({
      target: jobTarget,
      readiness: 100,
      items: [],
    });

    render(<GapAnalysisSection />);

    expect(await screen.findByText(/JD: Kỹ sư Java Backend/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Bạn đã đáp ứng toàn bộ kỹ năng của mục tiêu này/i),
    ).toBeInTheDocument();
  });

  it('shows an error state with retry CTA when the catalogue cannot be loaded and recovers on retry', async () => {
    vi.spyOn(api, 'fetchTargetPositions')
      .mockRejectedValueOnce(new ApiError(500, 'Máy chủ gặp sự cố', 'INTERNAL_SERVER_ERROR'))
      .mockResolvedValueOnce(POSITIONS);
    vi.spyOn(api, 'fetchMyTarget').mockResolvedValue(JAVA_TARGET);
    vi.spyOn(api, 'fetchGapAnalysis').mockResolvedValue(JAVA_ANALYSIS);

    render(<GapAnalysisSection />);

    const loadingStatus = screen.getByRole('status', { name: /Đang tải dữ liệu mục tiêu/i });
    expect(loadingStatus).toHaveAttribute('aria-busy', 'true');

    expect(await screen.findByRole('alert')).toHaveTextContent(/Máy chủ gặp sự cố/i);
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/i }));

    expect(await screen.findByTestId('gap-readiness')).toHaveTextContent('Sẵn sàng 71%');
  });

  it('shows analyzing skeleton instead of empty prompt when retrying a failed initial target selection', async () => {
    vi.spyOn(api, 'fetchMyTarget').mockRejectedValue(
      new ApiError(404, 'Chưa chọn vị trí hoặc JD mục tiêu', 'NOT_FOUND'),
    );

    let resolveRetryTarget!: (value: GapTarget) => void;
    vi.spyOn(api, 'setMyTarget')
      .mockRejectedValueOnce(new ApiError(500, 'Không thể lưu mục tiêu', 'INTERNAL_SERVER_ERROR'))
      .mockImplementationOnce(
        () =>
          new Promise<GapTarget>((resolve) => {
            resolveRetryTarget = resolve;
          }),
      );
    vi.spyOn(api, 'fetchGapAnalysis').mockResolvedValue(JAVA_ANALYSIS);

    render(<GapAnalysisSection />);

    expect(
      await screen.findByText(/Chọn một vị trí mục tiêu để xem khoảng thiếu hụt năng lực/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('combobox', { name: /Vị trí mục tiêu/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Java Backend Fresher' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Không thể lưu mục tiêu/i);

    fireEvent.click(screen.getByRole('button', { name: /Thử lại/i }));

    const analyzingStatus = screen.getByRole('status', {
      name: /Đang tính toán khoảng thiếu hụt/i,
    });
    expect(analyzingStatus).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.queryByText(/Chọn một vị trí mục tiêu để xem khoảng thiếu hụt năng lực/i),
    ).not.toBeInTheDocument();

    resolveRetryTarget(JAVA_TARGET);

    expect(await screen.findByTestId('gap-readiness')).toHaveTextContent('Sẵn sàng 71%');
    expect(screen.getByTestId('gap-CLEAN_CODE')).toBeInTheDocument();
  });

  it('renders exactly one h1 on CandidateGapAnalysisPage', async () => {
    vi.spyOn(api, 'fetchMyTarget').mockResolvedValue(JAVA_TARGET);
    vi.spyOn(api, 'fetchGapAnalysis').mockResolvedValue(JAVA_ANALYSIS);

    render(
      <AuthProvider
        initialToken="token"
        initialUser={{
          id: 1,
          email: 'candidate@rikkei.vn',
          fullName: 'Nguyễn Văn An',
          role: 'CANDIDATE',
          companyId: null,
          lmsUserId: 'lms-sv-001',
          status: 'ACTIVE',
          mustChangePassword: false,
        }}
      >
        <MemoryRouter>
          <CandidateGapAnalysisPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const h1s = await screen.findAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Phân tích khoảng thiếu hụt năng lực');
  });
});
