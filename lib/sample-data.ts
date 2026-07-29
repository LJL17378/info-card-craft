import type { TemplateKey } from "@/lib/card-schema";

export function getSampleResponse(template: TemplateKey): unknown {
  if (template === "bilibili-user") {
    return {
      profile: {
        uid: "7900967",
        name: "dogz警犬儿",
        avatar: "https://i0.hdslb.com/bfs/face/4e5ac8d6ea0c5e80896d3d1a3f193c8955c90d18.jpg",
        banner: "",
        signature: "“致朦盖上的擦伤，童年的时光和青春心事。”",
        level: 6,
        following: 986,
        followers: 316245,
        likes: 985491,
        archiveCount: 212,
        url: "https://space.bilibili.com/7900967",
      },
    };
  }
  if (template === "github-user") {
    return {
      login: "torvalds",
      avatar_url: "https://avatars.githubusercontent.com/u/1024025?v=4",
      html_url: "https://github.com/torvalds",
      name: "Linus Torvalds",
      type: "User",
      bio: "Creator of Linux and Git.",
      public_repos: 8,
      followers: 263000,
      following: 0,
    };
  }
  return {
    id: 1,
    name: "Leanne Graham",
    username: "Bret",
    email: "sincere@april.biz",
    address: { city: "Gwenborough" },
    company: {
      name: "Romaguera-Crona",
      catchPhrase: "Multi-layered client-server neural-net",
    },
    website: "hildegard.org",
  };
}
