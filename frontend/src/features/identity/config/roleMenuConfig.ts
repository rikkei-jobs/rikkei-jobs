import type { IconName } from '../../../shared/components/Icon';
import type { UserRole } from '../types';

export interface RoleMenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  readonly path?: string;
  readonly disabled?: boolean;
  readonly comingSoonLabel?: string;
}

export const ROLE_MENU_CONFIG: Readonly<Record<UserRole, readonly RoleMenuItem[]>> = {
  CANDIDATE: [
    {
      id: 'candidate-skills',
      label: 'Hồ sơ',
      path: '/candidate/skills',
      icon: 'user',
    },
    {
      id: 'candidate-jobs',
      label: 'Việc làm',
      path: '/candidate/jobs',
      icon: 'briefcase',
    },
    {
      id: 'candidate-applications',
      label: 'Ứng tuyển',
      path: '/candidate/applications',
      icon: 'file-check',
    },
    {
      id: 'candidate-gap',
      label: 'Lộ trình',
      path: '/candidate/gap-analysis',
      icon: 'sparkles',
    },
    {
      id: 'candidate-internships',
      label: 'Thực tập IOC',
      path: '/candidate/internships',
      icon: 'graduation-cap',
    },
    {
      id: 'candidate-ai',
      label: 'Trợ lý AI',
      icon: 'network',
      disabled: true,
      comingSoonLabel: 'Sắp ra mắt',
    },
  ],
  HR: [
    {
      id: 'hr-company',
      label: 'Công ty',
      path: '/hr/company',
      icon: 'building',
    },
    {
      id: 'hr-jd',
      label: 'JD',
      icon: 'briefcase',
      disabled: true,
      comingSoonLabel: 'Sắp ra mắt',
    },
    {
      id: 'hr-recruitment',
      label: 'Tuyển dụng',
      path: '/hr/recruitment',
      icon: 'user-check',
    },
    {
      id: 'hr-interns',
      label: 'Thực tập sinh',
      icon: 'graduation-cap',
      disabled: true,
      comingSoonLabel: 'Sắp ra mắt',
    },
  ],
  MENTOR: [
    {
      id: 'mentor-evaluations',
      label: 'Cần đánh giá',
      icon: 'badge-check',
      path: '/mentor/evaluations',
    },
  ],
  STAFF: [
    {
      id: 'staff-applications',
      label: 'Hồ sơ ứng tuyển',
      path: '/staff/applications',
      icon: 'file-text',
    },
    {
      id: 'staff-profiles',
      label: 'Duyệt hồ sơ',
      icon: 'user-check',
      disabled: true,
      comingSoonLabel: 'Sắp ra mắt',
    },
    {
      id: 'staff-jds',
      label: 'Duyệt JD',
      icon: 'file-check',
      disabled: true,
      comingSoonLabel: 'Sắp ra mắt',
    },
    {
      id: 'staff-companies',
      label: 'Doanh nghiệp',
      icon: 'building',
      disabled: true,
      comingSoonLabel: 'Sắp ra mắt',
    },
    {
      id: 'staff-matching',
      label: 'Ghép thực tập',
      icon: 'network',
      disabled: true,
      comingSoonLabel: 'Sắp ra mắt',
    },
    {
      id: 'staff-reports',
      label: 'Báo cáo',
      icon: 'badge-check',
      disabled: true,
      comingSoonLabel: 'Sắp ra mắt',
    },
  ],
  ADMIN: [
    { id: 'admin-ai-config', label: 'Cấu hình AI', path: '/admin/ai-config', icon: 'shield-check' },
    { id: 'admin-ai-logs', label: 'Nhật ký AI', path: '/admin/ai-logs', icon: 'clock' },
    {
      id: 'admin-portal',
      label: 'Quản trị',
      icon: 'shield-check',
      disabled: true,
      comingSoonLabel: 'Sắp ra mắt',
    },
  ],
};

export function getRoleMenuItems(role?: string | null): readonly RoleMenuItem[] {
  if (typeof role !== 'string') {
    return [];
  }
  const normalized = role.trim().toUpperCase();
  if (normalized in ROLE_MENU_CONFIG) {
    return ROLE_MENU_CONFIG[normalized as UserRole];
  }
  return [];
}
