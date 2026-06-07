import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Boxes,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  Download,
  FileCode2,
  Film,
  GitBranch,
  Layers3,
  ListTree,
  Loader2,
  MonitorDot,
  PenLine,
  PlayCircle,
  Settings,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { API, type AINovelProjectResponse, type AINovelSourceChapter } from "@/api";
import { BRAND } from "@/branding";
import { useAppStore } from "@/stores/app-store";
import { errMsg, voidPromise } from "@/utils/async";

const MAX_NOVEL_CHARS = 500_000;
const sampleNovel = `第 1 章 雨夜钥匙
林澈在老街尽头收到一封没有署名的信。信封里只有一张旧剧票和一把铜钥匙。

第 2 章 旧剧院
许岚陪他推开海棠剧院的大门。舞台深处传来仍在运转的钟声。

第 3 章 舞台对峙
顾衣站在追光灯下，要求林澈交出钥匙，并说那些记忆不该回来。`;

const workflowModules = [
  { label: "项目管理", icon: Layers3, body: "创建 AI Novel 项目，保存原文、YAML 和 ArcReel drama 脚本。" },
  { label: "原始文本", icon: BookOpenText, body: "粘贴 3 章以上小说，先解析章节，再进入剧本改编。" },
  { label: "章节事件", icon: GitBranch, body: "抽取章节标题、摘要和事件线，降低长文本遗漏。" },
  { label: "大纲管理", icon: ListTree, body: "把章节摘要组织成故事骨架，方便后续调整冲突、节奏和分集。" },
  { label: "剧本编辑器", icon: FileCode2, body: "生成结构化 YAML，保留角色、场景、动作和台词。" },
  { label: "角色素材库", icon: Boxes, body: "把角色和场景同步到 ArcReel 资产库，支持后续视觉一致性。" },
  { label: "分镜生产", icon: Film, body: "进入项目后继续拆分镜、生成图片、视频和导出素材。" },
  { label: "视频配置", icon: SlidersHorizontal, body: "在系统设置中切换图像、视频和文本模型，控制生成参数。" },
  { label: "任务监控", icon: MonitorDot, body: "复用 ArcReel 任务队列，追踪图片、视频和脚本任务状态。" },
  { label: "系统设置", icon: Settings, body: "配置文本、图片、视频模型供应商和自定义 OpenAI 兼容接口。" },
];

const productionSteps = [
  ["策划", "章节事件提取"],
  ["编剧", "YAML 剧本生成"],
  ["分镜", "角色/场景资产"],
  ["出片", "ArcReel 生产链路"],
];

function countChapters(text: string): number {
  const matches = text.match(/^\s*(?:#{1,6}\s*)?(?:第\s*[0-9一二三四五六七八九十百千]+\s*[章节回幕卷]|Chapter\s+\d+)/gim);
  return matches?.length ?? 0;
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-900">
      {children}
    </label>
  );
}

function ToolbarLink({
  href,
  children,
  tone = "secondary",
}: {
  href: string;
  children: React.ReactNode;
  tone?: "primary" | "secondary";
}) {
  const cls =
    tone === "primary"
      ? "bg-emerald-700 text-white hover:bg-emerald-800"
      : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-700/30 hover:bg-emerald-50";
  return (
    <Link className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition ${cls}`} href={href}>
      {children}
    </Link>
  );
}

function IconButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-700/30 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function AINovelCreatePage() {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [targetFormat, setTargetFormat] = useState("电影剧本");
  const [language, setLanguage] = useState("zh-CN");
  const [creating, setCreating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [chapters, setChapters] = useState<AINovelSourceChapter[]>([]);
  const [validationMessage, setValidationMessage] = useState("等待章节解析");
  const [result, setResult] = useState<AINovelProjectResponse | null>(null);
  const chapterCount = useMemo(() => countChapters(sourceText), [sourceText]);
  const overLimit = sourceText.length > MAX_NOVEL_CHARS;
  const canAnalyze = sourceText.trim().length > 0 && !overLimit && !analyzing;
  const canSubmit = title.trim().length > 0 && chapterCount >= 3 && sourceText.trim().length > 0 && !overLimit && !creating;
  const resultChapters = result?.screenplay.source_chapters ?? chapters;
  const sceneCount = result?.screenplay.scenes.length ?? 0;
  const characterCount = result?.screenplay.characters.length ?? 0;

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setAnalyzing(true);
    try {
      const response = await API.validateNovelChapters({ source_text: sourceText });
      setChapters(response.chapters);
      setValidationMessage(response.valid ? `后端校验通过 · ${response.chapter_count} 章` : response.error ?? "章节校验未通过");
      useAppStore.getState().pushToast(response.valid ? "章节事件已解析" : "章节校验未通过", response.valid ? "success" : "error");
    } catch (error) {
      setValidationMessage(`解析失败：${errMsg(error)}`);
      useAppStore.getState().pushToast(`解析失败：${errMsg(error)}`, "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreate = async () => {
    if (!canSubmit) return;
    setCreating(true);
    try {
      const response = await API.createNovelProject({
        title: title.trim(),
        source_text: sourceText,
        target_format: targetFormat,
        language,
      });
      setResult(response);
      setChapters(response.screenplay.source_chapters);
      setValidationMessage(`Schema 校验通过 · ${response.chapter_count} 章`);
      useAppStore.getState().pushToast("YAML 剧本初稿已生成", "success");
    } catch (error) {
      useAppStore.getState().pushToast(`生成失败：${errMsg(error)}`, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyYaml = async () => {
    if (!result?.yaml_text) return;
    await navigator.clipboard.writeText(result.yaml_text);
    useAppStore.getState().pushToast("YAML 已复制", "success");
  };

  const handleDownloadYaml = () => {
    if (!result?.yaml_text) return;
    const blob = new Blob([result.yaml_text], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.yaml_filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#f6f8f3] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" href="/app/projects">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-700 text-white">
              <PenLine className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold tracking-normal">{BRAND.name}</span>
          </Link>
          <div className="hidden items-center gap-2 lg:flex">
            <ToolbarLink href="/app/workspace">项目管理</ToolbarLink>
            <ToolbarLink href="/app/assets">素材库</ToolbarLink>
            <ToolbarLink href="/app/settings">模型设置</ToolbarLink>
            <ToolbarLink href="/app/projects" tone="primary">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              返回首页
            </ToolbarLink>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1500px] gap-5 px-5 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)_410px] lg:px-8">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_22px_70px_-60px_rgba(15,23,42,0.65)]">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Toonflow-style pipeline</p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight text-slate-950">AI 短剧生产工作台</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">按“策划 → 编剧 → 分镜 → 出片”组织小说改编流程。</p>
          </div>
          <div className="grid gap-2">
            {workflowModules.map((item) => (
              <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <item.icon className="h-4 w-4 text-emerald-700" aria-hidden />
                  {item.label}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </aside>

        <section className="grid gap-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_22px_70px_-62px_rgba(15,23,42,0.6)]">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 xl:flex-row xl:items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
                  <Sparkles className="h-4 w-4" aria-hidden />
                  小说转 YAML 剧本
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">导入原文并建立章节事件图谱</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  参考 Toonflow 的工作流，先把原著拆成章节事件，再调用 AI 生成结构化 YAML 剧本，最后进入 ArcReel 分镜与视频生产链路。
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                {productionSteps.map(([step, label], index) => (
                  <div key={step} className="min-w-24 rounded-md bg-white px-3 py-2 text-center">
                    <div className="font-mono text-xs text-emerald-700">0{index + 1}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-950">{step}</div>
                    <div className="mt-1 text-xs text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-5">
              <div className="grid gap-4 xl:grid-cols-[1fr_190px_150px]">
                <div className="grid gap-2">
                  <FieldLabel htmlFor="novel-title">项目名称</FieldLabel>
                  <input
                    id="novel-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    placeholder="例如：雨夜旧剧院"
                  />
                </div>
                <div className="grid gap-2">
                  <FieldLabel htmlFor="target-format">剧本类型</FieldLabel>
                  <select
                    id="target-format"
                    value={targetFormat}
                    onChange={(event) => setTargetFormat(event.target.value)}
                    className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="电影剧本">电影剧本</option>
                    <option value="短剧">短剧</option>
                    <option value="网剧">网剧</option>
                    <option value="动画分镜">动画分镜</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <FieldLabel htmlFor="language">输出语言</FieldLabel>
                  <select
                    id="language"
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="zh-CN">中文</option>
                    <option value="en-US">English</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <FieldLabel htmlFor="novel-source">小说正文</FieldLabel>
                  <div className="flex flex-wrap items-center gap-2">
                    <IconButton
                      onClick={() => {
                        setTitle((current) => current || "雨夜旧剧院");
                        setSourceText(sampleNovel);
                        setResult(null);
                      }}
                    >
                      <Clipboard className="h-4 w-4" aria-hidden />
                      填入示例
                    </IconButton>
                    <IconButton disabled={!canAnalyze} onClick={voidPromise(handleAnalyze)}>
                      {analyzing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ClipboardCheck className="h-4 w-4" aria-hidden />}
                      解析章节事件
                    </IconButton>
                  </div>
                </div>
                <textarea
                  id="novel-source"
                  value={sourceText}
                  onChange={(event) => {
                    setSourceText(event.target.value);
                    setResult(null);
                  }}
                  className="min-h-[420px] resize-y rounded-md border border-slate-200 bg-white p-4 font-mono text-sm leading-6 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="第 1 章 ...&#10;&#10;第 2 章 ...&#10;&#10;第 3 章 ..."
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{validationMessage}</span>
                  <span className={overLimit ? "font-semibold text-red-600" : undefined}>
                    已识别 {chapterCount} 章 · {sourceText.length.toLocaleString()} / {MAX_NOVEL_CHARS.toLocaleString()} 字
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={voidPromise(handleCreate)}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <WandSparkles className="h-4 w-4" aria-hidden />}
                  生成 YAML 剧本初稿
                </button>
                <ToolbarLink href="/app/settings">
                  <Settings className="h-4 w-4" aria-hidden />
                  配置 AI 模型
                </ToolbarLink>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">章节事件图谱</h3>
                  <p className="mt-1 text-sm text-slate-500">用于检查 AI 是否覆盖所有原著章节。</p>
                </div>
                <BookOpenText className="h-5 w-5 text-emerald-700" aria-hidden />
              </div>
              <div className="mt-4 grid max-h-[320px] gap-3 overflow-auto pr-1">
                {resultChapters.length > 0 ? resultChapters.map((chapter) => (
                  <article key={`${chapter.number}-${chapter.title}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-slate-950">{chapter.title}</h4>
                      <span className="rounded-full bg-white px-2 py-1 font-mono text-xs text-emerald-700">CH {chapter.number}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{chapter.summary}</p>
                  </article>
                )) : (
                  <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
                    点击“解析章节事件”后，这里会显示章节标题、摘要和来源编号。
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">生成结果总览</h3>
                  <p className="mt-1 text-sm text-slate-500">生成后可进入项目继续分镜和资产制作。</p>
                </div>
                {result ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    schema valid
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  ["章节", `${result?.chapter_count ?? chapterCount}`],
                  ["场景", `${sceneCount}`],
                  ["角色", `${characterCount}`],
                  ["输出", result ? result.yaml_filename : "等待生成"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">{label}</div>
                    <div className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-2">
                {result ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate(`/app/projects/${result.name}`)}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <PlayCircle className="h-4 w-4" aria-hidden />
                      进入项目继续打磨
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <IconButton onClick={voidPromise(handleCopyYaml)}>
                        <Clipboard className="h-4 w-4" aria-hidden />
                        复制 YAML
                      </IconButton>
                      <IconButton onClick={handleDownloadYaml}>
                        <Download className="h-4 w-4" aria-hidden />
                        下载 YAML
                      </IconButton>
                    </div>
                  </>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                    生成成功后，这里会出现项目入口、YAML 操作和生产链路。
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="grid gap-5">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-[0_22px_70px_-62px_rgba(15,23,42,0.7)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <FileCode2 className="h-4 w-4 text-emerald-300" aria-hidden />
                YAML screenplay
              </div>
              {result ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  valid
                </span>
              ) : null}
            </div>
            <pre className="min-h-[500px] max-h-[620px] overflow-auto p-4 font-mono text-xs leading-6 text-emerald-50">
              {result?.yaml_text ?? "生成后将在这里预览 YAML 剧本。"}
            </pre>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">生产功能入口</h3>
                <p className="mt-1 text-sm text-slate-500">生成项目后继续使用 ArcReel 能力。</p>
              </div>
              <Film className="h-5 w-5 text-emerald-700" aria-hidden />
            </div>
            <div className="mt-4 grid gap-2">
              <ToolbarLink href="/app/assets">
                <Boxes className="h-4 w-4" aria-hidden />
                角色素材库
              </ToolbarLink>
              <ToolbarLink href={result ? `/app/projects/${result.name}` : "/app/workspace"}>
                <Film className="h-4 w-4" aria-hidden />
                分镜生产
              </ToolbarLink>
              <ToolbarLink href="/app/workspace">
                <MonitorDot className="h-4 w-4" aria-hidden />
                任务监控
              </ToolbarLink>
              <ToolbarLink href="/app/settings">
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                视频配置
              </ToolbarLink>
              <ToolbarLink href="/app/settings">
                <Settings className="h-4 w-4" aria-hidden />
                系统设置
              </ToolbarLink>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
