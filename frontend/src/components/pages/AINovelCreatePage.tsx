import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Clipboard,
  FileCode2,
  Loader2,
  PenLine,
  Sparkles,
} from "lucide-react";
import { API, type AINovelProjectResponse } from "@/api";
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

export function AINovelCreatePage() {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [targetFormat, setTargetFormat] = useState("电影剧本");
  const [language, setLanguage] = useState("zh-CN");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<AINovelProjectResponse | null>(null);
  const chapterCount = useMemo(() => countChapters(sourceText), [sourceText]);
  const overLimit = sourceText.length > MAX_NOVEL_CHARS;
  const canSubmit = title.trim().length > 0 && chapterCount >= 3 && sourceText.trim().length > 0 && !overLimit && !creating;

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
      useAppStore.getState().pushToast("YAML 剧本初稿已生成", "success");
    } catch (error) {
      useAppStore.getState().pushToast(`生成失败：${errMsg(error)}`, "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8faf5] text-slate-950">
      <header className="border-b border-emerald-950/10 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" href="/app/projects">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-700 text-white">
              <PenLine className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold tracking-normal">{BRAND.name}</span>
          </Link>
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-emerald-900/15 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-emerald-50"
            href="/app/projects"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            返回首页
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <div className="rounded-lg border border-emerald-950/10 bg-white p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.5)]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
                <Sparkles className="h-4 w-4" aria-hidden />
                小说转 YAML 剧本
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-normal text-slate-950">
                生成可编辑的剧本初稿
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                粘贴 3 个章节以上的小说文本，AI Novel 会创建一个 ArcReel 项目，并保存 YAML 剧本与可继续分镜的 drama 脚本。
              </p>
            </div>
          </div>

          <div className="grid gap-5">
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

            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor="novel-source">小说正文</FieldLabel>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                  onClick={() => {
                    setTitle((current) => current || "雨夜旧剧院");
                    setSourceText(sampleNovel);
                  }}
                >
                  <Clipboard className="h-4 w-4" aria-hidden />
                  填入示例
                </button>
              </div>
              <textarea
                id="novel-source"
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                className="min-h-[340px] resize-y rounded-md border border-slate-200 bg-white p-4 font-mono text-sm leading-6 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder="第 1 章 ...&#10;&#10;第 2 章 ...&#10;&#10;第 3 章 ..."
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>已识别 {chapterCount} 章，至少需要 3 章。</span>
                <span className={overLimit ? "font-semibold text-red-600" : undefined}>
                  {sourceText.length.toLocaleString()} / {MAX_NOVEL_CHARS.toLocaleString()} 字
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={voidPromise(handleCreate)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileCode2 className="h-4 w-4" aria-hidden />}
              生成 YAML 剧本初稿
            </button>
          </div>
        </div>

        <aside className="grid gap-6">
          <div className="rounded-lg border border-emerald-950/10 bg-white p-5">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">转换状态</h2>
                <p className="mt-1 text-sm text-slate-500">章节解析、Schema 校验和项目创建会在同一次操作中完成。</p>
              </div>
              <BookOpenText className="h-6 w-6 text-emerald-700" aria-hidden />
            </div>
            <div className="mt-5 grid gap-3">
              {[
                ["章节数量", chapterCount >= 3 ? `${chapterCount} 章，可生成` : `${chapterCount} 章，继续补充`],
                ["输出格式", targetFormat],
                ["保存文件", result ? result.yaml_filename : "等待生成"],
                ["ArcReel 脚本", result ? result.script_filename : "等待生成"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold text-slate-900">{value}</span>
                </div>
              ))}
            </div>
            {result ? (
              <button
                type="button"
                onClick={() => navigate(`/app/projects/${result.name}`)}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                进入项目继续打磨
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <FileCode2 className="h-4 w-4 text-emerald-300" aria-hidden />
                YAML screenplay
              </div>
              {result ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  schema valid
                </span>
              ) : null}
            </div>
            <pre className="min-h-[460px] overflow-auto p-4 font-mono text-xs leading-6 text-emerald-50">
              {result?.yaml_text ?? "生成后将在这里预览 YAML 剧本。"}
            </pre>
          </div>
        </aside>
      </section>
    </main>
  );
}
