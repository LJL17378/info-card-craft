const API_BASE = new URL(".", import.meta.url);

const styles = `
  :host {
    display: inline-block; width: var(--host-width, 560px); max-width: 100%;
    color-scheme: light dark; contain: content;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  * { box-sizing: border-box; }
  .state {
    width: min(100%, 420px); min-height: 150px; padding: 22px; border-radius: 20px;
    display: grid; place-items: center; text-align: center; color: #77747d;
    background: #fffdf9; border: 1px solid rgba(25,25,30,.1); font-size: 13px;
  }
  .spinner {
    width: 22px; height: 22px; border: 2px solid rgba(25,25,30,.12);
    border-top-color: #ff6b84; border-radius: 50%; animation: spin .8s linear infinite;
  }
  .error strong { display: block; color: #b83b53; margin-bottom: 6px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .craft-card {
    width: 100%; padding: var(--gap); display: flex; flex-direction: column; gap: var(--gap);
    overflow: hidden; color: var(--text); background: var(--surface);
    border: var(--border); border-radius: var(--radius); box-shadow: var(--shadow);
  }
  .preset-glass {
    background: linear-gradient(135deg, color-mix(in srgb, var(--surface) 92%, transparent), color-mix(in srgb, var(--accent) 18%, var(--surface)));
    backdrop-filter: blur(18px);
  }
  .preset-poster {
    background: radial-gradient(circle at 90% 0%, color-mix(in srgb, var(--accent) 24%, transparent), transparent 42%), var(--surface);
  }
  .craft-hero {
    min-height: 112px; padding: var(--pad); border-radius: calc(var(--radius) * .72);
    display: flex; align-items: flex-end; gap: 13px; color: white;
    background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 28%, #171922));
    background-size: cover; background-position: center;
  }
  .preset-minimal .craft-hero {
    min-height: auto; padding: calc(var(--pad) * .65) 2px; color: var(--text); background: transparent;
  }
  .craft-hero.align-center { flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .craft-avatar {
    width: 58px; height: 58px; flex: 0 0 auto; border: 2px solid rgba(255,255,255,.78);
    border-radius: calc(var(--radius) * .56); object-fit: cover;
  }
  .craft-avatar-wrap { width: 58px; height: 58px; position: relative; flex: 0 0 auto; }
  .craft-avatar-frame {
    width: 76px; height: 76px; position: absolute; inset: 50% auto auto 50%;
    transform: translate(-50%, -50%); object-fit: contain; pointer-events: none;
  }
  .preset-minimal .craft-avatar { border-color: color-mix(in srgb, var(--text) 15%, transparent); }
  .craft-avatar-fallback {
    display: grid; place-items: center; background: rgba(255,255,255,.18);
    font-size: 21px; font-weight: 850;
  }
  .preset-minimal .craft-avatar-fallback { color: white; background: var(--accent); }
  .craft-identity { min-width: 0; }
  .craft-title-row { display: flex; align-items: center; gap: 7px; min-width: 0; }
  .craft-title {
    margin: 0; overflow: hidden; font-size: clamp(17px, 4vw, 22px); line-height: 1.08;
    letter-spacing: -.035em; text-overflow: ellipsis; white-space: nowrap;
  }
  .craft-badge {
    padding: 3px 6px; border-radius: 6px; flex: 0 0 auto; color: white;
    background: var(--accent); font-size: 8px; font-weight: 850;
  }
  .craft-subtitle { margin: 5px 0 0; overflow: hidden; opacity: .76; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
  .craft-text { padding: 4px var(--pad); }
  .craft-label { display: block; margin-bottom: 7px; color: var(--accent); font-size: 8px; font-weight: 850; letter-spacing: .13em; }
  .craft-text p { margin: 0; opacity: .74; font-size: 11px; line-height: 1.65; }
  .craft-stats { display: grid; gap: 7px; }
  .craft-stat {
    min-width: 0; padding: 10px 11px; border: 1px solid color-mix(in srgb, var(--text) 7%, transparent);
    border-radius: calc(var(--radius) * .42); background: color-mix(in srgb, var(--text) 4%, transparent);
  }
  .craft-stat span { display: block; margin-bottom: 5px; overflow: hidden; opacity: .52; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
  .craft-stat strong { display: block; overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
  .craft-image { width: 100%; display: block; border-radius: calc(var(--radius) * .55); object-fit: cover; }
  .craft-image.ratio-wide { aspect-ratio: 16 / 8; }
  .craft-image.ratio-square { aspect-ratio: 1; }
  .craft-links { display: flex; gap: 7px; flex-wrap: wrap; }
  .craft-link {
    min-height: 36px; padding: 0 13px; border-radius: calc(var(--radius) * .42);
    display: inline-flex; align-items: center; justify-content: center; gap: 12px;
    flex: 1 1 auto; color: white; background: var(--accent); text-decoration: none;
    font-size: 9px; font-weight: 760;
  }
  .craft-link span { margin-left: auto; }
  .craft-link.secondary { color: var(--text); border: 1px solid color-mix(in srgb, var(--text) 13%, transparent); background: transparent; }
  .craft-link.text { color: var(--accent); background: transparent; }
  .craft-divider { width: 100%; height: 1px; margin: 1px 0; border: 0; background: color-mix(in srgb, var(--text) 10%, transparent); }
  .direction-vertical .craft-stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .preset-github { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .preset-github .craft-hero {
    min-height: 96px; padding: 12px 8px 18px; align-items: center; color: var(--text);
    border-bottom: 1px solid #30363d; border-radius: 0; background: transparent !important;
  }
  .preset-github .craft-avatar, .preset-github .craft-avatar-fallback { border: 1px solid #30363d; border-radius: 50%; }
  .preset-github .craft-title { font-weight: 600; }
  .preset-github .craft-badge { color: #8c959f; border: 1px solid #30363d; border-radius: 999px; background: #21262d; }
  .preset-github .craft-label { color: #8c959f; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .preset-github .craft-stat { border-color: #30363d; border-radius: 6px; background: #161b22; }
  .preset-github .craft-stat strong { color: #f0f6fc; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .preset-github .craft-link { border: 1px solid rgba(240,246,252,.1); border-radius: 6px; background: #238636; }
  .preset-github .craft-link.secondary { color: #f0f6fc; border-color: #30363d; background: #21262d; }
  .preset-bilibili {
    background: radial-gradient(circle at 95% 0%, rgba(251,114,153,.16), transparent 34%), var(--surface);
  }
  .preset-bilibili .craft-hero {
    min-height: 132px;
    background: linear-gradient(0deg, rgba(38,24,32,.54), rgba(251,114,153,.08)), linear-gradient(135deg, #fb7299, #8d6de8);
  }
  .preset-bilibili .craft-avatar, .preset-bilibili .craft-avatar-fallback {
    border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 16px rgba(42,21,32,.24);
  }
  .preset-bilibili .craft-avatar-wrap { width: 68px; height: 68px; }
  .preset-bilibili .craft-avatar { width: 68px; height: 68px; }
  .preset-bilibili .craft-avatar-frame { width: 96px; height: 96px; }
  .preset-bilibili .craft-identity { text-shadow: 0 1px 5px rgba(0,0,0,.55); }
  .preset-bilibili .craft-badge { border-radius: 5px; background: #fb7299; }
  .preset-bilibili .craft-stat { border-color: rgba(251,114,153,.14); background: rgba(251,114,153,.065); }
  .preset-bilibili .craft-link { border-radius: 999px; background: #fb7299; }
  @media (max-width: 380px) { .craft-stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
  @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
`;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function legacyBlocks(data) {
  return [
    {
      id: "legacy-hero", type: "hero", avatar: data.identity.avatar, avatarFrame: "",
      title: data.identity.title, subtitle: data.identity.subtitle,
      badge: data.identity.badge, background: data.content.background, align: "left",
    },
    ...(data.content.description ? [{ id: "legacy-text", type: "text", label: "", content: data.content.description }] : []),
    ...(data.stats.length ? [{ id: "legacy-stats", type: "stats", columns: Math.min(data.stats.length, 4), items: data.stats }] : []),
    ...(data.actions.url ? [{ id: "legacy-link", type: "links", items: [{ label: data.actions.label, url: data.actions.url, style: "primary" }] }] : []),
  ];
}

class InfoCardCraft extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._requestId = 0;
    this._observer = new MutationObserver((records) => {
      if (records.some(({ attributeName }) =>
        attributeName === "card-id" || attributeName === "version" || attributeName?.startsWith("input-")
      )) this.load();
    });
  }

  connectedCallback() {
    this._observer.observe(this, { attributes: true });
    this.load();
  }

  disconnectedCallback() {
    this._observer.disconnect();
  }

  inputs() {
    const result = {};
    for (const attribute of this.attributes) {
      if (attribute.name.startsWith("input-")) result[attribute.name.slice(6)] = attribute.value;
    }
    return result;
  }

  setState(kind, message = "") {
    const root = this.shadowRoot;
    root.replaceChildren();
    const style = element("style");
    style.textContent = styles;
    const state = element("div", `state ${kind}`);
    if (kind === "loading") {
      const spinner = element("span", "spinner");
      spinner.setAttribute("aria-label", "正在加载卡片");
      state.append(spinner);
    } else {
      const wrap = element("div");
      wrap.append(
        element("strong", "", kind === "error" ? "卡片暂时无法加载" : "这张卡片还没有内容"),
        element("span", "", message),
      );
      state.append(wrap);
    }
    root.append(style, state);
  }

  async load() {
    const cardId = this.getAttribute("card-id");
    if (!cardId) return this.setState("error", "缺少 card-id 属性");
    const requestId = ++this._requestId;
    this.style.setProperty("--host-width", "420px");
    this.setState("loading");
    const url = new URL(`api/public/cards/${encodeURIComponent(cardId)}/render`, API_BASE);
    const version = this.getAttribute("version");
    if (version) url.searchParams.set("version", version);
    for (const [key, value] of Object.entries(this.inputs())) url.searchParams.set(`input-${key}`, value);
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      if (requestId !== this._requestId) return;
      this.render(payload.data, payload.theme);
      this.dispatchEvent(new CustomEvent("info-card-loaded", { detail: { cardId, version: payload.version } }));
    } catch (error) {
      if (requestId !== this._requestId) return;
      this.setState("error", error instanceof Error ? error.message : "未知错误");
      this.dispatchEvent(new CustomEvent("info-card-error", {
        detail: { cardId, message: error instanceof Error ? error.message : "未知错误" },
      }));
    }
  }

  render(data, theme) {
    const width = theme.direction === "vertical" ? Math.min(theme.width, 380) : theme.width;
    this.style.setProperty("--host-width", `${width}px`);
    const root = this.shadowRoot;
    root.replaceChildren();
    const style = element("style");
    style.textContent = styles;
    const card = element("article", `craft-card card preset-${theme.preset} direction-${theme.direction}`);
    card.style.setProperty("--accent", theme.accent);
    card.style.setProperty("--surface", theme.surface);
    card.style.setProperty("--text", theme.text);
    card.style.setProperty("--radius", `${theme.radius}px`);
    card.style.setProperty("--gap", `${theme.blockGap}px`);
    card.style.setProperty("--pad", theme.density === "compact" ? "14px" : theme.density === "airy" ? "24px" : "18px");
    card.style.setProperty("--border", theme.border ? `1px solid color-mix(in srgb, ${theme.text} 13%, transparent)` : "none");
    card.style.setProperty("--shadow", theme.shadow ? "0 28px 80px color-mix(in srgb, var(--text) 18%, transparent)" : "none");

    const blocks = data.blocks?.length ? data.blocks : legacyBlocks(data);
    for (const block of blocks) {
      if (block.type === "hero") {
        const hero = element("section", `craft-hero align-${block.align || "left"}`);
        if (block.background) {
          hero.style.backgroundImage = theme.preset === "bilibili"
            ? `url("${block.background}")`
            : `linear-gradient(90deg, rgba(10,12,18,.82), rgba(10,12,18,.2)), url("${block.background}")`;
        }
        const avatarWrap = element("span", "craft-avatar-wrap");
        if (block.avatar) {
          const avatar = element("img", "craft-avatar");
          avatar.src = block.avatar;
          avatar.alt = "";
          avatar.referrerPolicy = "no-referrer";
          avatarWrap.append(avatar);
        } else {
          avatarWrap.append(element("span", "craft-avatar craft-avatar-fallback", (block.title || "?").slice(0, 1)));
        }
        if (block.avatarFrame) {
          const frame = element("img", "craft-avatar-frame");
          frame.src = block.avatarFrame;
          frame.alt = "";
          frame.referrerPolicy = "no-referrer";
          avatarWrap.append(frame);
        }
        hero.append(avatarWrap);
        const identity = element("div", "craft-identity");
        const titleRow = element("div", "craft-title-row");
        titleRow.append(element("h3", "craft-title name", block.title));
        if (block.badge) titleRow.append(element("span", "craft-badge", block.badge));
        identity.append(titleRow);
        if (block.subtitle) identity.append(element("p", "craft-subtitle", block.subtitle));
        hero.append(identity);
        card.append(hero);
      } else if (block.type === "text" && block.content) {
        const section = element("section", "craft-text");
        if (block.label) section.append(element("span", "craft-label", block.label));
        section.append(element("p", "", block.content));
        card.append(section);
      } else if (block.type === "stats") {
        const stats = element("section", "craft-stats");
        stats.style.gridTemplateColumns = `repeat(${block.columns}, minmax(0, 1fr))`;
        for (const item of block.items) {
          const stat = element("div", "craft-stat");
          stat.append(element("span", "", item.label), element("strong", "", item.value || "—"));
          stats.append(stat);
        }
        card.append(stats);
      } else if (block.type === "image" && block.src) {
        const image = element("img", `craft-image ratio-${block.ratio}`);
        image.src = block.src;
        image.alt = block.alt || "";
        image.referrerPolicy = "no-referrer";
        card.append(image);
      } else if (block.type === "links" && block.items.length) {
        const links = element("section", "craft-links");
        for (const item of block.items) {
          const link = element("a", `craft-link ${item.style}`, item.label);
          link.href = item.url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.append(element("span", "", "↗"));
          links.append(link);
        }
        card.append(links);
      } else if (block.type === "divider") {
        card.append(element("hr", "craft-divider"));
      }
    }
    root.append(style, card);
  }
}

if (!customElements.get("info-card-craft")) {
  customElements.define("info-card-craft", InfoCardCraft);
}
