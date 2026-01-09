import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import type { UserRole } from "@shared/models/auth";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, redirectTo = "/" }: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return null;
  }

  const userRole = (user?.role as UserRole) || 'ceo';
  
  if (!allowedRoles.includes(userRole)) {
    return <Redirect to={redirectTo} />;
  }

  return <>{children}</>;
}

export function hasRole(userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean {
  const role = userRole || 'ceo';
  return allowedRoles.includes(role);
}
