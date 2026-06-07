import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { AINovelLandingPage } from "@/components/pages/AINovelLandingPage";

function renderLanding() {
  const location = memoryLocation({ path: "/app/projects", record: true });
  return {
    ...render(
      <Router hook={location.hook}>
        <AINovelLandingPage />
      </Router>,
    ),
    location,
  };
}

describe("AINovelLandingPage", () => {
  it("renders the StoryPlay-style public landing page without a login entry", () => {
    renderLanding();

    expect(screen.getByText("AI Novel")).toBeInTheDocument();
    expect(screen.getByText("短剧剧本创作平台")).toBeInTheDocument();
    expect(screen.getByText("让AI辅助故事创作者成为超级个体")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "登录" })).not.toBeInTheDocument();
  });

  it("sends users directly to the project dashboard when they click 立即体验", () => {
    const { location } = renderLanding();

    fireEvent.click(screen.getByRole("link", { name: "立即体验" }));

    expect(location.history?.at(-1)).toBe("/app/workspace");
  });
});
