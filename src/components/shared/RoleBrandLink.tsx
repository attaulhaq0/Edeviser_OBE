import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "@/design-system/hawdex/primitives";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/app";

const dashboardRouteByRole: Record<UserRole, string> = {
  admin: "/admin",
  coordinator: "/coordinator",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

/** One brand/destination contract, placed in the mobile header or desktop sidebar. */
const RoleBrandLink = ({ userRole, className }: { userRole: UserRole; className?: string }) => {
  const { t } = useTranslation("common");
  return (
    <Link
      to={dashboardRouteByRole[userRole] ?? "/student"}
      aria-label={t("header.dashboardLink")}
      className={cn("flex min-h-11 min-w-11 items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", className)}
    >
      <Logo size={36} />
      <span className="hidden min-[400px]:inline font-branding font-extrabold text-lg tracking-tight text-foreground">
        Edeviser
      </span>
    </Link>
  );
};

export default RoleBrandLink;
