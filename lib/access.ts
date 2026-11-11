export type Role = "ADMIN" | "STUDENT";

export function canAccessRole(userRole: Role, requiredRole: Role) {
  return userRole === "ADMIN" || userRole === requiredRole;
}
