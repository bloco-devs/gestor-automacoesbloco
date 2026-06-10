import { Navigate, useLocation } from "react-router-dom";
import { isPasswordRecoveryIntent } from "@/lib/auth-recovery";

/** Redirects any route to /redefinir-senha while a password recovery is in progress. */
export function RecoveryGuard() {
  const location = useLocation();

  if (location.pathname.startsWith("/redefinir-senha")) {
    return null;
  }

  const recovery = isPasswordRecoveryIntent({
    pathname: location.pathname,
    hash: location.hash,
    search: location.search,
  });

  if (!recovery) {
    return null;
  }

  return <Navigate to={`/redefinir-senha${location.search}${location.hash}`} replace />;
}
