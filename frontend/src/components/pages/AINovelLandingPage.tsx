import { ArrowRight, FileCode2, PenLine, Sparkles } from "lucide-react";
import { Link } from "wouter";

const previewCards = [
  {
    title: "迷雾回响",
    type: "悬疑短剧",
    image: "/style-thumbnails/live_premium_drama.png",
    gradient: "from-[#f2f0e8] via-[#cfd8d1] to-[#233238]",
    accent: "bg-cyan-300",
    rotate: "-rotate-[8deg]",
    offset: "translate-y-8",
  },
  {
    title: "逆光告白",
    type: "都市情感",
    image: "/style-thumbnails/live_wong.png",
    gradient: "from-[#fbf0ef] via-[#d89ba5] to-[#40202c]",
    accent: "bg-rose-300",
    rotate: "rotate-[4deg]",
    offset: "-translate-y-8",
  },
  {
    title: "月下代码",
    type: "科幻成长",
    image: "/style-thumbnails/live_cyberpunk.png",
    gradient: "from-[#eff7ff] via-[#8ec7d4] to-[#132335]",
    accent: "bg-violet-300",
    rotate: "rotate-[10deg]",
    offset: "translate-y-14",
  },
];

function PosterCard({
  title,
  type,
  image,
  gradient,
  accent,
  rotate,
  offset,
}: {
  title: string;
  type: string;
  image: string;
  gradient: string;
  accent: string;
  rotate: string;
  offset: string;
}) {
  return (
    <article
      aria-label={`${title} ${type}`}
      className={`relative h-[310px] w-[210px] shrink-0 overflow-hidden rounded-[22px] border border-white/20 bg-gradient-to-br ${gradient} shadow-[0_34px_90px_rgba(0,0,0,0.45)] ${rotate} ${offset}`}
    >
      <img
        src={image}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_42%_26%,rgba(255,255,255,0.78),transparent_28%),linear-gradient(180deg,transparent_36%,rgba(0,0,0,0.68)_100%)]" />
      <div className="absolute left-5 top-5 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
        <span className="text-xs font-semibold text-white/80">{type}</span>
      </div>
      <div className="absolute inset-x-5 bottom-5 text-white">
        <div className="mb-3 h-px bg-white/35" />
        <h2 className="text-2xl font-semibold leading-tight tracking-normal">{title}</h2>
        <p className="mt-2 text-xs leading-5 text-white/72">
          YAML 剧本 · 角色弧光 · 分场改编
        </p>
      </div>
    </article>
  );
}

function ScriptSheet() {
  return (
    <div className="absolute -bottom-6 left-1/2 hidden w-[470px] -translate-x-1/2 rotate-[-4deg] rounded-[26px] border border-white/14 bg-white/[0.08] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.48)] backdrop-blur-xl lg:block">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <FileCode2 className="h-4 w-4 text-cyan-200" />
          <span className="text-sm font-semibold">Screenplay YAML</span>
        </div>
        <span className="rounded-full bg-white/12 px-3 py-1 text-xs text-white/70">
          schema valid
        </span>
      </div>
      <pre className="max-h-[210px] overflow-hidden whitespace-pre-wrap rounded-[18px] bg-black/45 p-4 font-mono text-[11px] leading-5 text-cyan-50/88">
{`title: "迷雾回响"
source_chapters:
  - number: 1
    summary: "主角收到匿名录像。"
characters:
  - id: "lead_01"
    name: "许青"
scenes:
  - id: "scene_001"
    location: "废弃影棚"
    time: "夜"
    dialogues:
      - character: "lead_01"
        emotion: "克制"
        line: "真相只差最后一帧。"`}
      </pre>
    </div>
  );
}

export function AINovelLandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(36,176,196,0.18),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(225,80,148,0.16),transparent_24%),linear-gradient(180deg,#111_0%,#050505_46%,#030303_100%)]"
      />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/16" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 lg:px-14">
        <Link
          href="/app/projects"
          className="inline-flex items-center gap-3 text-white no-underline"
          aria-label="STORYPLAY"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full border border-white/22 bg-white/10">
            <PenLine className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="text-xl font-semibold tracking-[0.18em]">STORYPLAY</span>
        </Link>

        <div className="hidden rounded-full bg-gradient-to-r from-[#924dff] via-[#d844b5] to-[#ff875f] px-5 py-2 text-sm font-medium shadow-[0_16px_45px_rgba(193,64,172,0.25)] md:block">
          限时福利！小说转剧本工作台开放体验
        </div>

        <nav className="hidden items-center gap-7 text-sm text-white/72 md:flex" aria-label="首页导航">
          <a className="transition hover:text-white" href="#demo">
            使用教程
          </a>
          <Link
            className="rounded-full bg-white px-5 py-2 font-semibold text-black transition hover:bg-cyan-50"
            href="/app/workspace"
          >
            工作台
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-[1380px] items-center gap-10 px-6 pb-16 pt-6 sm:px-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-14">
        <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-sm font-semibold text-cyan-100">
            <Sparkles className="h-4 w-4" aria-hidden />
            短剧剧本创作平台
          </div>
          <h1 className="text-[44px] font-semibold leading-[1.08] tracking-normal text-white sm:text-[64px] lg:text-[76px]">
            让AI辅助故事创作者成为超级个体
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/72 lg:mx-0">
            真人、AI短剧剧本创作效率提升10倍。将 3 个章节以上小说文本自动转换为结构化 YAML 剧本初稿，继续编辑角色、分场、台词、动作和分镜资产。
          </p>
          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row lg:items-start">
            <Link
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-white px-8 text-base font-semibold text-black shadow-[0_22px_70px_rgba(255,255,255,0.2)] transition hover:bg-cyan-50"
              href="/app/workspace"
            >
              立即体验
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <Link
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/16 bg-white/[0.06] px-8 text-base font-semibold text-white/86 transition hover:border-white/28 hover:bg-white/[0.1]"
              href="/app/workspace"
            >
              新建剧本项目
            </Link>
          </div>
        </div>

        <div id="demo" className="relative mx-auto flex min-h-[520px] w-full max-w-[720px] items-center justify-center">
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-3xl"
          />
          <div className="relative flex items-center justify-center -space-x-8">
            {previewCards.map((card) => (
              <PosterCard key={card.title} {...card} />
            ))}
          </div>
          <ScriptSheet />
        </div>
      </section>
    </main>
  );
}
