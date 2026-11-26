import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/auth';
import { resetMotionRegistry } from '../../../shared/utils/motion';
import { AuthProvider } from '../../identity/context/AuthContext';
import type { UserDto } from '../../identity/types';
import { recruitmentApi } from '../api/recruitmentApi';
import { StaffApplicationsPage } from '../pages/StaffApplicationsPage';
import type { StaffApplicationSummaryResponse } from '../types';

const staffUser: UserDto = {
  id: 5,
  email: 'staff1@rikkeijobs.test',
  fullName: 'Phạm Thu Hà',
  role: 'STAFF',
  companyId: null,
  status: 'ACTIVE',
  mustChangePassword: false,
};

const sampleStaffApps: readonly StaffApplicationSummaryResponse[] = [
  {
    id: 301,
    jobId: 12,
    jobTitle: 'Backend Java Developer',
    companyId: 2,
    companyName: 'Rikkei Digital',
    candidateUserId: 15,
    candidateName: 'Nguyễn Văn An',
    candidateEmail: 'an@rikkeijobs.test',
    status: 'INTERVIEW',
    roundCount: 2,
    matchScore: 88,
    createdAt: '2026-11-12T08:00:00Z',
    updatedAt: '2026-11-15T10:00:00Z',
  },
];

const LocationEcho = () => {
  const location = useLocation();
  return <div data-testid="staff-location-echo">{location.pathname}</div>;
};

describe('StaffApplicationsPage', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetMotionRegistry();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    const actWarnings = consoleErrorSpy.mock.calls
      .map((args: unknown[]) => args.map(String).join(' '))
      .filter((msg: string) => /act\(/i.test(msg) || /not wrapped in act/i.test(msg));
    expect(actWarnings).toEqual([]);
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('loads 1-based page=1 size=20 with single h1, ellipsis cells, and localized labels', async () => {
    const listSpy = vi.spyOn(recruitmentApi, 'listStaffApplications').mockResolvedValueOnce({
      items: sampleStaffApps,
      page: 1,
      size: 20,
      totalItems: 22,
      totalPages: 2,
    });

    const { container } = render(
      <AuthProvider initialToken="jwt" initialUser={staffUser}>
        <MemoryRouter initialEntries={['/staff/applications']}>
          <Routes>
            <Route path="/staff/applications" element={<StaffApplicationsPage />} />
            <Route path="/staff/applications/:id" element={<LocationEcho />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    const main = container.querySelector('main') as HTMLElement;
    expect(within(main).getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(await within(main).findByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(within(main).getByText('Nguyễn Văn An')).toHaveClass('rec-cell-ellipsis');
    expect(within(main).getByText('Nguyễn Văn An')).toHaveAttribute('title', 'Nguyễn Văn An');
    expect(within(main).getByText('an@rikkeijobs.test')).toHaveClass('rec-cell-ellipsis');
    expect(within(main).getByText('an@rikkeijobs.test')).toHaveAttribute(
      'title',
      'an@rikkeijobs.test',
    );
    expect(within(main).getByText('Backend Java Developer')).toHaveClass('rec-cell-ellipsis');
    expect(within(main).getByText('Backend Java Developer')).toHaveAttribute(
      'title',
      'Backend Java Developer',
    );
    expect(within(main).getByText('Rikkei Digital')).toHaveClass('rec-cell-ellipsis');
    expect(within(main).getByText('Rikkei Digital')).toHaveAttribute('title', 'Rikkei Digital');
    expect(within(main).getByText('88%')).toBeInTheDocument();
    expect(within(main).getByText('2 vòng')).toBeInTheDocument();
    expect(within(main).getByText('Trang 1 / 2')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\b(STAFF|INTERVIEW)\b/);

    expect(listSpy).toHaveBeenNthCalledWith(
      1,
      { companyId: undefined, jobId: undefined, status: '', page: 1, size: 20 },
      expect.any(AbortSignal),
    );
  });

  it('validates positive numeric filters and blocks invalid submit', async () => {
    const listSpy = vi.spyOn(recruitmentApi, 'listStaffApplications').mockResolvedValueOnce({
      items: sampleStaffApps,
      page: 1,
      size: 20,
      totalItems: 22,
      totalPages: 2,
    });

    const { container } = render(
      <AuthProvider initialToken="jwt" initialUser={staffUser}>
        <MemoryRouter initialEntries={['/staff/applications']}>
          <StaffApplicationsPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const form = container.querySelector('form') as HTMLElement;
    const companyInput = within(form).getByLabelText('Mã doanh nghiệp');
    fireEvent.change(companyInput, { target: { value: '0' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Lọc' }));
    expect(
      await within(form).findByText('Mã doanh nghiệp phải là số nguyên dương.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('submits numeric and status filters and resets back to page 1', async () => {
    const listSpy = vi
      .spyOn(recruitmentApi, 'listStaffApplications')
      .mockResolvedValueOnce({
        items: sampleStaffApps,
        page: 1,
        size: 20,
        totalItems: 22,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: sampleStaffApps,
        page: 1,
        size: 20,
        totalItems: 1,
        totalPages: 1,
      })
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        size: 20,
        totalItems: 0,
        totalPages: 0,
      });

    const { container } = render(
      <AuthProvider initialToken="jwt" initialUser={staffUser}>
        <MemoryRouter initialEntries={['/staff/applications']}>
          <StaffApplicationsPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const main = container.querySelector('main') as HTMLElement;
    const form = container.querySelector('form') as HTMLElement;
    expect(await within(main).findByText('Nguyễn Văn An')).toBeInTheDocument();

    fireEvent.change(within(form).getByLabelText('Mã doanh nghiệp'), { target: { value: '2' } });
    fireEvent.change(within(form).getByLabelText('Mã vị trí'), { target: { value: '12' } });
    fireEvent.click(within(form).getByRole('combobox', { name: /Trạng thái xử lý/i }));
    const listbox = screen.getByRole('listbox');
    fireEvent.click(within(listbox).getByRole('option', { name: 'Phỏng vấn' }));
    fireEvent.click(within(form).getByRole('button', { name: 'Lọc' }));

    await waitFor(() => {
      expect(listSpy).toHaveBeenNthCalledWith(
        2,
        { companyId: 2, jobId: 12, status: 'INTERVIEW', page: 1, size: 20 },
        expect.any(AbortSignal),
      );
    });

    fireEvent.click(within(form).getByRole('button', { name: 'Đặt lại' }));
    await waitFor(() => {
      expect(listSpy).toHaveBeenNthCalledWith(
        3,
        { companyId: undefined, jobId: undefined, status: '', page: 1, size: 20 },
        expect.any(AbortSignal),
      );
    });
    expect(await within(main).findByText('Chưa có hồ sơ ứng tuyển nào')).toBeInTheDocument();
  });

  it('paginates across pages cleanly', async () => {
    const listSpy = vi
      .spyOn(recruitmentApi, 'listStaffApplications')
      .mockResolvedValueOnce({
        items: sampleStaffApps,
        page: 1,
        size: 20,
        totalItems: 22,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: [{ ...sampleStaffApps[0], id: 302, candidateName: 'Lê Thị Hoa' }],
        page: 2,
        size: 20,
        totalItems: 22,
        totalPages: 2,
      });

    const { container } = render(
      <AuthProvider initialToken="jwt" initialUser={staffUser}>
        <MemoryRouter initialEntries={['/staff/applications']}>
          <StaffApplicationsPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const main = container.querySelector('main') as HTMLElement;
    expect(await within(main).findByText('Trang 1 / 2')).toBeInTheDocument();
    fireEvent.click(within(main).getByRole('button', { name: /Trang sau/i }));

    await waitFor(() => {
      expect(listSpy).toHaveBeenNthCalledWith(
        2,
        { companyId: undefined, jobId: undefined, status: '', page: 2, size: 20 },
        expect.any(AbortSignal),
      );
    });
    expect(await within(main).findByText('Lê Thị Hoa')).toBeInTheDocument();
    expect(within(main).getByText('Trang 2 / 2')).toBeInTheDocument();
  });

  it('retries on error and navigates to /staff/applications/:id when clicking a row', async () => {
    vi.spyOn(recruitmentApi, 'listStaffApplications')
      .mockRejectedValueOnce(new ApiError(403, 'forbidden', 'FORBIDDEN'))
      .mockResolvedValueOnce({
        items: sampleStaffApps,
        page: 1,
        size: 20,
        totalItems: 1,
        totalPages: 1,
      });

    const { container } = render(
      <AuthProvider initialToken="jwt" initialUser={staffUser}>
        <MemoryRouter initialEntries={['/staff/applications']}>
          <Routes>
            <Route path="/staff/applications" element={<StaffApplicationsPage />} />
            <Route path="/staff/applications/:id" element={<LocationEcho />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    const main = container.querySelector('main') as HTMLElement;
    expect(await within(main).findByRole('alert')).toBeInTheDocument();
    fireEvent.click(within(main).getByRole('button', { name: /Thử lại/i }));

    const rowName = await within(main).findByText('Nguyễn Văn An');
    fireEvent.click(rowName.closest('tr')!);
    expect(await screen.findByTestId('staff-location-echo')).toHaveTextContent(
      '/staff/applications/301',
    );
  });

  it('aborts pending request on unmount while loading', async () => {
    const abortSignals: AbortSignal[] = [];
    vi.spyOn(recruitmentApi, 'listStaffApplications').mockImplementationOnce((_params, signal) => {
      if (signal) {
        abortSignals.push(signal);
      }
      return new Promise(() => {});
    });

    const { unmount } = render(
      <AuthProvider initialToken="jwt" initialUser={staffUser}>
        <MemoryRouter initialEntries={['/staff/applications']}>
          <StaffApplicationsPage />
        </MemoryRouter>
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(abortSignals).toHaveLength(1);
    });
    expect(abortSignals[0].aborted).toBe(false);
    unmount();
    expect(abortSignals[0].aborted).toBe(true);
  });
});
