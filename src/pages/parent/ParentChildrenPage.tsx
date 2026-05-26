import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Trophy,
  Flame,
  ChevronRight,
  BookOpen,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Shimmer from "@/components/shared/Shimmer";
import { NoLinkedStudents } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedChildren } from "@/hooks/useParentDashboard";

const ParentChildrenPage = () => {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const { data: children, isLoading } = useLinkedChildren(user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("parent.children.title", "My Children")}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t(
            "parent.children.subtitle",
            "View progress, gamification, and recent activity for each linked child."
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Shimmer className="h-48 rounded-xl" />
          <Shimmer className="h-48 rounded-xl" />
        </div>
      ) : !children || children.length === 0 ? (
        <NoLinkedStudents />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((child) => (
            <Link
              key={child.student_id}
              to={`/parent/planner/${child.student_id}`}
              className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
            >
              <Card className="bg-white border-0 shadow-md rounded-xl p-6 h-full hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-white">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-foreground">
                        {child.student_name}
                      </h2>
                      <Badge variant="outline" className="text-[10px] font-bold mt-1">
                        {t("parent.children.level", "Level")} {child.current_level}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors rtl:rotate-180" />
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <p className="text-[9px] font-bold tracking-widest uppercase text-gray-500">
                        {t("parent.children.xp", "XP")}
                      </p>
                    </div>
                    <p className="text-sm font-black text-gray-900 dark:text-foreground">
                      {child.xp_total.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                      <p className="text-[9px] font-bold tracking-widest uppercase text-gray-500">
                        {t("parent.children.streak", "Streak")}
                      </p>
                    </div>
                    <p className="text-sm font-black text-gray-900 dark:text-foreground">
                      {child.current_streak}d
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                      <p className="text-[9px] font-bold tracking-widest uppercase text-gray-500">
                        {t("parent.children.courses", "Courses")}
                      </p>
                    </div>
                    <p className="text-sm font-black text-gray-900 dark:text-foreground">
                      {child.enrolled_courses}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParentChildrenPage;
