// Task 92.2: Global search command palette (Cmd+K / Ctrl+K)
// Debounced input, results grouped by category

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGlobalSearch, type SearchResult } from "@/hooks/useGlobalSearch";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart3,
  BookOpen,
  Bot,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  Megaphone,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { UserRole } from "@/types/app";

const DEBOUNCE_MS = 300;

const categoryConfig: Record<
  SearchResult["type"],
  { label: string; icon: typeof BookOpen }
> = {
  course: { label: "Courses", icon: BookOpen },
  assignment: { label: "Assignments", icon: FileText },
  announcement: { label: "Announcements", icon: Megaphone },
};

interface SearchCommandProps {
  showTrigger?: boolean;
}

interface RoleCommand {
  section: "goTo" | "actions";
  labelKey: string;
  to: string;
  icon: typeof Search;
}

const commandsByRole: Record<UserRole, RoleCommand[]> = {
  student: [
    {
      section: "goTo",
      labelKey: "header.commands.today",
      to: "/student/dashboard",
      icon: LayoutDashboard,
    },
    {
      section: "goTo",
      labelKey: "header.commands.learningPath",
      to: "/student/courses",
      icon: BookOpen,
    },
    {
      section: "goTo",
      labelKey: "header.commands.tutor",
      to: "/student/tutor",
      icon: Bot,
    },
    {
      section: "goTo",
      labelKey: "header.commands.progress",
      to: "/student/progress",
      icon: BarChart3,
    },
    {
      section: "actions",
      labelKey: "header.commands.fixWeakest",
      to: "/student/progress",
      icon: Target,
    },
    {
      section: "actions",
      labelKey: "header.commands.askTutor",
      to: "/student/tutor",
      icon: Sparkles,
    },
  ],
  teacher: [
    {
      section: "goTo",
      labelKey: "header.commands.home",
      to: "/teacher/dashboard",
      icon: LayoutDashboard,
    },
    {
      section: "goTo",
      labelKey: "header.commands.studentTriage",
      to: "/teacher/students",
      icon: Users,
    },
    {
      section: "goTo",
      labelKey: "header.commands.curriculumStudio",
      to: "/teacher/modules",
      icon: BookOpen,
    },
    {
      section: "goTo",
      labelKey: "header.commands.gradingQueue",
      to: "/teacher/grading",
      icon: GraduationCap,
    },
    {
      section: "actions",
      labelKey: "header.commands.draftFeedback",
      to: "/teacher/grading",
      icon: Sparkles,
    },
    {
      section: "actions",
      labelKey: "header.commands.uploadLessons",
      to: "/teacher/modules",
      icon: Target,
    },
  ],
  parent: [
    {
      section: "goTo",
      labelKey: "header.commands.home",
      to: "/parent/dashboard",
      icon: LayoutDashboard,
    },
    {
      section: "goTo",
      labelKey: "header.commands.growth",
      to: "/parent/progress",
      icon: BarChart3,
    },
    {
      section: "goTo",
      labelKey: "header.commands.support",
      to: "/parent/support",
      icon: Megaphone,
    },
  ],
  coordinator: [
    {
      section: "goTo",
      labelKey: "header.commands.home",
      to: "/coordinator/dashboard",
      icon: LayoutDashboard,
    },
    {
      section: "goTo",
      labelKey: "header.commands.outcomes",
      to: "/coordinator/plos",
      icon: Target,
    },
    {
      section: "goTo",
      labelKey: "header.commands.curriculumMatrix",
      to: "/coordinator/matrix",
      icon: BookOpen,
    },
    {
      section: "goTo",
      labelKey: "header.commands.accreditation",
      to: "/coordinator/accreditation",
      icon: FileText,
    },
  ],
  admin: [
    {
      section: "goTo",
      labelKey: "header.commands.home",
      to: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      section: "goTo",
      labelKey: "header.commands.analytics",
      to: "/admin/reports",
      icon: BarChart3,
    },
    {
      section: "goTo",
      labelKey: "header.commands.aiGovernance",
      to: "/admin/security",
      icon: ShieldAlert,
    },
    {
      section: "goTo",
      labelKey: "header.commands.people",
      to: "/admin/users",
      icon: Users,
    },
  ],
};

const SearchCommand = ({ showTrigger = false }: SearchCommandProps) => {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { role } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results, isLoading } = useGlobalSearch(debouncedQuery, role);
  const roleCommands = commandsByRole[role ?? "student"];
  const matchingCommands = roleCommands.filter((command) =>
    t(command.labelKey).toLowerCase().includes(input.trim().toLowerCase())
  );

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(input), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Focus input when dialog opens; reset state on close via onOpenChange
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setInput("");
      setDebouncedQuery("");
    }
  };

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    navigate(result.url);
  };

  const handleCommandSelect = (command: RoleCommand) => {
    setOpen(false);
    navigate(command.to);
  };

  // Group results by type
  const grouped: Record<string, SearchResult[]> = {};
  for (const r of results ?? []) {
    const list = grouped[r.type] ?? [];
    list.push(r);
    grouped[r.type] = list;
  }

  return (
    <>
      {showTrigger ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(true)}
          className="top-search h-auto justify-start"
          aria-label={t("header.openGlobalSearch")}
        >
          <span className="flex items-center gap-2">
            <Search aria-hidden="true" />
            {t("header.search")}
          </span>
          <kbd className="kbd">⌘K</kbd>
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg p-0 gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("header.search")}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <Input
              ref={inputRef}
              placeholder={t("header.searchPlaceholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
            />
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {input.trim().length > 0 &&
              !isLoading &&
              Object.keys(grouped).length === 0 &&
              matchingCommands.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">
                  {t("header.searchEmpty", { q: input })}
                </p>
              )}

            {(["goTo", "actions"] as const).map((section) => {
              const commands = matchingCommands.filter(
                (command) => command.section === section
              );
              if (commands.length === 0) return null;
              return (
                <div key={section} className="mb-2">
                  <p className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {t(`header.commandSection.${section}`)}
                  </p>
                  {commands.map((command) => {
                    const Icon = command.icon;
                    return (
                      <Button
                        key={command.labelKey}
                        type="button"
                        variant="ghost"
                        className="h-auto w-full justify-start gap-3 px-3 py-2 text-start text-sm"
                        onClick={() => handleCommandSelect(command)}
                      >
                        <Icon
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        {t(command.labelKey)}
                      </Button>
                    );
                  })}
                </div>
              );
            })}

            {Object.entries(grouped).map(([type, items]) => {
              const config = categoryConfig[type as SearchResult["type"]];
              if (!config || !items) return null;
              const Icon = config.icon;
              return (
                <div key={type} className="mb-2">
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-400 px-2 py-1">
                    {config.label}
                  </p>
                  {items.map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      variant="ghost"
                      onClick={() => handleSelect(item)}
                      className="h-auto w-full justify-start gap-3 px-3 py-2 text-start text-sm"
                    >
                      <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-gray-500 truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              );
            })}

            {!input && (
              <p className="text-sm text-gray-400 text-center py-6">
                {t("header.searchPrompt")}{" "}
                <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">
                  ⌘K
                </kbd>
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SearchCommand;
