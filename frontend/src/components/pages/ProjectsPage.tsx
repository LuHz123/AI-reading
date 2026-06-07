import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Link, useLocation } from "wouter";
import {
  AlertTriangle,
  Edit3,
  FileCode2,
  Folder,
  Home,
  Library,
  Loader2,
  PenLine,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { API } from "@/api";
import { useAppStore } from "@/stores/app-store";
import { useConfigStatusStore } from "@/stores/config-status-store";
import { useProjectsStore } from "@/stores/projects-store";
import { ArchiveDiagnosticsDialog } from "@/components/shared/ArchiveDiagnosticsDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GlassModal } from "@/components/ui/GlassModal";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { errMsg, voidCall, voidPromise } from "@/utils/async";
import { formatDate } from "@/utils/date-format";
import { getProjectDisplayName } from "@/utils/project-display";
import { WARM_TONE } from "@/utils/severity-tone";
import { CreateProjectModal } from "./CreateProjectModal";
import { rememberAssetLibraryReturnTo } from "./AssetLibraryPage";
import {
  type Phase,
  type ImportConflictPolicy,
  type ImportFailureDiagnostics,
  type ProjectStatus,
  type ProjectSummary,
} from "@/types";

type PhaseFilter = Phase | "all";

function asProjectStatus(s: ProjectSummary["status"]): ProjectStatus | null {
  return s && "current_phase" in s ? (s as ProjectStatus) : null;
}

function styleLabelOf(p: ProjectSummary, t: TFunction): string {
  if (p.style_template_id) return t(`templates:name.${p.style_template_id}`);
  if (p.style_image) return t("dashboard:style_custom");
  return t("dashboard:style_not_set");
}

function DashboardSidebar({
  onHome,
  onAssets,
  onSettings,
  configIncomplete,
}: {
  onHome: () => void;
  onAssets: () => void;
  onSettings: () => void;
  configIncomplete: boolean;
}) {
  const navItems = [
    { label: "项目", icon: Home, active: true, onClick: onHome },
    { label: "剧本", icon: FileCode2, active: false, onClick: onHome },
    { label: "资产", icon: Library, active: false, onClick: onAssets },
    { label: "设置", icon: Settings, active: false, onClick: onSettings, badge: configIncomplete },
  ];

  return (
    <aside className="flex w-[76px] shrink-0 flex-col items-center rounded-[24px] bg-white py-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
      <Link
        href="/app/projects"
        className="mb-8 grid h-11 w-11 place-items-center rounded-[16px] bg-black text-white"
        aria-label="STORYPLAY 首页"
      >
        <PenLine className="h-5 w-5" aria-hidden />
      </Link>
      <nav className="flex flex-1 flex-col items-center gap-3" aria-label="项目管理导航">
        {navItems.map(({ label, icon: Icon, active, onClick, badge }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className={
              "relative grid h-11 w-11 place-items-center rounded-[15px] transition " +
              (active
                ? "bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
                : "text-slate-500 hover:bg-slate-100 hover:text-black")
            }
          >
            <Icon className="h-5 w-5" aria-hidden />
            {badge ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
            ) : null}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function LightProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-black transition-[width]"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

interface ProjectDashboardCardProps {
  project: ProjectSummary;
  styleLabel: string;
  phaseLabels: Record<Phase, string>;
  t: TFunction;
  onDelete: () => void;
}

function ProjectDashboardCard({
  project,
  styleLabel,
  phaseLabels,
  t,
  onDelete,
}: ProjectDashboardCardProps) {
  const status = asProjectStatus(project.status);
  const phase: Phase | null = status?.current_phase ?? null;
  const phaseLabel = phase ? phaseLabels[phase] : t("dashboard:phase_setup");
  const progressPct = status ? Math.round(status.phase_progress * 100) : 0;
  const episodes =
    status?.episodes_summary ?? { total: 0, scripted: 0, in_production: 0, completed: 0 };
  const characters = status?.characters ?? { completed: 0, total: 0 };
  const scenes = status?.scenes ?? { completed: 0, total: 0 };
  const projectDisplayName = getProjectDisplayName(project.title, t("dashboard:untitled_project"));
  const summary =
    episodes.total > 0
      ? `${episodes.completed}/${episodes.total} 集完成，${episodes.in_production} 集制作中`
      : "从小说章节生成剧本后，可继续管理角色、分场和分镜资产。";

  return (
    <article className="group overflow-hidden rounded-[8px] border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
      <div className="relative h-36 overflow-hidden bg-slate-100">
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_26%_18%,rgba(255,255,255,0.82),transparent_24%),linear-gradient(135deg,#eceff3_0%,#d8dde5_42%,#b7c1cd_100%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/42 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/88 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur">
          {styleLabel}
        </span>
        <span className="absolute bottom-4 left-4 rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
          {phaseLabel}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-normal text-slate-950">
              {projectDisplayName}
            </h3>
            <p className="mt-1 text-xs text-slate-400">{project.name}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={`/app/projects/${project.name}`}
              className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-black"
              aria-label={`编辑 ${projectDisplayName}`}
            >
              <Edit3 className="h-4 w-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={onDelete}
              className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              aria-label={`${t("dashboard:delete_project")} — ${projectDisplayName}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <p className="mt-4 min-h-[44px] text-sm leading-6 text-slate-500">{summary}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            角色 {characters.completed}/{characters.total || "—"}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            场景 {scenes.completed}/{scenes.total || "—"}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            YAML 剧本
          </span>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>完成进度</span>
            <span className="font-semibold text-slate-800">{progressPct}%</span>
          </div>
          <LightProgressBar value={progressPct} />
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            最近更新{" "}
            {formatDate(new Date(), "zh", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </span>
          <Link
            href={`/app/projects/${project.name}`}
            className="text-sm font-semibold text-black no-underline hover:underline"
          >
            打开项目
          </Link>
        </div>
      </div>
    </article>
  );
}

function EmptyDashboardCard({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="flex min-h-[330px] flex-col items-center justify-center rounded-[8px] border border-dashed border-slate-300 bg-white px-6 text-center transition hover:border-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
    >
      <span className="grid h-14 w-14 place-items-center rounded-full bg-black text-white">
        <Plus className="h-6 w-6" aria-hidden />
      </span>
      <span className="mt-5 text-lg font-semibold text-slate-950">新建项目</span>
      <span className="mt-2 max-w-[250px] text-sm leading-6 text-slate-500">
        导入小说章节或创建 AI Novel 项目，生成可编辑的 YAML 剧本初稿。
      </span>
    </button>
  );
}

export function ProjectsPage() {
  const { t, i18n } = useTranslation(["common", "dashboard", "assets", "templates"]);
  const [, navigate] = useLocation();
  const {
    projects,
    projectsLoading,
    showCreateModal,
    setProjects,
    setProjectsLoading,
    setShowCreateModal,
  } = useProjectsStore();

  const [importingProject, setImportingProject] = useState(false);
  const [conflictProject, setConflictProject] = useState<string | null>(null);
  const [conflictFile, setConflictFile] = useState<File | null>(null);
  type ImportDiagnosticsState =
    | { source: "success"; diagnostics: ImportFailureDiagnostics; navigateTo: string }
    | { source: "failure"; diagnostics: ImportFailureDiagnostics };
  const [importDiagnostics, setImportDiagnostics] =
    useState<ImportDiagnosticsState | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isConfigComplete = useConfigStatusStore((s) => s.isComplete);

  const phaseLabels = useMemo<Record<Phase, string>>(
    () => ({
      setup: t("dashboard:phase_setup"),
      worldbuilding: t("dashboard:phase_worldbuilding"),
      scripting: t("dashboard:phase_scripting"),
      production: t("dashboard:phase_production"),
      completed: t("dashboard:phase_completed"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t reference rotates with i18n.language
    [i18n.language],
  );

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await API.listProjects();
      setProjects(res.projects);
    } finally {
      setProjectsLoading(false);
    }
  }, [setProjects, setProjectsLoading]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await doImport(file);
    e.target.value = "";
  };

  const doImport = async (file: File, policy: ImportConflictPolicy = "prompt") => {
    setImportingProject(true);
    try {
      const result = await API.importProject(file, policy);
      setConflictProject(null);
      setConflictFile(null);
      setImportDiagnostics(null);
      await fetchProjects();

      const autoFixedCount = result.diagnostics.auto_fixed.length;
      const warningCount = result.diagnostics.warnings.length;
      const navigateTo = `/app/projects/${result.project_name}`;
      if (warningCount > 0 || autoFixedCount > 0) {
        useAppStore
          .getState()
          .pushToast(
            autoFixedCount > 0
              ? t("dashboard:import_auto_fixed", {
                  title: getProjectDisplayName(
                    result.project.title,
                    t("dashboard:untitled_project"),
                  ),
                  count: autoFixedCount,
                })
              : t("dashboard:import_success", {
                  title: getProjectDisplayName(
                    result.project.title,
                    t("dashboard:untitled_project"),
                  ),
                }),
            "success",
          );
        setImportDiagnostics({
          source: "success",
          diagnostics: {
            blocking: [],
            auto_fixable: result.diagnostics.auto_fixed,
            warnings: result.diagnostics.warnings,
          },
          navigateTo,
        });
        return;
      }
      navigate(navigateTo);
    } catch (err) {
      const error = err as Error & {
        status?: number;
        conflict_project_name?: string;
        diagnostics?: ImportFailureDiagnostics;
      };

      if (
        error.status === 409 &&
        error.conflict_project_name &&
        policy === "prompt"
      ) {
        setConflictFile(file);
        setConflictProject(error.conflict_project_name);
        return;
      }

      if (error.diagnostics) {
        setImportDiagnostics({ source: "failure", diagnostics: error.diagnostics });
      } else {
        useAppStore
          .getState()
          .pushToast(`${t("dashboard:import_failed")}: ${error.message}`, "warning");
      }
    } finally {
      setImportingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    const projectDisplayName = deletingProject.title || deletingProject.name;
    setDeleteLoading(true);
    try {
      await API.deleteProject(deletingProject.name);
      await fetchProjects();
      useAppStore.getState().pushToast(t("common:deleted"), "success");
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(
          `${t("dashboard:delete_failed")}[${projectDisplayName}] ${errMsg(err)}`,
          "warning",
        );
    } finally {
      setDeleteLoading(false);
      setDeletingProject(null);
    }
  };

  const totals = useMemo(() => {
    let production = 0;
    let completed = 0;
    let drafts = 0;
    for (const p of projects) {
      const s = asProjectStatus(p.status);
      if (!s) continue;
      if (s.current_phase === "production") production += 1;
      else if (s.current_phase === "completed") completed += 1;
      else drafts += 1;
    }
    return { total: projects.length, production, completed, drafts };
  }, [projects]);

  const styleLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projects) map[p.name] = styleLabelOf(p, t);
    return map;
  }, [projects, t]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      const s = asProjectStatus(p.status);
      if (phaseFilter !== "all") {
        if (!s || s.current_phase !== phaseFilter) return false;
      }
      if (!q) return true;
      const phaseLabel = s ? phaseLabels[s.current_phase] : "";
      return `${p.title || ""} ${p.name} ${phaseLabel}`.toLowerCase().includes(q);
    });
  }, [projects, phaseFilter, searchQuery, phaseLabels]);

  const dashboardStats = useMemo(
    () => [
      { label: "全部项目", value: totals.total },
      { label: "制作中", value: totals.production },
      { label: "已完成", value: totals.completed },
    ],
    [totals.completed, totals.production, totals.total],
  );

  const phaseFilters: PhaseFilter[] = ["all", "production", "scripting", "completed"];

  return (
    <div className="min-h-screen bg-[#ececec] p-3 text-slate-950 sm:p-4">
      <input
        ref={importInputRef}
        type="file"
        accept=".zip,application/zip"
        aria-label={t("dashboard:import_project_file_aria")}
        onChange={voidPromise(handleImport)}
        className="hidden"
      />

      <div className="flex min-h-[calc(100vh-24px)] gap-3 sm:gap-4">
        <DashboardSidebar
          onHome={() => navigate("/app/workspace")}
          onAssets={() => {
            rememberAssetLibraryReturnTo(window.location.pathname);
            navigate("/app/assets");
          }}
          onSettings={() => navigate("/app/settings")}
          configIncomplete={!isConfigComplete}
        />

        <main className="flex min-w-0 flex-1 flex-col rounded-[26px] bg-white px-5 py-6 shadow-[0_16px_60px_rgba(15,23,42,0.06)] sm:px-8 lg:px-10">
          <header className="flex flex-col gap-5 border-b border-slate-100 pb-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                <Folder className="h-3.5 w-3.5" aria-hidden />
                AI Novel Workspace
              </div>
              <h1 className="text-4xl font-semibold tracking-normal text-black">我的项目</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                管理您的所有短剧项目，继续编辑小说转剧本、YAML 初稿、角色资产和分镜流程。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={importingProject}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {importingProject ? (
                  <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden />
                )}
                {importingProject ? t("dashboard:importing") : t("dashboard:import_zip")}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" aria-hidden />
                新建项目
              </button>
            </div>
          </header>

          <section className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <label className="flex min-h-12 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 transition focus-within:border-slate-400 focus-within:bg-white">
              <Search className="h-4 w-4 text-slate-400" aria-hidden />
              <input
                ref={searchInputRef}
                type="search"
                name="q"
                aria-label={t("dashboard:search_projects")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="搜索项目、阶段或剧本"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {phaseFilters.map((key) => {
                const label = key === "all" ? "全部" : phaseLabels[key];
                const isActive = phaseFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setPhaseFilter(key)}
                    className={
                      "h-10 rounded-full px-4 text-sm font-medium transition " +
                      (isActive
                        ? "bg-black text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-black")
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-3">
            {dashboardStats.map((stat) => (
              <div key={stat.label} className="rounded-[8px] border border-slate-100 bg-slate-50 px-5 py-4">
                <div className="text-sm text-slate-500">{stat.label}</div>
                <div className="mt-2 text-3xl font-semibold text-black">{stat.value}</div>
              </div>
            ))}
          </section>

          <section className="mt-7 flex-1" aria-labelledby="project-dashboard-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="project-dashboard-heading" className="text-lg font-semibold text-black">
                项目列表
              </h2>
              <span className="text-sm text-slate-400">{filteredProjects.length} 个项目</span>
            </div>

            {projectsLoading ? (
              <div className="flex items-center justify-center rounded-[8px] border border-slate-100 bg-slate-50 py-20">
                <Loader2 className="h-6 w-6 motion-safe:animate-spin text-slate-500" />
                <span className="ml-2 text-slate-500">{t("dashboard:loading_projects")}</span>
              </div>
            ) : filteredProjects.length === 0 && projects.length > 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[8px] border border-slate-100 bg-slate-50 py-16 text-center">
                <p className="text-lg font-semibold text-black">{t("dashboard:lobby_no_filter_match")}</p>
                <p className="mt-2 text-sm text-slate-500">{t("dashboard:lobby_no_filter_match_hint")}</p>
                <button
                  type="button"
                  onClick={() => {
                    setPhaseFilter("all");
                    setSearchQuery("");
                  }}
                  className="mt-5 rounded-full bg-black px-5 py-2 text-sm font-semibold text-white"
                >
                  {t("dashboard:lobby_clear_filters")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredProjects.map((project) => (
                  <ProjectDashboardCard
                    key={project.name}
                    project={project}
                    styleLabel={styleLabels[project.name] ?? ""}
                    phaseLabels={phaseLabels}
                    t={t}
                    onDelete={() => setDeletingProject(project)}
                  />
                ))}
                <EmptyDashboardCard onCreate={() => setShowCreateModal(true)} />
              </div>
            )}
          </section>
        </main>
      </div>

      {conflictProject && conflictFile && (
        <ConflictDialog
          projectName={conflictProject}
          importing={importingProject}
          onConfirm={(policy) => voidCall(doImport(conflictFile, policy))}
          onCancel={() => {
            setConflictProject(null);
            setConflictFile(null);
          }}
        />
      )}

      {importDiagnostics && (
        <ArchiveDiagnosticsDialog
          title={t(
            importDiagnostics.source === "failure"
              ? "dashboard:import_failure_diagnostics"
              : "dashboard:import_diagnostics",
          )}
          description={t(
            importDiagnostics.source === "failure"
              ? "dashboard:import_failure_with_diagnostics"
              : "dashboard:import_success_with_diagnostics",
          )}
          sections={[
            {
              key: "blocking",
              title: t("dashboard:blocking_issues"),
              severity: "blocking",
              items: importDiagnostics.diagnostics.blocking,
            },
            {
              key: "auto_fixed",
              title: t("dashboard:auto_fixed_issues"),
              severity: "auto_fixed",
              items: importDiagnostics.diagnostics.auto_fixable,
            },
            {
              key: "warnings",
              title: t("dashboard:diagnostics_warnings"),
              severity: "warnings",
              items: importDiagnostics.diagnostics.warnings,
            },
          ]}
          onClose={() => {
            const target =
              importDiagnostics.source === "success" ? importDiagnostics.navigateTo : null;
            setImportDiagnostics(null);
            if (target) navigate(target);
          }}
        />
      )}

      {showCreateModal && <CreateProjectModal />}

      <ConfirmDialog
        open={!!deletingProject}
        tone="danger"
        title={t("dashboard:delete_project")}
        description={
          deletingProject
            ? t("dashboard:confirm_delete_project", {
                title: deletingProject.title || deletingProject.name,
              })
            : null
        }
        confirmLabel={t("dashboard:delete_project")}
        loadingLabel={t("dashboard:deleting_project")}
        cancelLabel={t("common:cancel")}
        loading={deleteLoading}
        onCancel={() => {
          if (!deleteLoading) setDeletingProject(null);
        }}
        onConfirm={handleDeleteProject}
      />
    </div>
  );
}

function ConflictDialog({
  projectName,
  importing,
  onConfirm,
  onCancel,
}: {
  projectName: string;
  importing: boolean;
  onConfirm: (policy: "overwrite" | "rename") => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation(["common", "dashboard"]);
  return (
    <GlassModal
      open
      onClose={onCancel}
      labelledBy="lobby-conflict-title"
      widthClassName="w-full max-w-lg"
      hairlineTone="warm"
      closeOnBackdrop={!importing}
      closeOnEscape={!importing}
    >
      <div className="px-6 pb-6 pt-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, var(--color-warm-tint), var(--color-warm-tint-faint))",
              border: `1px solid ${WARM_TONE.ring}`,
              color: WARM_TONE.color,
              boxShadow: `0 8px 18px -8px ${WARM_TONE.glow}`,
            }}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <h2
              id="lobby-conflict-title"
              className="display-serif text-[17px] font-semibold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              {t("dashboard:duplicate_project_id")}
            </h2>
            <p
              className="text-[12.5px] leading-relaxed"
              style={{ color: "var(--color-text-3)" }}
            >
              {t("dashboard:id_intended_hint")}
              <span className="mx-1 rounded bg-bg/70 px-1.5 py-0.5 font-mono text-text">
                {projectName}
              </span>
              {t("dashboard:already_exists_conflict_hint")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={() => onConfirm("overwrite")}
            disabled={importing}
            aria-label={t("dashboard:overwrite_existing")}
            className="flex w-full items-center justify-between rounded-xl border border-warm-ring bg-warm-tint px-4 py-3 text-left text-sm text-warm-bright transition-colors hover:border-warm-bright/60 hover:bg-warm-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>
              <span className="block font-medium">{t("dashboard:overwrite_existing")}</span>
              <span className="mt-1 block text-xs text-warm-fade">
                {t("dashboard:overwrite_hint")}
              </span>
            </span>
            {importing && <Loader2 className="h-4 w-4 motion-safe:animate-spin" />}
          </button>

          <button
            type="button"
            onClick={() => onConfirm("rename")}
            disabled={importing}
            aria-label={t("dashboard:auto_rename_import")}
            className="flex w-full items-center justify-between rounded-xl border border-accent/25 bg-accent-dim px-4 py-3 text-left text-sm text-text transition-colors hover:border-accent/40 hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>
              <span className="block font-medium">{t("dashboard:auto_rename_import")}</span>
              <span className="mt-1 block text-xs text-text-3">
                {t("dashboard:rename_hint")}
              </span>
            </span>
            {importing && <Loader2 className="h-4 w-4 motion-safe:animate-spin" />}
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <SecondaryButton size="sm" onClick={onCancel} disabled={importing}>
            {t("common:cancel")}
          </SecondaryButton>
        </div>
      </div>
    </GlassModal>
  );
}
