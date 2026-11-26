import { createContext, useContext } from 'react';
import type { IconName } from '../../../shared/components/Icon';

export interface RoleShellVisuals {
  readonly badgeClass: string;
  readonly icon: IconName;
  readonly density: 'airy' | 'dense';
}

export function getRoleShellVisuals(role?: string | null): RoleShellVisuals {
  const normalized = typeof role === 'string' ? role.trim().toUpperCase() : '';
  switch (normalized) {
    case 'CANDIDATE':
      return { badgeClass: 'rj-role-candidate', icon: 'user', density: 'airy' };
    case 'HR':
      return { badgeClass: 'rj-role-hr', icon: 'building', density: 'dense' };
    case 'MENTOR':
      return { badgeClass: 'rj-role-mentor', icon: 'graduation-cap', density: 'airy' };
    case 'STAFF':
      return { badgeClass: 'rj-role-staff', icon: 'briefcase', density: 'dense' };
    case 'ADMIN':
      return { badgeClass: 'rj-role-admin', icon: 'shield', density: 'dense' };
    default:
      return { badgeClass: 'rj-role-unknown', icon: 'shield', density: 'dense' };
  }
}

export const RoleShellContext = createContext<boolean>(false);

export function useIsInsidePersistentShell(): boolean {
  return useContext(RoleShellContext);
}
