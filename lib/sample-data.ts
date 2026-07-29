import type { TemplateKey } from "@/lib/card-schema";

const person = {
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

export function getSampleResponse(template: TemplateKey): unknown {
  if (template === "bilibili-user") {
    return {
      input: { uid: 7900967 },
      requests: {
        bili: {
          profile: {
            uid: "7900967",
            name: "dogz警犬儿",
            avatar: "https://i2.hdslb.com/bfs/face/030715fb24dad5a402fd8147f06fe3624448f64d.jpg",
            banner: "https://i2.hdslb.com/bfs/face/030715fb24dad5a402fd8147f06fe3624448f64d.jpg",
            avatarFrame: "https://i2.hdslb.com/bfs/garb/item/656119de5098823514b5473f4af7b4f4b44464d0.png",
            signature: "“致朦盖上的擦伤，童年的时光和青春心事。”",
            level: 6,
            following: 986,
            followers: 316245,
            likes: 985491,
            archiveCount: 212,
            url: "https://space.bilibili.com/7900967",
          },
        },
      },
    };
  }
  if (template === "github-user") {
    return {
      input: { username: "torvalds" },
      requests: {
        profile: {
          login: "torvalds",
          avatar_url: "https://avatars.githubusercontent.com/u/1024025?v=4",
          html_url: "https://github.com/torvalds",
          name: "Linus Torvalds",
          type: "User",
          bio: "Creator of Linux and Git.",
          public_repos: 8,
          followers: 263000,
          following: 0,
        },
        repos: [{
          full_name: "torvalds/linux",
          html_url: "https://github.com/torvalds/linux",
        }],
      },
    };
  }
  if (template === "api-dashboard") {
    return {
      input: { id: 1 },
      requests: {
        todo: { userId: 1, id: 1, title: "完成博客卡片工作流升级", completed: true },
        post: {
          title: "接口编排已连接",
          body: "第二个请求可以读取第一个响应，并把结果映射到任意内容区块。",
        },
      },
    };
  }
  if (template === "multi-source-profile") {
    return {
      input: { id: 1 },
      requests: {
        person,
        posts: [{ title: "A composable card powered by two public APIs" }],
      },
    };
  }
  return { input: { id: 1 }, requests: { user: person } };
}
