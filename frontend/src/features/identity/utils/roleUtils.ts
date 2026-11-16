export const getRoleHomePath = (role?: string): string => {
  switch (role) {
    case 'CANDIDATE':
      return '/candidate';
    case 'HR':
      return '/hr';
    case 'MENTOR':
      return '/mentor';
    case 'STAFF':
      return '/staff';
    case 'ADMIN':
      return '/admin';
    default:
      return '/login';
  }
};
