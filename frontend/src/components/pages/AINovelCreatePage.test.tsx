import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { API } from "@/api";
import { AINovelCreatePage } from "./AINovelCreatePage";

vi.mock("@/stores/app-store", () => ({
  useAppStore: {
    getState: () => ({
      pushToast: vi.fn(),
    }),
  },
}));

const sampleNovel = `第 1 章 雨夜钥匙
林澈收到一封信。

第 2 章 旧剧院
许岚陪他推开剧院大门。

第 3 章 舞台对峙
顾衣要求他交出钥匙。`;

function renderPage() {
  const { hook } = memoryLocation({ path: "/app/novel/new" });
  return render(
    <Router hook={hook}>
      <AINovelCreatePage />
    </Router>,
  );
}

describe("AINovelCreatePage", () => {
  it("validates pasted chapters and creates a novel screenplay project", async () => {
    const user = userEvent.setup();
    vi.spyOn(API, "createNovelProject").mockResolvedValue({
      success: true,
      name: "novel-aa11bb22",
      project: {
        title: "雨夜旧剧院",
        content_mode: "drama",
        style: "",
        episodes: [],
        characters: {},
      },
      screenplay: {
        title: "雨夜旧剧院",
        logline: "可编辑剧本初稿",
        language: "zh-CN",
        target_format: "电影剧本",
        source_chapters: [],
        characters: [],
        scenes: [],
      },
      yaml_text: "title: 雨夜旧剧院",
      yaml_filename: "ai_novel_screenplay.yaml",
      script_filename: "ai_novel_episode_1.json",
      chapter_count: 3,
    });

    renderPage();

    await user.type(screen.getByLabelText("项目名称"), "雨夜旧剧院");
    await user.type(screen.getByLabelText("小说正文"), sampleNovel);
    await user.click(screen.getByRole("button", { name: "生成 YAML 剧本初稿" }));

    expect(await screen.findByText("title: 雨夜旧剧院")).toBeInTheDocument();
    expect(API.createNovelProject).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "雨夜旧剧院",
        source_text: sampleNovel,
        target_format: "电影剧本",
        language: "zh-CN",
      }),
    );
  });
});
