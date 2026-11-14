import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { CandidateHomePage } from '../pages/role-homes/CandidateHomePage';
import { HrHomePage } from '../pages/role-homes/HrHomePage';
import { MentorHomePage } from '../pages/role-homes/MentorHomePage';
import { StaffHomePage } from '../pages/role-homes/StaffHomePage';
import { AdminHomePage } from '../pages/role-homes/AdminHomePage';
import { type UserDto } from '../types';

describe('Role Home Pages', () => {
  const createUser = (role: string, fullName: string): UserDto => ({
    id: 100,
    email: `${role.toLowerCase()}@rikkei.vn`,
    fullName,
    role,
    companyId: role === 'HR' ? 42 : null,
    status: 'ACTIVE',
    mustChangePassword: false,
  });

  it('renders CandidateHomePage with user information', () => {
    const user = createUser('CANDIDATE', 'Nguyen Candidate');
    render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <CandidateHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Chào mừng, Nguyen Candidate!/i)).toBeInTheDocument();
    expect(screen.getAllByText('CANDIDATE').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Hồ Sơ Tuyển Dụng')).toBeInTheDocument();
  });

  it('renders HrHomePage with company ID', () => {
    const user = createUser('HR', 'Tran Thi HR');
    render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <HrHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Chào mừng, Tran Thi HR!/i)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Đăng Tin Tuyển Dụng')).toBeInTheDocument();
  });

  it('renders MentorHomePage', () => {
    const user = createUser('MENTOR', 'Thay Giao Mentor');
    render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <MentorHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Chào mừng, Thay Giao Mentor!/i)).toBeInTheDocument();
    expect(screen.getByText('Đánh Giá Ứng Viên')).toBeInTheDocument();
  });

  it('renders StaffHomePage', () => {
    const user = createUser('STAFF', 'Co Giao Staff');
    render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <StaffHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Chào mừng, Co Giao Staff!/i)).toBeInTheDocument();
    expect(screen.getByText('Tiếp Nhận & Điều Phối')).toBeInTheDocument();
  });

  it('renders AdminHomePage', () => {
    const user = createUser('ADMIN', 'Super Admin');
    render(
      <AuthProvider initialToken="token" initialUser={user}>
        <MemoryRouter>
          <AdminHomePage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText(/Chào mừng, Super Admin!/i)).toBeInTheDocument();
    expect(screen.getByText('Quản Trị Người Dùng & Phân Quyền')).toBeInTheDocument();
  });
});
