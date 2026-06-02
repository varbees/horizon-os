import { useEffect, useMemo, useState } from "react";
import {
  Inbox as InboxIcon,
  Link2,
  Megaphone,
  Plus,
  Sparkles,
  Wand2,
} from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import {
  addResource,
  addSocialPost,
  fetchInbox,
  updateResource,
  updateSocialPost,
} from "../lib/inboxApi.js";
import { resourceSeeds, socialPostSeeds, socialSkillCatalog } from "../data/horizon.js";

const RESOURCE_STATUSES = ["inbox", "assigned", "actioned", "archived"];
const POST_STATUSES = ["idea", "draft", "scheduled", "published"];
const SKILL_CATEGORIES = ["Strategy", "Create", "Analyze"];

const statusTone = {
  inbox: "border-brass/35 bg-brass/12 text-brass",
  assigned: "border-primary/30 bg-primary/10 text-primary",
  actioned: "border-signal/30 bg-signal/12 text-signal",
  archived: "border-outlineVariant bg-white/60 text-paper/46",
  idea: "border-brass/35 bg-brass/12 text-brass",
  draft: "border-primary/30 bg-primary/10 text-primary",
  scheduled: "border-rust/30 bg-rust/10 text-rust",
  published: "border-signal/30 bg-signal/12 text-signal",
};

const categoryTone = {
  Strategy: "text-primary",
  Create: "text-signal",
  Analyze: "text-brass",
};

const seedState = {
  resources: resourceSeeds.map((r) => ({
    id: r.id,
    title: r.title,
    source: r.source,
    kind: r.kind,
    project_id: r.projectId,
    status: r.status,
    note: r.note,
    next_action: r.next,
    tags_json: JSON.stringify(r.tags ?? []),
  })),
  posts: socialPostSeeds.map((p) => ({
    id: p.id,
    platform: p.platform,
    format: p.format,
    hook: p.hook,
    body: p.body,
    status: p.status,
    skill_id: p.skillId,
    project_id: p.projectId,
  })),
  skills: socialSkillCatalog.map((s, i) => ({ ...s, sort_order: i })),
};

function nextStatus(list, current) {
  const idx = list.indexOf(current);
  return list[(idx + 1) % list.length];
}

export default function Inbox() {
  const [data, setData] = useState(seedState);
  const [source, setSource] = useState("seed");

  useEffect(() => {
    let active = true;
    fetchInbox()
      .then((live) => {
        if (!active || !live) return;
        setData({
          resources: live.resources ?? [],
          posts: live.posts ?? [],
          skills: live.skills ?? [],
        });
        setSource("live");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const skillsByCategory = useMemo(() => {
    const map = new Map(SKILL_CATEGORIES.map((c) => [c, []]));
    for (const skill of data.skills) {
      if (!map.has(skill.category)) map.set(skill.category, []);
      map.get(skill.category).push(skill);
    }
    return map;
  }, [data.skills]);

  function cycleResource(id) {
    setData((prev) => ({
      ...prev,
      resources: prev.resources.map((r) => (r.id === id ? { ...r, status: nextStatus(RESOURCE_STATUSES, r.status) } : r)),
    }));
    const target = data.resources.find((r) => r.id === id);
    if (source === "live" && target) updateResource(id, { status: nextStatus(RESOURCE_STATUSES, target.status) }).catch(() => {});
  }

  function cyclePost(id) {
    setData((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => (p.id === id ? { ...p, status: nextStatus(POST_STATUSES, p.status) } : p)),
    }));
    const target = data.posts.find((p) => p.id === id);
    if (source === "live" && target) updateSocialPost(id, { status: nextStatus(POST_STATUSES, target.status) }).catch(() => {});
  }

  function captureResource(resource) {
    const local = { id: `local-${Date.now()}`, status: "inbox", tags_json: "[]", ...resource };
    setData((prev) => ({ ...prev, resources: [local, ...prev.resources] }));
    if (source === "live") addResource(resource).catch(() => {});
  }

  function capturePost(post) {
    const local = { id: `local-${Date.now()}`, status: "idea", ...post };
    setData((prev) => ({ ...prev, posts: [local, ...prev.posts] }));
    if (source === "live") addSocialPost(post).catch(() => {});
  }

  const inboxCount = data.resources.filter((r) => r.status === "inbox").length;

  return (
    <div>
      <SectionHeader
        eyebrow="Resource & Content Inbox v0.6"
        title="Capture links and turn shipped work into public proof."
        copy="Nothing useful should get lost. Capture a resource, tag it to a project, advance it to a next action, and let the social skills pack turn every ship into a build-in-public artifact."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Stat icon={InboxIcon} tone="text-brass" label="In inbox" value={`${inboxCount}`} sub={`${data.resources.length} resources total`} />
        <Stat icon={Megaphone} tone="text-signal" label="Content backlog" value={`${data.posts.length}`} sub={`${data.posts.filter((p) => p.status !== "published").length} unshipped`} />
        <Stat icon={Wand2} tone="text-primary" label="Social skills" value={`${data.skills.length}`} sub="v1.3.0 pack, catalogued" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Resources</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Capture, tag, action</h2>
            </div>
            <Link2 className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <ResourceForm onCapture={captureResource} />
          <div className="mt-4 space-y-3">
            {data.resources.map((r) => (
              <article key={r.id} className="rounded-md border border-outlineVariant bg-surfaceVariant p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-paper">{r.title}</h3>
                    <p className="mt-0.5 break-words font-mono text-[11px] text-paper/44">{r.source}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => cycleResource(r.id)}
                    title="advance status"
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] transition ${statusTone[r.status] ?? statusTone.inbox}`}
                  >
                    {r.status}
                  </button>
                </div>
                {r.note ? <p className="mt-2 text-sm leading-6 text-paper/60">{r.note}</p> : null}
                {r.next_action ? <p className="mt-2 text-sm font-bold leading-6 text-signal">{r.next_action}</p> : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {r.kind ? <span className="rounded-md border border-outlineVariant bg-white/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/52">{r.kind}</span> : null}
                  {r.project_id ? <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">{r.project_id}</span> : null}
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Build-in-public</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Content backlog</h2>
            </div>
            <Megaphone className="h-7 w-7 text-signal" aria-hidden="true" />
          </div>
          <PostForm onCapture={capturePost} skills={data.skills} />
          <div className="mt-4 space-y-3">
            {data.posts.map((p) => (
              <article key={p.id} className="rounded-md border border-outlineVariant bg-surfaceVariant p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-outlineVariant bg-white/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/52">{p.platform}</span>
                    <span className="rounded-md border border-outlineVariant bg-white/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/52">{p.format}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => cyclePost(p.id)}
                    title="advance status"
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] transition ${statusTone[p.status] ?? statusTone.idea}`}
                  >
                    {p.status}
                  </button>
                </div>
                <p className="mt-2 text-sm font-black leading-6 text-paper">{p.hook}</p>
                {p.body ? <p className="mt-1 text-sm leading-6 text-paper/58">{p.body}</p> : null}
                {p.skill_id ? (
                  <p className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {p.skill_id}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-5">
        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Skill catalog</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Social media skills v1.3.0</h2>
            </div>
            <Wand2 className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <p className="mt-2 text-sm leading-6 text-paper/58">
            Extracted to <span className="font-mono text-xs text-paper/70">skills/social-media/extracted/</span>. Start with
            <span className="font-bold text-paper"> Social Media Context</span> to set voice once, then pull a Create skill per ship.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {SKILL_CATEGORIES.map((category) => (
              <div key={category}>
                <p className={`font-mono text-[11px] uppercase tracking-[0.2em] ${categoryTone[category] ?? "text-paper/46"}`}>{category}</p>
                <div className="mt-3 space-y-2">
                  {(skillsByCategory.get(category) ?? []).map((skill) => (
                    <article key={skill.id} className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-black text-paper">{skill.name}</h3>
                        <span className="font-mono text-[10px] text-paper/42">v{skill.version}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-paper/56">{skill.trigger}</p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, tone, label, value, sub }) {
  return (
    <Panel className="flex items-center gap-4 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surfaceVariant">
        <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/46">{label}</p>
        <p className="text-xl font-black text-paper">{value}</p>
        <p className="truncate text-xs text-paper/52">{sub}</p>
      </div>
    </Panel>
  );
}

function ResourceForm({ onCapture }) {
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onCapture({ title: title.trim(), source: sourceUrl.trim(), kind: "link", status: "inbox" });
    setTitle("");
    setSourceUrl("");
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-md border border-outlineVariant bg-surfaceVariant p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Resource title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-outlineVariant bg-white/70 px-2 py-1.5 text-sm text-paper outline-none"
        />
        <input
          type="text"
          placeholder="URL or path"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-outlineVariant bg-white/70 px-2 py-1.5 font-mono text-xs text-paper outline-none"
        />
        <button type="submit" className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-black text-onPrimary">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Capture
        </button>
      </div>
    </form>
  );
}

function PostForm({ onCapture, skills }) {
  const [hook, setHook] = useState("");
  const [platform, setPlatform] = useState("linkedin");
  const [skillId, setSkillId] = useState("post-writer-sms");

  function submit(e) {
    e.preventDefault();
    if (!hook.trim()) return;
    onCapture({ hook: hook.trim(), platform, format: "post", skill_id: skillId, status: "idea" });
    setHook("");
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-md border border-outlineVariant bg-surfaceVariant p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Hook / first line"
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          className="min-w-0 flex-1 basis-full rounded-md border border-outlineVariant bg-white/70 px-2 py-1.5 text-sm text-paper outline-none"
        />
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="rounded-md border border-outlineVariant bg-white/70 px-2 py-1.5 text-sm text-paper outline-none">
          {["linkedin", "x", "threads", "bluesky", "instagram", "youtube"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={skillId} onChange={(e) => setSkillId(e.target.value)} className="min-w-0 flex-1 rounded-md border border-outlineVariant bg-white/70 px-2 py-1.5 text-sm text-paper outline-none">
          {skills.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button type="submit" className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-black text-onPrimary">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </button>
      </div>
    </form>
  );
}
