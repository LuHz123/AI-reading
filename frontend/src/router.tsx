import { useEffect } from "react";
import { Route, Switch, Redirect, useParams, useSearch } from "wouter";
import { StudioLayout } from "@/components/layout";
import { StudioCanvasRouter } from "@/components/canvas/StudioCanvasRouter";
import { AINovelCreatePage } from "@/components/pages/AINovelCreatePage";
import { AINovelLandingPage } from "@/components/pages/AINovelLandingPage";
import { ProjectsPage } from "@/components/pages/ProjectsPage";
import { SystemConfigPage } from "@/components/pages/SystemConfigPage";
import { ProjectSettingsPage } from "@/components/pages/ProjectSettingsPage";
import { AssetLibraryPage } from "@/components/pages/AssetLibraryPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ToastOverlay } from "@/components/layout/ToastOverlay";
import { API } from "@/api";
import { useProjectsStore } from "@/stores/projects-store";
import { useAssistantStore } from "@/stores/assistant-store";
import { useAuthStore } from "@/stores/auth-store";
import { useConfigStatusStore } from "@/stores/config-status-store";
import { safeReturnPath } from "@/utils/safe-url";

function ConfigStatusLoader() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      await useConfigStatusStore.getState().fetch();
      if (cancelled) return;
      if (!useConfigStatusStore.getState().initialized && attempts < 5) {
        attempts += 1;
        timer = setTimeout(() => void tick(), 800 * attempts);
      }
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isAuthenticated]);

  return null;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function LoginRedirect() {
  const search = useSearch();
  const returnTo = safeReturnPath(new URLSearchParams(search).get("from"));
  return <Redirect to={returnTo ?? "/app/projects"} />;
}

function StudioWorkspace() {
  const params = useParams<{ projectName: string }>();
  const projectName = params.projectName ?? null;
  const { setCurrentProject, setProjectDetailLoading } = useProjectsStore();

  useEffect(() => {
    if (!projectName) return;
    let cancelled = false;

    const assistantState = useAssistantStore.getState();
    assistantState.setSessions([]);
    assistantState.setCurrentSessionId(null);
    assistantState.setTurns([]);
    assistantState.setDraftTurn(null);
    assistantState.setSessionStatus(null);
    assistantState.setIsDraftSession(false);

    setProjectDetailLoading(true);
    API.getProject(projectName)
      .then((res) => {
        if (!cancelled) {
          setCurrentProject(projectName, res.project, res.scripts ?? {}, res.asset_fingerprints);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentProject(projectName, null);
        }
      })
      .finally(() => {
        if (!cancelled) setProjectDetailLoading(false);
      });

    return () => {
      cancelled = true;
      setCurrentProject(null, null);
    };
  }, [projectName, setCurrentProject, setProjectDetailLoading]);

  return (
    <StudioLayout>
      <StudioCanvasRouter />
    </StudioLayout>
  );
}

export function AppRoutes() {
  return (
    <>
      <ConfigStatusLoader />
      <Switch>
        <Route path="/login" component={LoginRedirect} />

        <Route path="/">
          <Redirect to="/app/projects" />
        </Route>

        <Route path="/app">
          <Redirect to="/app/projects" />
        </Route>

        <Route path="/app/projects">
          <AINovelLandingPage />
        </Route>

        <Route path="/app/novel/new">
          <AuthGuard>
            <AINovelCreatePage />
          </AuthGuard>
        </Route>

        <Route path="/app/workspace">
          <ProjectsPage />
        </Route>

        <Route path="/app/settings">
          <AuthGuard>
            <SystemConfigPage />
          </AuthGuard>
        </Route>

        <Route path="/app/assets">
          <AuthGuard>
            <AssetLibraryPage />
          </AuthGuard>
        </Route>

        <Route path="/app/projects/:projectName/settings">
          <AuthGuard>
            <ProjectSettingsPage />
          </AuthGuard>
        </Route>

        <Route path="/app/projects/:projectName" nest>
          <AuthGuard>
            <StudioWorkspace />
          </AuthGuard>
        </Route>

        <Route>
          <NotFoundPage />
        </Route>
      </Switch>
      <ToastOverlay />
    </>
  );
}
