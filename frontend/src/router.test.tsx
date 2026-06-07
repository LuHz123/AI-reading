import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { API } from "@/api";
import { useAssistantStore } from "@/stores/assistant-store";
import { useAuthStore } from "@/stores/auth-store";
import { useConfigStatusStore } from "@/stores/config-status-store";
import { useProjectsStore } from "@/stores/projects-store";
import { AppRoutes } from "@/router";

vi.mock("@/components/layout", () => ({
  StudioLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="studio-layout">{children}</div>
  ),
}));

vi.mock("@/components/canvas/StudioCanvasRouter", () => ({
  StudioCanvasRouter: () => <div data-testid="studio-canvas-router">Studio Canvas</div>,
}));

vi.mock("@/components/pages/ProjectsPage", () => ({
  ProjectsPage: () => <div data-testid="projects-page">Projects Page</div>,
}));

vi.mock("@/components/pages/AINovelLandingPage", () => ({
  AINovelLandingPage: () => <div data-testid="ai-novel-landing">AI Novel Landing</div>,
}));

vi.mock("@/components/pages/AINovelCreatePage", () => ({
  AINovelCreatePage: () => <div data-testid="ai-novel-create">AI Novel Create</div>,
}));

vi.mock("@/components/pages/AssetLibraryPage", () => ({
  AssetLibraryPage: () => <div data-testid="asset-library-page">Asset Library</div>,
}));

function renderAt(path: string) {
  const location = memoryLocation({ path, record: true });
  return render(
    <Router hook={location.hook} searchHook={location.searchHook}>
      <AppRoutes />
    </Router>,
  );
}

function resetStores(): void {
  useProjectsStore.setState(useProjectsStore.getInitialState(), true);
  useAssistantStore.setState(useAssistantStore.getInitialState(), true);
}

describe("AppRoutes", () => {
  beforeEach(() => {
    resetStores();
    useAuthStore.setState({ isAuthenticated: true, isLoading: false });
    useConfigStatusStore.setState({ initialized: true });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("redirects root path to /app/projects", async () => {
    renderAt("/");
    expect(await screen.findByTestId("ai-novel-landing")).toBeInTheDocument();
  });

  it("redirects /app to /app/projects", async () => {
    renderAt("/app");
    expect(await screen.findByTestId("ai-novel-landing")).toBeInTheDocument();
  });

  it("renders the project workspace lobby at /app/workspace", async () => {
    renderAt("/app/workspace");
    expect(await screen.findByTestId("projects-page")).toBeInTheDocument();
  });

  it("renders the AI Novel conversion flow at /app/novel/new", async () => {
    renderAt("/app/novel/new");
    expect(await screen.findByTestId("ai-novel-create")).toBeInTheDocument();
  });

  it("renders public app pages without authentication", async () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false });
    renderAt("/app/projects");
    expect(await screen.findByTestId("ai-novel-landing")).toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });

  it("opens the asset library without authentication", async () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false });
    renderAt("/app/assets");
    expect(await screen.findByTestId("asset-library-page")).toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });

  it("redirects legacy login URLs back into the app", async () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false });
    renderAt("/login?from=%2Fapp%2Fassets");
    expect(await screen.findByTestId("asset-library-page")).toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });

  it("renders 404 for unknown routes", () => {
    renderAt("/not-found");
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("loads project workspace and resets assistant state", async () => {
    vi.spyOn(API, "getProject").mockResolvedValue({
      project: {
        title: "Demo Project",
        content_mode: "narration",
        style: "Anime",
        episodes: [],
        characters: {},
        scenes: {},
        props: {},
      },
      scripts: {},
    });

    useAssistantStore.setState({
      sessions: [
        {
          id: "session-1",
          project_name: "old",
          title: "Old",
          status: "idle",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      currentSessionId: "session-1",
      turns: [{ type: "user", content: [{ type: "text", text: "hello" }] }],
      draftTurn: { type: "assistant", content: [{ type: "text", text: "draft" }] },
      sessionStatus: "running",
      isDraftSession: true,
    });

    const view = renderAt("/app/projects/demo");

    expect(await screen.findByTestId("studio-layout")).toBeInTheDocument();
    expect(await screen.findByTestId("studio-canvas-router")).toBeInTheDocument();
    await waitFor(() => {
      expect(API.getProject).toHaveBeenCalledWith("demo");
    });

    const assistant = useAssistantStore.getState();
    expect(assistant.sessions).toEqual([]);
    expect(assistant.currentSessionId).toBeNull();
    expect(assistant.turns).toEqual([]);
    expect(assistant.draftTurn).toBeNull();
    expect(assistant.sessionStatus).toBeNull();
    expect(assistant.isDraftSession).toBe(false);

    await waitFor(() => {
      const projectState = useProjectsStore.getState();
      expect(projectState.currentProjectName).toBe("demo");
      expect(projectState.currentProjectData?.title).toBe("Demo Project");
      expect(projectState.projectDetailLoading).toBe(false);
    });

    view.unmount();
    expect(useProjectsStore.getState().currentProjectName).toBeNull();
    expect(useProjectsStore.getState().currentProjectData).toBeNull();
  });

  it("keeps project name when loading project details fails", async () => {
    vi.spyOn(API, "getProject").mockRejectedValue(new Error("network"));

    renderAt("/app/projects/fail-demo");

    expect(await screen.findByTestId("studio-layout")).toBeInTheDocument();
    await waitFor(() => {
      const projectState = useProjectsStore.getState();
      expect(projectState.currentProjectName).toBe("fail-demo");
      expect(projectState.currentProjectData).toBeNull();
      expect(projectState.projectDetailLoading).toBe(false);
    });
  });

  it("opens nested project URLs without authentication", async () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false });
    renderAt("/app/projects/demo");
    expect(await screen.findByTestId("studio-layout")).toBeInTheDocument();
    expect(screen.queryByText("404")).not.toBeInTheDocument();
  });

  it("opens the create route without authentication", async () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false });
    renderAt("/app/novel/new");
    expect(await screen.findByTestId("ai-novel-create")).toBeInTheDocument();
  });

  it("ConfigStatusLoader retries while config status is not initialized", async () => {
    vi.useFakeTimers();
    useConfigStatusStore.setState(useConfigStatusStore.getInitialState(), true);
    vi.spyOn(API, "getProviders").mockRejectedValue(new Error("backend not ready"));
    vi.spyOn(API, "listCustomProviders").mockRejectedValue(new Error("backend not ready"));
    vi.spyOn(API, "getSystemConfig").mockRejectedValue(new Error("backend not ready"));

    renderAt("/app/projects");

    await vi.advanceTimersByTimeAsync(0);
    expect(API.getProviders).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(800);
    expect(API.getProviders).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1600);
    expect(API.getProviders).toHaveBeenCalledTimes(3);
  });
});
