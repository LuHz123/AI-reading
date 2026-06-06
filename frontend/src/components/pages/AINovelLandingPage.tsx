import {
  ArrowRight,
  BookOpenText,
  Boxes,
  Braces,
  CheckCircle2,
  ClipboardCheck,
  FileCode2,
  Film,
  GitBranch,
  Layers3,
  Library,
  PenLine,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";
import { Link } from "wouter";
import { BRAND } from "@/branding";

const workflowSteps = [
  {
    label: "Chapter Parse",
    title: "识别 3 章以上长文本",
    body: "自动拆分第 1 章、第一章、Chapter 1 和 Markdown 标题，建立章节索引与改编范围。",
  },
  {
    label: "Story Bible",
    title: "抽取角色与剧情资料",
    body: "合并人物关系、冲突、场景候选和关键线索，避免长文本直接生成时遗漏上下文。",
  },
  {
    label: "Screenplay YAML",
    title: "生成可编辑剧本初稿",
    body: "输出 title、source_chapters、characters、scenes、dialogues、actions 等结构化 YAML 字段。",
  },
  {
    label: "Human Polish",
    title: "继续打磨和生产",
    body: "保留 ArcReel 的项目管理、资产库、版本回滚、分镜和供应商配置能力，继续扩展到视频流程。",
  },
];

const featureGroups = [
  {
    icon: BookOpenText,
    title: "长篇小说输入",
    body: "面向作者粘贴或上传多章节正文，先做章节级分析，再合并成全局故事资料。",
  },
  {
    icon: Braces,
    title: "YAML Schema 校验",
    body: "用稳定字段约束剧本结构，保证台词、动作、角色引用和来源章节都可追踪。",
  },
  {
    icon: Film,
    title: "ArcReel 分镜链路",
    body: "剧本初稿可以继续进入分镜、角色设计、资产生成和视频片段生成工作流。",
  },
  {
    icon: GitBranch,
    title: "版本与回滚",
    body: "继承 ArcReel 的版本历史思路，保留每次重写的剧本版本，方便比较和恢复。",
  },
  {
    icon: Library,
    title: "角色与资产库",
    body: "将角色、场景、道具从 YAML 中拆出为资产，后续用于提示词、分镜和视觉一致性。",
  },
  {
    icon: Settings,
    title: "多供应商配置",
    body: "延续 ArcReel 的模型供应商配置入口，后续可接 OpenAI 兼容、Gemini、火山方舟等服务。",
  },
];

const schemaRows = [
  ["title", "string", "剧本标题，便于作者识别输出版本。"],
  ["source_chapters", "array", "记录章节编号、标题和摘要，支持回溯改编来源。"],
  ["characters", "array", "全局角色表，使用稳定 id 解决重名和别名问题。"],
  ["scenes", "array", "分场剧本正文，承载地点、时间、摘要、角色、台词和动作。"],
  ["dialogues", "array", "拆分 character、emotion、line，方便表演、配音和继续编辑。"],
];

const sampleYaml = `title: "雨夜旧剧院"
source_chapters:
  - number: 1
    title: "雨夜钥匙"
    summary: "林澈收到神秘信件，铜钥匙和剧票指向海棠剧院。"
characters:
  - id: "char_lin_che"
    name: "林澈"
    role: "主角"
scenes:
  - id: "scene_001"
    source_chapter: 1
    location: "老街雨巷"
    time: "夜晚"
    dialogues:
      - character: "char_lin_che"
        emotion: "迟疑"
        line: "如果这是线索，我会走到最后。"
    actions:
      - "雨水打湿旧剧票，铜钥匙在掌心发凉。"`;

const sourcePreview = `第 1 章 雨夜钥匙
林澈在老街尽头收到一封没有署名的信。信封里只有一张旧剧票和一把铜钥匙。

第 2 章 旧剧院
许岚陪他推开海棠剧院的大门，舞台深处传来仍在运转的钟声。

第 3 章 舞台对峙
顾衡站在追光灯下，要求林澈交出钥匙，并说那些记忆不该回来。`;

function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <a className="text-sm font-medium text-slate-600 transition hover:text-emerald-700" href={href}>
      {children}
    </a>
  );
}

function LandingButton({
  href,
  children,
  tone = "primary",
}: {
  href: string;
  children: React.ReactNode;
  tone?: "primary" | "secondary";
}) {
  const cls =
    tone === "primary"
      ? "bg-emerald-700 text-white shadow-[0_18px_38px_-24px_rgba(4,120,87,0.8)] hover:bg-emerald-800"
      : "border border-emerald-900/15 bg-white text-slate-800 hover:border-emerald-800/30 hover:bg-emerald-50";
  return (
    <Link
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition ${cls}`}
      href={href}
    >
      {children}
    </Link>
  );
}

function FeatureIcon({ icon: Icon }: { icon: typeof BookOpenText }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
      <Icon className="h-5 w-5" aria-hidden />
    </div>
  );
}

export function AINovelLandingPage() {
  return (
    <main className="min-h-screen bg-[#f8faf5] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-emerald-950/10 bg-[#f8faf5]/92 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" href="/app/projects">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-700 text-white">
              <PenLine className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold tracking-tight">{BRAND.name}</span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex" aria-label="AI Novel sections">
            <NavLink href="#workflow">工作流</NavLink>
            <NavLink href="#features">ArcReel 能力</NavLink>
            <NavLink href="#schema">YAML Schema</NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <LandingButton href="/app/workspace" tone="secondary">
              工作台
            </LandingButton>
            <LandingButton href="/app/novel/new">
              新建项目
              <ArrowRight className="h-4 w-4" aria-hidden />
            </LandingButton>
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-12 px-5 py-12 sm:px-6 lg:grid-cols-[0.94fr_1.06fr] lg:px-8 lg:py-16">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 shadow-sm">
            <Sparkles className="h-4 w-4" aria-hidden />
            小说改编为结构化 YAML 剧本
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.03] tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
            Turn chapters into a screenplay writers can actually edit.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700">
            {BRAND.name} 将 3 个章节以上的小说文本解析为角色表、分场剧本、台词、动作和来源章节，导出可校验的 YAML 初稿。作者拿到的不是一段散文，而是一份可以继续打磨的剧本结构。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LandingButton href="/app/novel/new">
              开始转换小说
              <Upload className="h-4 w-4" aria-hidden />
            </LandingButton>
            <LandingButton href="#schema" tone="secondary">
              查看 Schema
              <FileCode2 className="h-4 w-4" aria-hidden />
            </LandingButton>
          </div>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-4 border-t border-emerald-950/10 pt-6">
            {[
              ["3+", "章节起步"],
              ["YAML", "结构化输出"],
              ["ArcReel", "生产链路"],
            ].map(([value, label]) => (
              <div key={label}>
                <div className="text-2xl font-semibold text-emerald-800">{value}</div>
                <div className="mt-1 text-sm text-slate-600">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-lg border border-emerald-950/10 bg-white shadow-[0_30px_80px_-55px_rgba(15,23,42,0.55)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">AI Novel Draft Console</div>
                <div className="text-xs text-slate-500">3 chapters detected · schema valid</div>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Ready
              </div>
            </div>
            <div className="grid gap-0 lg:grid-cols-2">
              <div className="border-b border-slate-200 p-4 lg:border-b-0 lg:border-r">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <BookOpenText className="h-4 w-4 text-emerald-700" aria-hidden />
                  Novel input
                </div>
                <pre className="min-h-96 whitespace-pre-wrap rounded-md bg-slate-50 p-4 font-mono text-[12px] leading-6 text-slate-700">
                  {sourcePreview}
                </pre>
              </div>
              <div className="p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FileCode2 className="h-4 w-4 text-emerald-700" aria-hidden />
                  YAML screenplay
                </div>
                <pre className="min-h-96 overflow-auto rounded-md bg-slate-950 p-4 font-mono text-[12px] leading-6 text-emerald-50">
                  {sampleYaml}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-y border-emerald-950/10 bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">workflow</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-normal text-slate-950">
              从小说章节到可编辑剧本初稿
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-650">
              先做可解释的结构化分析，再生成 YAML。这个流程保留来源章节和人物资料，方便作者审阅，也方便后续进入分镜和视频生产。
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map((step, index) => (
              <article key={step.label} className="rounded-lg border border-slate-200 bg-[#f8faf5] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    {step.label}
                  </span>
                  <span className="font-mono text-sm text-slate-400">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-650">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-[#f8faf5] py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">ArcReel inside</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-normal text-slate-950">
                保留 ArcReel 好用的创作工作台能力
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-650">
                AI Novel 的入口聚焦小说转剧本，但底层继续复用 ArcReel 的项目管理、分镜资产、任务队列、版本历史和模型供应商配置。
              </p>
              <div className="mt-8">
                <LandingButton href="/app/assets" tone="secondary">
                  打开资产库
                  <Boxes className="h-4 w-4" aria-hidden />
                </LandingButton>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {featureGroups.map((feature) => (
                <article key={feature.title} className="rounded-lg border border-slate-200 bg-white p-5">
                  <FeatureIcon icon={feature.icon} />
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-650">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="schema" className="border-y border-emerald-950/10 bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">yaml schema</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-normal text-slate-950">
              Schema-first 的剧本输出
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-650">
              文档定义了每个字段的类型、必填规则和设计原因。核心原则是让 AI 输出能被校验、能被作者编辑、能继续进入分镜和视频生成。
            </p>
            <div className="mt-8 rounded-lg border border-emerald-900/15 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <ClipboardCheck className="mt-1 h-5 w-5 text-emerald-800" aria-hidden />
                <div>
                  <h3 className="font-semibold text-slate-950">最小校验规则</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    输入至少 3 章；`source_chapters` 至少 3 项；每个 scene 必须有 id、location、time、summary、characters、dialogues；角色引用必须能映射到全局角色表。
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-[#f8faf5]">
            <div className="grid grid-cols-[0.32fr_0.2fr_0.48fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span>Field</span>
              <span>Type</span>
              <span>Reason</span>
            </div>
            {schemaRows.map(([field, type, reason]) => (
              <div
                key={field}
                className="grid grid-cols-[0.32fr_0.2fr_0.48fr] gap-3 border-b border-slate-200 px-4 py-4 last:border-b-0"
              >
                <code className="font-mono text-sm font-semibold text-emerald-800">{field}</code>
                <span className="font-mono text-sm text-slate-600">{type}</span>
                <span className="text-sm leading-6 text-slate-650">{reason}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8faf5] py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 rounded-lg border border-emerald-950/10 bg-slate-950 p-8 text-white md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                <Layers3 className="h-4 w-4" aria-hidden />
                AI Novel workspace
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal">把下一部小说改成可生产的剧本结构。</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                从 YAML 初稿开始，继续进入 ArcReel 的角色、场景、道具、分镜、视频和导出流程。
              </p>
            </div>
            <LandingButton href="/app/workspace">
              进入工作台
              <ArrowRight className="h-4 w-4" aria-hidden />
            </LandingButton>
          </div>
        </div>
      </section>
    </main>
  );
}
