export const UserRole = {
  USER: 'user',
  HOST: 'host',
  ADMIN: 'admin'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];