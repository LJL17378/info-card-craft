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
            banner: "https://i0.hdslb.com/bfs/space/cb1c3ef50e22b6096fde67febe863494caefebad.png",
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
  if (template === "nowcoder-user") {
    return {
      input: { "user-id": 676891780 },
      requests: {
        nowcoder: {
          nickname: "nowcodercom",
          headImgUrl: "https://uploadfiles.nowcoder.com/images/20220905/676891780_1662375856476/E2BB4E6C0666DF6F99D6A2A58463BC37",
          userBgImgUrl: "https://uploadfiles.nowcoder.com/files/20230322/68_1679458244538/pc_jl.jpg",
          headDecorateUrl: "",
          honorLevelName: "出师牛 Lv.3",
          authDisplayInfo: "telecom SudParis · Java",
          introduction: "持续学习，持续分享。",
          stats: { likeCount: 8, fansCount: 1, followCount: 4, visitorCount: 52 },
          url: "https://www.nowcoder.com/users/676891780",
        },
      },
    };
  }
  if (template === "zhihu-user") {
    return {
      input: { token: "excited-vczh" },
      requests: {
        zhihu: {
          name: "梅启铭",
          headline: "分享知识、经验和见解",
          avatar_url: "https://picx.zhimg.com/v2-ada18a9354a3831171306f2c7ce20aaf_xl.jpg?source=32738c0c&needBackground=1",
          user_type: "people",
          follower_count: 834985,
          answer_count: 7,
          articles_count: 147,
          voteup_count: 88384,
          url: "https://www.zhihu.com/people/excited-vczh",
        },
      },
    };
  }
  if (template === "leetcode-user") {
    return {
      input: { username: "leetcode" },
      requests: {
        leetcode: {
          username: "leetcode",
          profile: {
            realName: "LeetCode",
            aboutMe: "用力扣，越能 Code！",
            userAvatar: "https://assets.leetcode.cn/aliyun-lc-upload/uploaded_files/2021/03/73c9f099-abbe-4d94-853f-f8abffd459cd/leetcode.png",
            company: { name: "力扣 LeetCode" },
            job: "Problem Solver",
          },
          siteRanking: 100000,
          accepted: { easy: 25, medium: 26, hard: 14, total: 65 },
          url: "https://leetcode.cn/u/leetcode/",
        },
      },
    };
  }
  if (template === "city-inspiration") {
    return {
      input: { city: "上海" },
      requests: {
        location: {
          results: [{
            name: "上海",
            admin1: "上海市",
            country: "中国",
            latitude: 31.22222,
            longitude: 121.45806,
          }],
        },
        weather: {
          current_units: { temperature_2m: "°C", wind_speed_10m: "km/h" },
          current: {
            temperature_2m: 29.9,
            apparent_temperature: 36.2,
            relative_humidity_2m: 76,
            wind_speed_10m: 6,
          },
        },
        quote: {
          hitokoto: "不负韶华，不忘初心。",
          from: "Jane",
          uuid: "f53d53a0-bea1-499c-87cb-eab2ad8ba371",
        },
        art: {
          results: [{
            artist_name: "甘城なつき",
            artist_href: "https://www.pixiv.net/en/users/3036679",
            source_url: "https://www.pixiv.net/en/artworks/73891141",
            url: "https://nekos.best/api/v2/neko/a04f0358-0f83-458f-a02b-90f00a18255b.png",
          }],
        },
      },
    };
  }
  return { input: { id: 1 }, requests: { user: person } };
}
