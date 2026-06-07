import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  const location = memoryLocation({ path: "/app/novel/new", record: true });
  const view = render(
    <Router hook={location.hook}>
      <AINovelCreatePage />
    </Router>,
  );
  return { ...view, location };
}

describe("AINovelCreatePage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts chapter events through the AI Novel backend before generation", async () => {
    const user = userEvent.setup();
    vi.spyOn(API, "validateNovelChapters").mockResolvedValue({
      valid: true,
      chapter_count: 3,
      chapters: [
        { number: 1, title: "雨夜钥匙", summary: "林澈收到神秘信件。" },
        { number: 2, title: "旧剧院", summary: "许岚陪他进入剧院。" },
        { number: 3, title: "舞台对峙", summary: "顾衣要求交出钥匙。" },
      ],
    });

    renderPage();

    await user.type(screen.getByLabelText("项目名称"), "雨夜旧剧院");
    await user.type(screen.getByLabelText("小说正文"), sampleNovel);
    await user.click(screen.getByRole("button", { name: "解析章节事件" }));

    expect(API.validateNovelChapters).toHaveBeenCalledWith({ source_text: sampleNovel });
    expect(await screen.findByText("后端校验通过 · 3 章")).toBeInTheDocument();
    expect(screen.getByText("雨夜钥匙")).toBeInTheDocument();
  });

  it("creates a Toonflow-style production project with screenplay actions", async () => {
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
        source_chapters: [
          { number: 1, title: "雨夜钥匙", summary: "林澈收到神秘信件。" },
          { number: 2, title: "旧剧院", summary: "许岚陪他进入剧院。" },
          { number: 3, title: "舞台对峙", summary: "顾衣要求交出钥匙。" },
        ],
        characters: [
          {
            id: "char_lin_che",
            name: "林澈",
            role: "主角",
            description: "寻找真相的青年。",
          },
        ],
        scenes: [
          {
            id: "scene_001",
            source_chapter: 1,
            title: "雨夜钥匙",
            location: "老街雨巷",
            time: "夜晚",
            summary: "林澈收到钥匙。",
            characters: ["char_lin_che"],
            dialogues: [{ character: "char_lin_che", emotion: "迟疑", line: "我会走到最后。" }],
            actions: ["雨水打湿旧剧票。"],
          },
        ],
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
    expect(screen.getByRole("button", { name: "进入项目继续打磨" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制 YAML" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下载 YAML" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "角色素材库" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "分镜生产" })).toBeInTheDocument();
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
