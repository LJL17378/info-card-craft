import type { FieldBinding, TemplateKey, WorkflowConfig } from "@/lib/card-schema";

export type TemplateDefinition = {
  key: TemplateKey;
  name: string;
  eyebrow: string;
  description: string;
  icon: string;
  accent: string;
  config: WorkflowConfig;
};

const bind = (path: string, fallback?: string | number): FieldBinding => ({
  path,
  ...(fallback === undefined ? {} : { fallback }),
  formatters: [],
});

const commonTheme = {
  direction: "horizontal" as const,
  mode: "light" as const,
  preset: "editorial" as const,
  accent: "#ff6b84",
  surface: "#fffdf9",
  text: "#202126",
  radius: 22,
  density: "comfortable" as const,
  shadow: true,
  border: true,
  width: 560,
  blockGap: 12,
};

function legacyMapping(prefix: string) {
  return {
    avatar: bind(`${prefix}.avatar`),
    title: bind(`${prefix}.name`, "未命名"),
    subtitle: bind(`${prefix}.subtitle`),
    badge: bind(`${prefix}.badge`),
    description: bind(`${prefix}.description`),
    background: bind(`${prefix}.background`),
    url: bind(`${prefix}.url`),
    stats: [],
  };
}

export const templates: TemplateDefinition[] = [
  {
    key: "bilibili-user",
    name: "B 站创作者",
    eyebrow: "CREATOR",
    description: "内置 B 站连接器，并可继续追加其他公开接口。",
    icon: "哔",
    accent: "#fb7299",
    config: {
      name: "我的 B 站名片",
      description: "可组合的 B 站创作者资料",
      template: "bilibili-user",
      inputs: [{
        key: "uid", label: "B 站 UID", type: "number", required: true,
        defaultValue: 7900967, previewValue: 7900967,
      }],
      requests: [{
        id: "bili", name: "B 站公开资料", type: "bilibili-profile",
        url: "https://api.bilibili.com", query: {}, failureMode: "abort",
      }],
      mapping: {
        avatar: bind("requests.bili.profile.avatar"),
        title: bind("requests.bili.profile.name", "B 站用户"),
        subtitle: bind("requests.bili.profile.signature"),
        badge: { path: "requests.bili.profile.level", formatters: [{ type: "prefix", value: "LV" }] },
        description: bind("requests.bili.profile.signature"),
        background: bind("requests.bili.profile.banner"),
        url: bind("requests.bili.profile.url"),
        stats: [],
      },
      layout: { blocks: [
        {
          id: "hero", type: "hero", hidden: false, align: "left",
          avatar: bind("requests.bili.profile.avatar"),
          avatarFrame: bind("requests.bili.profile.avatarFrame"),
          title: bind("requests.bili.profile.name", "B 站用户"),
          subtitle: bind("requests.bili.profile.signature"),
          badge: { path: "requests.bili.profile.level", formatters: [{ type: "prefix", value: "LV" }] },
          background: bind("requests.bili.profile.banner"),
        },
        {
          id: "stats", type: "stats", hidden: false, columns: 4,
          items: [
            { label: "关注", value: { path: "requests.bili.profile.following", formatters: [{ type: "compact-number" }] } },
            { label: "粉丝", value: { path: "requests.bili.profile.followers", formatters: [{ type: "compact-number" }] } },
            { label: "投稿", value: { path: "requests.bili.profile.archiveCount", formatters: [{ type: "compact-number" }] } },
          ],
        },
        {
          id: "link", type: "links", hidden: false,
          items: [{ label: "访问 B 站主页", url: bind("requests.bili.profile.url"), style: "primary" }],
        },
      ] },
      theme: {
        ...commonTheme,
        accent: "#fb7299",
        surface: "#fff7fa",
        radius: 20,
        preset: "bilibili",
      },
    },
  },
  {
    key: "github-user",
    name: "GitHub 开发者",
    eyebrow: "MULTI API",
    description: "同时请求用户资料和仓库列表，演示跨接口组合。",
    icon: "GH",
    accent: "#7357ff",
    config: {
      name: "GitHub 开发者名片",
      description: "资料与最新仓库来自两个接口",
      template: "github-user",
      inputs: [{
        key: "username", label: "GitHub 用户名", type: "string", required: true,
        defaultValue: "torvalds", previewValue: "torvalds",
      }],
      requests: [
        {
          id: "profile", name: "用户资料", type: "http",
          url: "https://api.github.com/users/{{input.username}}",
          query: {}, failureMode: "abort",
        },
        {
          id: "repos", name: "最新仓库", type: "http",
          url: "https://api.github.com/users/{{input.username}}/repos",
          query: { sort: "updated", per_page: "3" }, failureMode: "continue",
        },
      ],
      mapping: {
        avatar: bind("requests.profile.avatar_url"),
        title: bind("requests.profile.name", "GitHub User"),
        subtitle: { path: "requests.profile.login", formatters: [{ type: "prefix", value: "@" }] },
        badge: bind("requests.profile.type"),
        description: bind("requests.profile.bio"),
        url: bind("requests.profile.html_url"),
        stats: [],
      },
      layout: { blocks: [
        {
          id: "hero", type: "hero", hidden: false, align: "left",
          avatar: bind("requests.profile.avatar_url"),
          title: bind("requests.profile.name", "GitHub User"),
          subtitle: { path: "requests.profile.login", formatters: [{ type: "prefix", value: "@" }] },
          badge: bind("requests.profile.type"),
        },
        {
          id: "bio", type: "text", hidden: false, label: "ABOUT",
          content: bind("requests.profile.bio", "Building in public."),
        },
        {
          id: "stats", type: "stats", hidden: false, columns: 3,
          items: [
            { label: "仓库", value: { path: "requests.profile.public_repos", formatters: [{ type: "compact-number" }] } },
            { label: "粉丝", value: { path: "requests.profile.followers", formatters: [{ type: "compact-number" }] } },
            { label: "关注", value: { path: "requests.profile.following", formatters: [{ type: "compact-number" }] } },
          ],
        },
        {
          id: "repo", type: "text", hidden: false, label: "RECENTLY UPDATED",
          content: bind("requests.repos.0.full_name", "暂无公开仓库"),
        },
        {
          id: "links", type: "links", hidden: false,
          items: [
            { label: "GitHub 主页", url: bind("requests.profile.html_url"), style: "primary" },
            { label: "最新仓库", url: bind("requests.repos.0.html_url"), style: "secondary" },
          ],
        },
      ] },
      theme: {
        ...commonTheme,
        mode: "dark",
        accent: "#2da44e",
        surface: "#0d1117",
        text: "#f0f6fc",
        radius: 12,
        shadow: false,
        preset: "github",
      },
    },
  },
  {
    key: "custom-json",
    name: "空白 API 卡片",
    eyebrow: "BLANK CANVAS",
    description: "从一个示例源开始，可添加数据源与任意内容区块。",
    icon: "{}",
    accent: "#0f9f7c",
    config: {
      name: "自定义信息卡片",
      description: "自由连接、解析和排版公开 JSON",
      template: "custom-json",
      inputs: [{
        key: "id", label: "资源 ID", type: "number", required: true,
        defaultValue: 1, previewValue: 1,
      }],
      requests: [{
        id: "user", name: "用户资料", type: "http",
        url: "https://jsonplaceholder.typicode.com/users/{{input.id}}",
        query: {}, failureMode: "abort",
      }],
      mapping: {
        avatar: bind(""),
        title: bind("requests.user.name", "API 数据"),
        subtitle: bind("requests.user.company.name"),
        badge: bind("requests.user.username"),
        description: bind("requests.user.company.catchPhrase"),
        url: { path: "requests.user.website", formatters: [{ type: "prefix", value: "https://" }] },
        stats: [],
      },
      layout: { blocks: [
        {
          id: "hero", type: "hero", hidden: false, align: "left",
          title: bind("requests.user.name", "API 数据"),
          subtitle: bind("requests.user.company.name"),
          badge: { path: "requests.user.username", formatters: [{ type: "prefix", value: "@" }] },
        },
        {
          id: "text", type: "text", hidden: false, label: "COMPANY",
          content: bind("requests.user.company.catchPhrase"),
        },
        {
          id: "stats", type: "stats", hidden: false, columns: 2,
          items: [
            { label: "城市", value: bind("requests.user.address.city") },
            { label: "邮箱", value: bind("requests.user.email") },
          ],
        },
      ] },
      theme: { ...commonTheme, accent: "#0f9f7c", preset: "minimal" },
    },
  },
  {
    key: "multi-source-profile",
    name: "多源人物档案",
    eyebrow: "ORCHESTRATION",
    description: "先取用户，再用相同输入取文章；两个响应合成一张卡。",
    icon: "2×",
    accent: "#ed7048",
    config: {
      name: "多源人物档案",
      description: "用户资料与内容动态组合",
      template: "multi-source-profile",
      inputs: [{
        key: "id", label: "用户 ID", type: "number", required: true,
        defaultValue: 1, previewValue: 1,
      }],
      requests: [
        {
          id: "person", name: "人物资料", type: "http",
          url: "https://jsonplaceholder.typicode.com/users/{{input.id}}",
          query: {}, failureMode: "abort",
        },
        {
          id: "posts", name: "人物文章", type: "http",
          url: "https://jsonplaceholder.typicode.com/posts",
          query: { userId: "{{input.id}}", _limit: "3" }, failureMode: "continue",
        },
      ],
      mapping: legacyMapping("requests.person"),
      layout: { blocks: [
        {
          id: "hero", type: "hero", hidden: false, align: "left",
          title: bind("requests.person.name", "人物档案"),
          subtitle: bind("requests.person.company.name"),
          badge: bind("requests.person.username"),
        },
        {
          id: "intro", type: "text", hidden: false, label: "LATEST STORY",
          content: bind("requests.posts.0.title", "暂无内容"),
        },
        {
          id: "stats", type: "stats", hidden: false, columns: 2,
          items: [
            { label: "城市", value: bind("requests.person.address.city") },
            { label: "网站", value: bind("requests.person.website") },
          ],
        },
        {
          id: "link", type: "links", hidden: false,
          items: [{
            label: "访问个人网站",
            url: { path: "requests.person.website", formatters: [{ type: "prefix", value: "https://" }] },
            style: "primary",
          }],
        },
      ] },
      theme: { ...commonTheme, accent: "#ed7048", preset: "poster" },
    },
  },
  {
    key: "api-dashboard",
    name: "指标仪表盘",
    eyebrow: "DATA BOARD",
    description: "面向统计数字和状态展示的紧凑型数据卡。",
    icon: "↗",
    accent: "#2674ff",
    config: {
      name: "API 指标仪表盘",
      description: "把多个资源状态聚合成一张数据板",
      template: "api-dashboard",
      inputs: [{
        key: "id", label: "任务 ID", type: "number", required: true,
        defaultValue: 1, previewValue: 1,
      }],
      requests: [
        {
          id: "todo", name: "任务状态", type: "http",
          url: "https://jsonplaceholder.typicode.com/todos/{{input.id}}",
          query: {}, failureMode: "abort",
        },
        {
          id: "post", name: "关联内容", type: "http",
          url: "https://jsonplaceholder.typicode.com/posts/{{requests.todo.userId}}",
          query: {}, failureMode: "continue",
        },
      ],
      mapping: {
        ...legacyMapping("requests.todo"),
        title: bind("requests.todo.title", "数据面板"),
      },
      layout: { blocks: [
        {
          id: "hero", type: "hero", hidden: false, align: "left",
          title: bind("requests.todo.title", "数据面板"),
          subtitle: bind("requests.post.title", "实时 API 状态"),
          badge: { path: "requests.todo.completed", formatters: [{ type: "prefix", value: "完成：" }] },
        },
        {
          id: "stats", type: "stats", hidden: false, columns: 3,
          items: [
            { label: "任务 ID", value: bind("requests.todo.id") },
            { label: "用户 ID", value: bind("requests.todo.userId") },
            { label: "完成状态", value: bind("requests.todo.completed") },
          ],
        },
        { id: "divider", type: "divider", hidden: false },
        {
          id: "content", type: "text", hidden: false, label: "RELATED",
          content: bind("requests.post.body", "暂无关联内容"),
        },
      ] },
      theme: {
        ...commonTheme,
        mode: "dark", surface: "#101522", text: "#f3f6ff",
        accent: "#4384ff", preset: "glass", density: "compact",
      },
    },
  },
  {
    key: "nowcoder-user",
    name: "牛客档案",
    eyebrow: "NOWCODER",
    description: "读取公开牛客主页中的头像、身份、等级与互动数据。",
    icon: "牛",
    accent: "#00b578",
    config: {
      name: "我的牛客档案",
      description: "公开职业身份与社区数据",
      template: "nowcoder-user",
      inputs: [{
        key: "user-id", label: "牛客用户 ID", type: "number", required: true,
        defaultValue: 676891780, previewValue: 676891780,
      }],
      requests: [{
        id: "nowcoder", name: "牛客公开主页", type: "nowcoder-profile",
        url: "https://www.nowcoder.com/users/{{input.user-id}}",
        query: {}, failureMode: "abort",
      }],
      mapping: {
        avatar: bind("requests.nowcoder.headImgUrl"),
        title: bind("requests.nowcoder.nickname", "牛客用户"),
        subtitle: bind("requests.nowcoder.authDisplayInfo"),
        badge: bind("requests.nowcoder.honorLevelName"),
        description: bind("requests.nowcoder.introduction"),
        background: bind("requests.nowcoder.userBgImgUrl"),
        url: bind("requests.nowcoder.url"),
        stats: [],
      },
      layout: { blocks: [
        {
          id: "hero", type: "hero", hidden: false, align: "left",
          avatar: bind("requests.nowcoder.headImgUrl"),
          avatarFrame: bind("requests.nowcoder.headDecorateUrl"),
          title: bind("requests.nowcoder.nickname", "牛客用户"),
          subtitle: bind("requests.nowcoder.authDisplayInfo"),
          badge: bind("requests.nowcoder.honorLevelName"),
        },
        {
          id: "bio", type: "text", hidden: false, label: "求职档案",
          content: bind("requests.nowcoder.introduction", "这个人还没有填写简介"),
        },
        {
          id: "stats", type: "stats", hidden: false, columns: 4,
          items: [
            { label: "获赞", value: { path: "requests.nowcoder.stats.likeCount", formatters: [{ type: "compact-number" }] } },
            { label: "粉丝", value: { path: "requests.nowcoder.stats.fansCount", formatters: [{ type: "compact-number" }] } },
            { label: "关注", value: { path: "requests.nowcoder.stats.followCount", formatters: [{ type: "compact-number" }] } },
            { label: "访客", value: { path: "requests.nowcoder.stats.visitorCount", formatters: [{ type: "compact-number" }] } },
          ],
        },
        {
          id: "link", type: "links", hidden: false,
          items: [{ label: "访问牛客主页", url: bind("requests.nowcoder.url"), style: "primary" }],
        },
      ] },
      theme: {
        ...commonTheme,
        accent: "#00b578",
        surface: "#f6fbf8",
        text: "#18231f",
        radius: 20,
        width: 560,
        preset: "nowcoder",
      },
    },
  },
  {
    key: "zhihu-user",
    name: "知乎创作者",
    eyebrow: "ZHIHU",
    description: "读取知乎公开成员接口中的个人资料与创作数据。",
    icon: "知",
    accent: "#1772f6",
    config: {
      name: "我的知乎名片",
      description: "知乎创作者公开数据",
      template: "zhihu-user",
      inputs: [{
        key: "token", label: "知乎主页标识", type: "string", required: true,
        defaultValue: "excited-vczh", previewValue: "excited-vczh",
      }],
      requests: [{
        id: "zhihu", name: "知乎公开资料", type: "zhihu-profile",
        url: "https://www.zhihu.com/api/v4/members/{{input.token}}",
        query: {}, failureMode: "abort",
      }],
      mapping: {
        avatar: bind("requests.zhihu.avatar_url"),
        title: bind("requests.zhihu.name", "知乎用户"),
        subtitle: bind("requests.zhihu.headline"),
        badge: bind("requests.zhihu.__badge", "知乎创作者"),
        description: bind("requests.zhihu.headline"),
        url: bind("requests.zhihu.url"),
        stats: [],
      },
      layout: { blocks: [
        {
          id: "hero", type: "hero", hidden: false, align: "left",
          avatar: bind("requests.zhihu.avatar_url"),
          title: bind("requests.zhihu.name", "知乎用户"),
          subtitle: bind("requests.zhihu.headline", "分享知识、经验和见解"),
          badge: bind("requests.zhihu.__badge", "知乎创作者"),
        },
        {
          id: "stats", type: "stats", hidden: false, columns: 4,
          items: [
            { label: "关注者", value: { path: "requests.zhihu.follower_count", formatters: [{ type: "compact-number" }] } },
            { label: "回答", value: { path: "requests.zhihu.answer_count", formatters: [{ type: "compact-number" }] } },
            { label: "文章", value: { path: "requests.zhihu.articles_count", formatters: [{ type: "compact-number" }] } },
            { label: "获赞", value: { path: "requests.zhihu.voteup_count", formatters: [{ type: "compact-number" }] } },
          ],
        },
        {
          id: "link", type: "links", hidden: false,
          items: [{ label: "查看回答与文章", url: bind("requests.zhihu.url"), style: "primary" }],
        },
      ] },
      theme: {
        ...commonTheme,
        accent: "#1772f6",
        surface: "#ffffff",
        text: "#121212",
        radius: 12,
        shadow: false,
        preset: "zhihu",
      },
    },
  },
  {
    key: "leetcode-user",
    name: "力扣进度",
    eyebrow: "LEETCODE CN",
    description: "通过力扣中国公开 GraphQL 获取头像、排名和难度进度。",
    icon: "LC",
    accent: "#ffa116",
    config: {
      name: "我的力扣进度",
      description: "公开刷题进度与个人资料",
      template: "leetcode-user",
      inputs: [{
        key: "username", label: "力扣主页标识", type: "string", required: true,
        defaultValue: "leetcode", previewValue: "leetcode",
      }],
      requests: [{
        id: "leetcode", name: "力扣公开资料", type: "leetcode-profile",
        url: "https://leetcode.cn/graphql/",
        query: {}, failureMode: "abort",
      }],
      mapping: {
        avatar: bind("requests.leetcode.profile.userAvatar"),
        title: bind("requests.leetcode.profile.realName", "LeetCode User"),
        subtitle: bind("requests.leetcode.profile.job"),
        badge: { path: "requests.leetcode.siteRanking", formatters: [{ type: "prefix", value: "#" }] },
        description: bind("requests.leetcode.profile.aboutMe"),
        url: bind("requests.leetcode.url"),
        stats: [],
      },
      layout: { blocks: [
        {
          id: "hero", type: "hero", hidden: false, align: "left",
          avatar: bind("requests.leetcode.profile.userAvatar"),
          title: bind("requests.leetcode.profile.realName", "LeetCode User"),
          subtitle: bind("requests.leetcode.profile.aboutMe"),
          badge: { path: "requests.leetcode.siteRanking", formatters: [{ type: "prefix", value: "#" }] },
        },
        {
          id: "stats", type: "stats", hidden: false, columns: 4,
          items: [
            { label: "已解决", value: bind("requests.leetcode.accepted.total") },
            { label: "简单", value: bind("requests.leetcode.accepted.easy") },
            { label: "中等", value: bind("requests.leetcode.accepted.medium") },
            { label: "困难", value: bind("requests.leetcode.accepted.hard") },
          ],
        },
        {
          id: "company", type: "text", hidden: false, label: "PROFILE",
          content: bind("requests.leetcode.profile.company.name", "持续刷题中"),
        },
        {
          id: "link", type: "links", hidden: false,
          items: [{ label: "访问力扣主页", url: bind("requests.leetcode.url"), style: "primary" }],
        },
      ] },
      theme: {
        ...commonTheme,
        mode: "dark",
        accent: "#ffa116",
        surface: "#1a1a1a",
        text: "#f5f5f5",
        radius: 18,
        width: 560,
        preset: "leetcode",
      },
    },
  },
  {
    key: "douyin-profile",
    name: "抖音主页",
    eyebrow: "DOUYIN",
    description: "无需 Cookie 的安全资料卡；填写公开主页信息，适合稳定嵌入博客。",
    icon: "抖",
    accent: "#25f4ee",
    config: {
      name: "我的抖音主页",
      description: "手动维护的抖音公开资料卡",
      template: "douyin-profile",
      inputs: [
        { key: "name", label: "昵称", type: "string", required: true, defaultValue: "你的抖音昵称", previewValue: "镜头里的日常" },
        { key: "handle", label: "抖音号", type: "string", required: true, defaultValue: "douyin-user", previewValue: "daily.frames" },
        { key: "avatar", label: "头像 URL", type: "string", required: false, defaultValue: "", previewValue: "" },
        { key: "bio", label: "简介", type: "string", required: false, defaultValue: "记录生活，也记录闪光时刻。", previewValue: "记录生活，也记录闪光时刻。" },
        { key: "following", label: "关注", type: "number", required: false, defaultValue: 128, previewValue: 128 },
        { key: "followers", label: "粉丝", type: "number", required: false, defaultValue: 24000, previewValue: 24000 },
        { key: "likes", label: "获赞", type: "number", required: false, defaultValue: 318000, previewValue: 318000 },
        { key: "profile-url", label: "主页链接", type: "string", required: true, defaultValue: "https://www.douyin.com/", previewValue: "https://www.douyin.com/" },
      ],
      requests: [{
        id: "profile", name: "嵌入参数", type: "manual-profile",
        url: "manual://profile", query: {}, failureMode: "abort",
      }],
      mapping: {
        avatar: bind("requests.profile.avatar"),
        title: bind("requests.profile.name", "抖音用户"),
        subtitle: { path: "requests.profile.handle", formatters: [{ type: "prefix", value: "抖音号 · " }] },
        badge: bind("requests.profile.__badge", "DOUYIN"),
        description: bind("requests.profile.bio"),
        url: bind("requests.profile.url"),
        stats: [],
      },
      layout: { blocks: [
        {
          id: "hero", type: "hero", hidden: false, align: "left",
          avatar: bind("requests.profile.avatar"),
          title: bind("requests.profile.name", "抖音用户"),
          subtitle: { path: "requests.profile.handle", formatters: [{ type: "prefix", value: "抖音号 · " }] },
          badge: bind("requests.profile.__badge", "DOUYIN"),
        },
        {
          id: "bio", type: "text", hidden: false, label: "BIO",
          content: bind("requests.profile.bio", "记录生活，也记录闪光时刻。"),
        },
        {
          id: "stats", type: "stats", hidden: false, columns: 3,
          items: [
            { label: "关注", value: { path: "requests.profile.following", formatters: [{ type: "compact-number" }] } },
            { label: "粉丝", value: { path: "requests.profile.followers", formatters: [{ type: "compact-number" }] } },
            { label: "获赞", value: { path: "requests.profile.likes", formatters: [{ type: "compact-number" }] } },
          ],
        },
        {
          id: "link", type: "links", hidden: false,
          items: [{ label: "打开抖音主页", url: bind("requests.profile.url"), style: "primary" }],
        },
      ] },
      theme: {
        ...commonTheme,
        mode: "dark",
        preset: "douyin",
        accent: "#25f4ee",
        surface: "#0f0f12",
        text: "#f7f7f8",
        radius: 18,
        width: 560,
      },
    },
  },
  {
    key: "xiaohongshu-profile",
    name: "小红书主页",
    eyebrow: "REDNOTE",
    description: "红白笔记风资料卡；使用公开信息，不依赖登录 Cookie 或私有签名。",
    icon: "薯",
    accent: "#ff2442",
    config: {
      name: "我的小红书主页",
      description: "手动维护的小红书公开资料卡",
      template: "xiaohongshu-profile",
      inputs: [
        { key: "name", label: "昵称", type: "string", required: true, defaultValue: "你的小红书昵称", previewValue: "周末生活研究所" },
        { key: "red-id", label: "小红书号", type: "string", required: true, defaultValue: "rednote-user", previewValue: "weekend.lab" },
        { key: "avatar", label: "头像 URL", type: "string", required: false, defaultValue: "", previewValue: "" },
        { key: "bio", label: "简介", type: "string", required: false, defaultValue: "分享生活灵感与真实体验。", previewValue: "咖啡、旅行和一些让生活变好的小事。" },
        { key: "following", label: "关注", type: "number", required: false, defaultValue: 86, previewValue: 86 },
        { key: "followers", label: "粉丝", type: "number", required: false, defaultValue: 12800, previewValue: 12800 },
        { key: "engagement", label: "获赞与收藏", type: "number", required: false, defaultValue: 96000, previewValue: 96000 },
        { key: "notes", label: "笔记", type: "number", required: false, defaultValue: 72, previewValue: 72 },
        { key: "profile-url", label: "主页链接", type: "string", required: true, defaultValue: "https://www.xiaohongshu.com/", previewValue: "https://www.xiaohongshu.com/" },
      ],
      requests: [{
        id: "profile", name: "嵌入参数", type: "manual-profile",
        url: "manual://profile", query: {}, failureMode: "abort",
      }],
      mapping: {
        avatar: bind("requests.profile.avatar"),
        title: bind("requests.profile.name", "小红书用户"),
        subtitle: { path: "requests.profile.red-id", formatters: [{ type: "prefix", value: "小红书号 · " }] },
        badge: bind("requests.profile.__badge", "生活创作者"),
        description: bind("requests.profile.bio"),
        url: bind("requests.profile.url"),
        stats: [],
      },
      layout: { blocks: [
        {
          id: "hero", type: "hero", hidden: false, align: "left",
          avatar: bind("requests.profile.avatar"),
          title: bind("requests.profile.name", "小红书用户"),
          subtitle: { path: "requests.profile.red-id", formatters: [{ type: "prefix", value: "小红书号 · " }] },
          badge: bind("requests.profile.__badge", "生活创作者"),
        },
        {
          id: "bio", type: "text", hidden: false, label: "关于我",
          content: bind("requests.profile.bio", "分享生活灵感与真实体验。"),
        },
        {
          id: "stats", type: "stats", hidden: false, columns: 4,
          items: [
            { label: "关注", value: { path: "requests.profile.following", formatters: [{ type: "compact-number" }] } },
            { label: "粉丝", value: { path: "requests.profile.followers", formatters: [{ type: "compact-number" }] } },
            { label: "获赞与收藏", value: { path: "requests.profile.engagement", formatters: [{ type: "compact-number" }] } },
            { label: "笔记", value: { path: "requests.profile.notes", formatters: [{ type: "compact-number" }] } },
          ],
        },
        {
          id: "link", type: "links", hidden: false,
          items: [{ label: "打开小红书主页", url: bind("requests.profile.url"), style: "primary" }],
        },
      ] },
      theme: {
        ...commonTheme,
        preset: "xiaohongshu",
        accent: "#ff2442",
        surface: "#fffdfd",
        text: "#222222",
        radius: 22,
        width: 560,
      },
    },
  },
];

export function getTemplate(key: TemplateKey) {
  return templates.find((template) => template.key === key) ?? templates[0];
}

export function cloneTemplateConfig(key: TemplateKey): WorkflowConfig {
  return structuredClone(getTemplate(key).config);
}
