const API_BASE = new URL(".", import.meta.url);

const styles = `
  :host {
    display: inline-block;
    width: 520px;
    max-width: 100%;
    color-scheme: light dark;
    contain: content;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  * { box-sizing: border-box; }
  .state {
    width: min(100%, 420px);
    min-height: 150px;
    padding: 22px;
    border-radius: 20px;
    display: grid;
    place-items: center;
    text-align: center;
    color: #77747d;
    background: #fffdf9;
    border: 1px solid rgba(25,25,30,.1);
    font-size: 13px;
  }
  .spinner {
    width: 22px;
    height: 22px;
    border: 2px solid rgba(25,25,30,.12);
    border-top-color: #ff6b84;
    border-radius: 50%;
    animation: spin .8s linear infinite;
  }
  .error strong { display: block; color: #b83b53; margin-bottom: 6px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .card {
    width: min(520px, 100%);
    min-height: 265px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }
  .card.vertical { width: min(310px, 100%); min-height: 420px; }
  .cover {
    min-height: 124px;
    padding: var(--padding);
    display: flex;
    align-items: flex-end;
    position: relative;
    color: white;
    background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 45%, #272832));
  }
  .vertical .cover { min-height: 178px; }
  .identity { display: flex; gap: 13px; align-items: center; min-width: 0; position: relative; z-index: 1; }
  .avatar {
    width: 58px; height: 58px; object-fit: cover; flex: 0 0 auto;
    border: 3px solid rgba(255,255,255,.82); border-radius: 18px;
  }
  .vertical .avatar { width: 64px; height: 64px; }
  .avatar-fallback {
    width: 58px; height: 58px; display: grid; place-items: center; flex: 0 0 auto;
    border: 2px solid rgba(255,255,255,.7); border-radius: 18px;
    background: rgba(255,255,255,.18); font-size: 22px; font-weight: 850;
  }
  .name-row { display: flex; align-items: center; gap: 7px; min-width: 0; }
  .name { font-size: 21px; line-height: 1.1; font-weight: 820; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .badge { padding: 3px 6px; border-radius: 6px; background: var(--accent); font-size: 9px; font-weight: 850; }
  .subtitle { display: block; margin-top: 5px; opacity: .8; font-size: 11px; }
  .body { padding: var(--padding); display: flex; flex-direction: column; flex: 1; }
  .description { margin: 0 0 15px; opacity: .68; font-size: 12px; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .stats { display: grid; grid-template-columns: repeat(var(--stat-count), 1fr); gap: 8px; margin-top: auto; }
  .vertical .stats { grid-template-columns: 1fr 1fr; }
  .stat { padding: 9px 10px; border-radius: 11px; background: var(--stat-bg); }
  .stat-label { display: block; margin-bottom: 4px; opacity: .55; font-size: 9px; }
  .stat-value { font-size: 13px; }
  .action {
    min-height: 38px; margin-top: 13px; display: grid; place-items: center;
    border-radius: 11px; color: white; background: var(--accent); text-decoration: none;
    font-size: 11px; font-weight: 780;
  }
  @media (max-width: 380px) {
    .card:not(.vertical) .stats { grid-template-columns: 1fr 1fr; }
  }
  @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
`;

class InfoCardCraft extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._requestId = 0;
    this._observer = new MutationObserver((records) => {
      const shouldReload = records.some(({ attributeName }) =>
        attributeName === "card-id" ||
        attributeName === "version" ||
        attributeName?.startsWith("input-")
      );
      if (shouldReload) this.load();
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
      if (attribute.name.startsWith("input-")) {
        result[attribute.name.slice(6)] = attribute.value;
      }
    }
    return result;
  }

  setState(kind, message = "") {
    const root = this.shadowRoot;
    root.replaceChildren();
    const style = document.createElement("style");
    style.textContent = styles;
    const state = document.createElement("div");
    state.className = `state ${kind}`;
    if (kind === "loading") {
      const spinner = document.createElement("span");
      spinner.className = "spinner";
      spinner.setAttribute("aria-label", "正在加载卡片");
      state.append(spinner);
    } else {
      const wrap = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = kind === "error" ? "卡片暂时无法加载" : "这张卡片还没有内容";
      const text = document.createElement("span");
      text.textContent = message;
      wrap.append(strong, text);
      state.append(wrap);
    }
    root.append(style, state);
  }

  async load() {
    const cardId = this.getAttribute("card-id");
    if (!cardId) {
      this.setState("error", "缺少 card-id 属性");
      return;
    }
    const requestId = ++this._requestId;
    this.style.width = "420px";
    this.setState("loading");
    const url = new URL(`api/public/cards/${encodeURIComponent(cardId)}/render`, API_BASE);
    const version = this.getAttribute("version");
    if (version) url.searchParams.set("version", version);
    for (const [key, value] of Object.entries(this.inputs())) {
      url.searchParams.set(`input-${key}`, value);
    }
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      if (requestId !== this._requestId) return;
      this.render(payload.data, payload.theme);
      this.dispatchEvent(new CustomEvent("info-card-loaded", {
        detail: { cardId, version: payload.version },
      }));
    } catch (error) {
      if (requestId !== this._requestId) return;
      this.setState("error", error instanceof Error ? error.message : "未知错误");
      this.dispatchEvent(new CustomEvent("info-card-error", {
        detail: { cardId, message: error instanceof Error ? error.message : "未知错误" },
      }));
    }
  }

  render(data, theme) {
    this.style.width = theme.direction === "vertical" ? "310px" : "520px";
    const root = this.shadowRoot;
    root.replaceChildren();
    const style = document.createElement("style");
    style.textContent = styles;
    const card = document.createElement("article");
    card.className = `card ${theme.direction === "vertical" ? "vertical" : ""}`;
    card.style.setProperty("--accent", theme.accent);
    card.style.setProperty("--surface", theme.surface);
    card.style.setProperty("--radius", `${theme.radius}px`);
    card.style.setProperty("--padding", theme.density === "compact" ? "16px" : "21px");
    card.style.setProperty("--text", theme.mode === "dark" ? "#f7f5f2" : "#202126");
    card.style.setProperty("--border", theme.mode === "dark" ? "rgba(255,255,255,.1)" : "rgba(25,25,30,.09)");
    card.style.setProperty("--stat-bg", theme.mode === "dark" ? "rgba(255,255,255,.07)" : "rgba(25,25,30,.045)");
    card.style.setProperty("--shadow", theme.shadow ? "0 24px 58px rgba(35,32,28,.18)" : "none");
    card.style.setProperty("--stat-count", String(Math.min(data.stats.length, 4)));

    const cover = document.createElement("div");
    cover.className = "cover";
    if (data.content.background) {
      cover.style.background = `linear-gradient(0deg, rgba(15,15,18,.78), rgba(15,15,18,.06)), url("${CSS.escape(data.content.background)}") center/cover`;
    }
    const identity = document.createElement("div");
    identity.className = "identity";
    if (data.identity.avatar) {
      const avatar = document.createElement("img");
      avatar.className = "avatar";
      avatar.src = data.identity.avatar;
      avatar.alt = "";
      identity.append(avatar);
    } else {
      const fallback = document.createElement("span");
      fallback.className = "avatar-fallback";
      fallback.textContent = data.identity.title.slice(0, 1);
      identity.append(fallback);
    }
    const heading = document.createElement("div");
    const nameRow = document.createElement("div");
    nameRow.className = "name-row";
    const name = document.createElement("strong");
    name.className = "name";
    name.textContent = data.identity.title;
    nameRow.append(name);
    if (data.identity.badge) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = data.identity.badge;
      nameRow.append(badge);
    }
    const subtitle = document.createElement("span");
    subtitle.className = "subtitle";
    subtitle.textContent = data.identity.subtitle;
    heading.append(nameRow, subtitle);
    identity.append(heading);
    cover.append(identity);

    const body = document.createElement("div");
    body.className = "body";
    if (data.content.description) {
      const description = document.createElement("p");
      description.className = "description";
      description.textContent = data.content.description;
      body.append(description);
    }
    const stats = document.createElement("div");
    stats.className = "stats";
    for (const item of data.stats) {
      const stat = document.createElement("div");
      stat.className = "stat";
      const label = document.createElement("span");
      label.className = "stat-label";
      label.textContent = item.label;
      const value = document.createElement("strong");
      value.className = "stat-value";
      value.textContent = item.value || "—";
      stat.append(label, value);
      stats.append(stat);
    }
    body.append(stats);
    if (data.actions.url) {
      const action = document.createElement("a");
      action.className = "action";
      action.href = data.actions.url;
      action.target = "_blank";
      action.rel = "noopener noreferrer";
      action.textContent = `${data.actions.label} ↗`;
      body.append(action);
    }
    card.append(cover, body);
    root.append(style, card);
  }
}

if (!customElements.get("info-card-craft")) {
  customElements.define("info-card-craft", InfoCardCraft);
}
