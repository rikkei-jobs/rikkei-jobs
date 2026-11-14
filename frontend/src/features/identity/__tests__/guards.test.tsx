import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { RequireAuth } from '../guards/RequireAuth';
import { RequireMustChangePassword } from '../guards/RequireMustChangePassword';
import { RequireRole } from '../guards/RequireRole';
import { type UserDto } from '../types';

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
  });

  describe('RequireMustChangePassword', () => {
    it('redirects to /login when unauthenticated', () => {
      render(
        <AuthProvider initialToken={null} initialUser={null}>
          <MemoryRouter initialEntries={['/change-password']}>
            <Routes>
              <Route path="/login" element={<div>Trang Dang Nhap</div>} />
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

  describe('RequireRole', () => {
    it('redirects user to own role home when accessing unauthorized role route', () => {
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

      expect(screen.getByText('Trang Chu HR')).toBeInTheDocument();
      expect(screen.queryByText('Khu Vuc Admin')).not.toBeInTheDocument();
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
  });
});
