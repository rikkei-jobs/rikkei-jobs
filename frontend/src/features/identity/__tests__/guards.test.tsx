import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../context/useAuth';
import { RequireAuth } from '../guards/RequireAuth';
import { RequireChangePasswordAccess } from '../guards/RequireChangePasswordAccess';
import { RequireMustChangePassword } from '../guards/RequireMustChangePassword';
import { RequireRole } from '../guards/RequireRole';
import { type UserDto } from '../types';

const LoginStateProbe: React.FC = () => {
  const location = useLocation();
  return (
    <div>
      <div>Trang Dang Nhap</div>
      <div data-testid="login-location-state">{JSON.stringify(location.state)}</div>
    </div>
  );
};

const LogoutAction: React.FC<{ label: string }> = ({ label }) => {
  const { logout } = useAuth();
  return (
    <div>
      <div>{label}</div>
      <button type="button" onClick={() => logout()}>
        Dang Xuat Guard
      </button>
    </div>
  );
};

describe('Route Guards', () => {
  const activeUser: UserDto = {
    id: 1,
    email: 'hr1@rikkei.vn',
    fullName: 'HR Test',
    role: 'HR',
    companyId: 5,
    status: 'ACTIVE',
    mustChangePassword: false,
  };

  const mustChangeUser: UserDto = {
    ...activeUser,
    mustChangePassword: true,
  };

  describe('RequireAuth', () => {
    it('redirects to /login when user is unauthenticated', () => {
      render(
        <AuthProvider initialToken={null} initialUser={null}>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route path="/login" element={<div>Trang Dang Nhap</div>} />
              <Route
                path="/protected"
                element={
                  <RequireAuth>
                    <div>Noi Dung Bao Ve</div>
                  </RequireAuth>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Trang Dang Nhap')).toBeInTheDocument();
      expect(screen.queryByText('Noi Dung Bao Ve')).not.toBeInTheDocument();
    });

    it('redirects to /change-password when user must change password', () => {
      render(
        <AuthProvider initialToken="valid-token" initialUser={mustChangeUser}>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route path="/change-password" element={<div>Trang Doi Mat Khau</div>} />
              <Route
                path="/protected"
                element={
                  <RequireAuth>
                    <div>Noi Dung Bao Ve</div>
                  </RequireAuth>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Trang Doi Mat Khau')).toBeInTheDocument();
      expect(screen.queryByText('Noi Dung Bao Ve')).not.toBeInTheDocument();
    });

    it('renders protected child when authenticated and password change not required', () => {
      render(
        <AuthProvider initialToken="valid-token" initialUser={activeUser}>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route
                path="/protected"
                element={
                  <RequireAuth>
                    <div>Noi Dung Bao Ve</div>
                  </RequireAuth>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Noi Dung Bao Ve')).toBeInTheDocument();
    });
    it('preserves state.from on /login when unauthenticated without explicit logout and clears it when isExplicitLogout is true', () => {
      const { unmount } = render(
        <AuthProvider initialToken={null} initialUser={null}>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route path="/login" element={<LoginStateProbe />} />
              <Route
                path="/protected"
                element={
                  <RequireAuth>
                    <div>Noi Dung Bao Ve</div>
                  </RequireAuth>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(JSON.parse(screen.getByTestId('login-location-state').textContent || 'null')).toMatchObject({
        from: { pathname: '/protected' },
      });
      unmount();

      render(
        <AuthProvider initialToken="valid-token" initialUser={activeUser}>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route path="/login" element={<LoginStateProbe />} />
              <Route
                path="/protected"
                element={
                  <RequireAuth>
                    <LogoutAction label="Noi Dung Bao Ve" />
                  </RequireAuth>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Dang Xuat Guard' }));
      expect(screen.getByText('Trang Dang Nhap')).toBeInTheDocument();
      expect(screen.getByTestId('login-location-state')).toHaveTextContent('null');
    });

    it('preserves state.from when unauthenticated on /403 and passes state=null on excluded paths', () => {
      const { unmount } = render(
        <AuthProvider initialToken={null} initialUser={null}>
          <MemoryRouter initialEntries={['/403?mockRole=HR']}>
            <Routes>
              <Route path="/login" element={<LoginStateProbe />} />
              <Route
                path="/403"
                element={
                  <RequireAuth>
                    <div>Trang Cam Truy Cap</div>
                  </RequireAuth>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Trang Dang Nhap')).toBeInTheDocument();
      expect(JSON.parse(screen.getByTestId('login-location-state').textContent || 'null')).toMatchObject({
        from: { pathname: '/403', search: '?mockRole=HR' },
      });
      unmount();

      render(
        <AuthProvider initialToken={null} initialUser={null}>
          <MemoryRouter initialEntries={['/reset-password/abc-token']}>
            <Routes>
              <Route path="/login" element={<LoginStateProbe />} />
              <Route
                path="/reset-password/:token"
                element={
                  <RequireAuth>
                    <div>Dat Lai Mat Khau</div>
                  </RequireAuth>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Trang Dang Nhap')).toBeInTheDocument();
      expect(screen.getByTestId('login-location-state')).toHaveTextContent('null');
    });
  });

  describe('RequireMustChangePassword', () => {
    it('redirects to /login with state=null when unauthenticated', () => {
      render(
        <AuthProvider initialToken={null} initialUser={null}>
          <MemoryRouter
            initialEntries={[
              { pathname: '/change-password', state: { from: { pathname: '/hr/company' } } },
            ]}
          >
            <Routes>
              <Route path="/login" element={<LoginStateProbe />} />
              <Route
                path="/change-password"
                element={
                  <RequireMustChangePassword>
                    <div>Form Doi Mat Khau</div>
                  </RequireMustChangePassword>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Trang Dang Nhap')).toBeInTheDocument();
      expect(screen.getByTestId('login-location-state')).toHaveTextContent('null');
    });

    it('preserves allowed state.from and ignores disallowed state.from when mustChangePassword is false', () => {
      const { unmount } = render(
        <AuthProvider initialToken="valid-token" initialUser={activeUser}>
          <MemoryRouter
            initialEntries={[
              { pathname: '/change-password', state: { from: { pathname: '/hr/company' } } },
            ]}
          >
            <Routes>
              <Route path="/hr" element={<div>Trang Chu HR</div>} />
              <Route path="/hr/company" element={<div>Ho So Cong Ty HR</div>} />
              <Route
                path="/change-password"
                element={
                  <RequireMustChangePassword>
                    <div>Form Doi Mat Khau</div>
                  </RequireMustChangePassword>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Ho So Cong Ty HR')).toBeInTheDocument();
      unmount();

      render(
        <AuthProvider initialToken="valid-token" initialUser={activeUser}>
          <MemoryRouter
            initialEntries={[
              { pathname: '/change-password', state: { from: { pathname: '/admin' } } },
            ]}
          >
            <Routes>
              <Route path="/hr" element={<div>Trang Chu HR</div>} />
              <Route path="/admin" element={<div>Khu Vuc Admin</div>} />
              <Route
                path="/change-password"
                element={
                  <RequireMustChangePassword>
                    <div>Form Doi Mat Khau</div>
                  </RequireMustChangePassword>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Trang Chu HR')).toBeInTheDocument();
      expect(screen.queryByText('Khu Vuc Admin')).not.toBeInTheDocument();
    });

    it('redirects to role home when user does NOT need to change password', () => {
      render(
        <AuthProvider initialToken="valid-token" initialUser={activeUser}>
          <MemoryRouter initialEntries={['/change-password']}>
            <Routes>
              <Route path="/hr" element={<div>Trang Chu HR</div>} />
              <Route
                path="/change-password"
                element={
                  <RequireMustChangePassword>
                    <div>Form Doi Mat Khau</div>
                  </RequireMustChangePassword>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Trang Chu HR')).toBeInTheDocument();
      expect(screen.queryByText('Form Doi Mat Khau')).not.toBeInTheDocument();
    });

    it('allows access to /change-password when user must change password', () => {
      render(
        <AuthProvider initialToken="valid-token" initialUser={mustChangeUser}>
          <MemoryRouter initialEntries={['/change-password']}>
            <Routes>
              <Route
                path="/change-password"
                element={
                  <RequireMustChangePassword>
                    <div>Form Doi Mat Khau Bat Buoc</div>
                  </RequireMustChangePassword>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Form Doi Mat Khau Bat Buoc')).toBeInTheDocument();
    });
  });

  describe('RequireChangePasswordAccess', () => {
    it('redirects unauthenticated user to /login with state=null', () => {
      render(
        <AuthProvider initialToken={null} initialUser={null}>
          <MemoryRouter initialEntries={['/change-password']}>
            <Routes>
              <Route path="/login" element={<LoginStateProbe />} />
              <Route
                path="/change-password"
                element={
                  <RequireChangePasswordAccess>
                    <div>Form Doi Mat Khau</div>
                  </RequireChangePasswordAccess>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Trang Dang Nhap')).toBeInTheDocument();
      expect(screen.getByTestId('login-location-state')).toHaveTextContent('null');
    });

    it('redirects LMS SSO user without mustChangePassword back to role home', () => {
      const lmsCandidate: UserDto = {
        id: 22,
        email: 'sv1@lms.rikkei.vn',
        fullName: 'LMS Candidate',
        role: 'CANDIDATE',
        companyId: null,
        lmsUserId: 'lms-sv-001',
        status: 'ACTIVE',
        mustChangePassword: false,
      };

      render(
        <AuthProvider initialToken="valid-token" initialUser={lmsCandidate}>
          <MemoryRouter initialEntries={['/change-password']}>
            <Routes>
              <Route path="/candidate" element={<div>Trang Chu Ung Vien</div>} />
              <Route
                path="/change-password"
                element={
                  <RequireChangePasswordAccess>
                    <div>Form Doi Mat Khau</div>
                  </RequireChangePasswordAccess>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Trang Chu Ung Vien')).toBeInTheDocument();
      expect(screen.queryByText('Form Doi Mat Khau')).not.toBeInTheDocument();
    });

    it('allows enterprise user with mustChangePassword=false to access /change-password voluntarily', () => {
      const hrVoluntary: UserDto = {
        ...activeUser,
        lmsUserId: null,
        mustChangePassword: false,
      };

      render(
        <AuthProvider initialToken="valid-token" initialUser={hrVoluntary}>
          <MemoryRouter initialEntries={['/change-password']}>
            <Routes>
              <Route path="/hr" element={<div>Trang Chu HR</div>} />
              <Route
                path="/change-password"
                element={
                  <RequireChangePasswordAccess>
                    <div>Form Doi Mat Khau Tu Nguyen</div>
                  </RequireChangePasswordAccess>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Form Doi Mat Khau Tu Nguyen')).toBeInTheDocument();
      expect(screen.queryByText('Trang Chu HR')).not.toBeInTheDocument();
    });

    it('allows user with mustChangePassword=true even when lmsUserId is present', () => {
      const forcedUser: UserDto = {
        ...mustChangeUser,
        lmsUserId: 'lms-forced-001',
      };

      render(
        <AuthProvider initialToken="valid-token" initialUser={forcedUser}>
          <MemoryRouter initialEntries={['/change-password']}>
            <Routes>
              <Route
                path="/change-password"
                element={
                  <RequireChangePasswordAccess>
                    <div>Form Doi Mat Khau Bat Buoc</div>
                  </RequireChangePasswordAccess>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Form Doi Mat Khau Bat Buoc')).toBeInTheDocument();
    });
  });

  describe('RequireRole', () => {
    it('redirects to /login when unauthenticated', () => {
      render(
        <AuthProvider initialToken={null} initialUser={null}>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route path="/login" element={<div>Trang Dang Nhap</div>} />
              <Route
                path="/admin"
                element={
                  <RequireRole allowedRoles={['ADMIN']}>
                    <div>Khu Vuc Admin</div>
                  </RequireRole>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Trang Dang Nhap')).toBeInTheDocument();
      expect(screen.queryByText('Khu Vuc Admin')).not.toBeInTheDocument();
    });

    it('redirects to /change-password when mustChangePassword is true', () => {
      render(
        <AuthProvider initialToken="valid-token" initialUser={mustChangeUser}>
          <MemoryRouter initialEntries={['/hr']}>
            <Routes>
              <Route path="/change-password" element={<div>Trang Doi Mat Khau</div>} />
              <Route
                path="/hr"
                element={
                  <RequireRole allowedRoles={['HR']}>
                    <div>Khu Vuc Doanh Nghiep HR</div>
                  </RequireRole>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Trang Doi Mat Khau')).toBeInTheDocument();
      expect(screen.queryByText('Khu Vuc Doanh Nghiep HR')).not.toBeInTheDocument();
    });

    it('renders Vietnamese 403 ForbiddenPage in-place when accessing unauthorized role route', () => {
      render(
        <AuthProvider initialToken="valid-token" initialUser={activeUser}>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route path="/hr" element={<div>Trang Chu HR</div>} />
              <Route
                path="/admin"
                element={
                  <RequireRole allowedRoles={['ADMIN']}>
                    <div>Khu Vuc Admin</div>
                  </RequireRole>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('403')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 1, name: /Bạn không có quyền truy cập trang này/i }),
      ).toBeInTheDocument();
      expect(within(screen.getByRole('main')).getByText('HR')).toBeInTheDocument();
      const homeLink = screen.getByRole('link', { name: /Quay lại trang chủ/i });
      expect(homeLink).toHaveAttribute('href', '/hr');
      expect(screen.queryByText('Khu Vuc Admin')).not.toBeInTheDocument();
      expect(screen.queryByText('Trang Chu HR')).not.toBeInTheDocument();
    });

    it('renders Vietnamese 403 ForbiddenPage with localized role label for CANDIDATE and fallback for unknown role', () => {
      const candidateUser: UserDto = {
        ...activeUser,
        role: 'CANDIDATE',
        companyId: null,
      };
      const { unmount } = render(
        <AuthProvider initialToken="valid-token" initialUser={candidateUser}>
          <MemoryRouter initialEntries={['/hr']}>
            <Routes>
              <Route
                path="/hr"
                element={
                  <RequireRole allowedRoles={['HR']}>
                    <div>Khu Vuc HR</div>
                  </RequireRole>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(within(screen.getByRole('main')).getByText('Ứng viên')).toBeInTheDocument();
      expect(screen.queryByText('CANDIDATE')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Quay lại trang chủ/i })).toHaveAttribute(
        'href',
        '/candidate',
      );
      expect(screen.queryByText('Khu Vuc HR')).not.toBeInTheDocument();
      unmount();

      const unknownRoleUser: UserDto = {
        ...activeUser,
        role: 'GUEST',
      };
      render(
        <AuthProvider initialToken="valid-token" initialUser={unknownRoleUser}>
          <MemoryRouter initialEntries={['/hr']}>
            <Routes>
              <Route
                path="/hr"
                element={
                  <RequireRole allowedRoles={['HR']}>
                    <div>Khu Vuc HR</div>
                  </RequireRole>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(within(screen.getByRole('main')).getByText('Không xác định')).toBeInTheDocument();
      expect(screen.queryByText('GUEST')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Quay lại trang chủ/i })).toHaveAttribute(
        'href',
        '/login',
      );
    });

    it('renders child component when user role matches allowed roles', () => {
      render(
        <AuthProvider initialToken="valid-token" initialUser={activeUser}>
          <MemoryRouter initialEntries={['/hr']}>
            <Routes>
              <Route
                path="/hr"
                element={
                  <RequireRole allowedRoles={['HR']}>
                    <div>Khu Vuc Doanh Nghiep HR</div>
                  </RequireRole>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Khu Vuc Doanh Nghiep HR')).toBeInTheDocument();
    });

    it('clears state.from on /login when RequireRole redirects during explicit logout', () => {
      render(
        <AuthProvider initialToken="valid-token" initialUser={activeUser}>
          <MemoryRouter initialEntries={['/hr/company']}>
            <Routes>
              <Route path="/login" element={<LoginStateProbe />} />
              <Route
                path="/hr/company"
                element={
                  <RequireRole allowedRoles={['HR']}>
                    <LogoutAction label="Ho So Cong Ty" />
                  </RequireRole>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Dang Xuat Guard' }));
      expect(screen.getByText('Trang Dang Nhap')).toBeInTheDocument();
      expect(screen.getByTestId('login-location-state')).toHaveTextContent('null');
    });

    it('passes state=null when RequireRole redirects unauthenticated user from an excluded path', () => {
      render(
        <AuthProvider initialToken={null} initialUser={null}>
          <MemoryRouter initialEntries={['/forgot-password']}>
            <Routes>
              <Route path="/login" element={<LoginStateProbe />} />
              <Route
                path="/forgot-password"
                element={
                  <RequireRole allowedRoles={['HR']}>
                    <div>Quen Mat Khau</div>
                  </RequireRole>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(screen.getByText('Trang Dang Nhap')).toBeInTheDocument();
      expect(screen.getByTestId('login-location-state')).toHaveTextContent('null');
    });
  });
});
