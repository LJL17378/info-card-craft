# Info Card Craft

把公开 API、RSS 或 JSON 数据转换成可嵌入任意博客的动态信息卡片。

当前 MVP 提供 B 站用户、GitHub 用户和自定义 JSON API 三种模板，以及一条清晰的六步工作流：

1. 选择模板
2. 定义输入
3. 连接公开 GET API
4. 映射响应字段
5. 设计卡片
6. 发布 Web Component

## 本地运行

要求 Node.js 20.19+、22.13+ 或 24+。

```bash
npm install
cp .env.example .env.local
npm run dev
```

没有 Supabase 环境变量时，应用会进入演示模式。管理、编辑、预览和内置公开卡片都可以使用，但自建卡片只保存在当前浏览器。

## Supabase

1. 创建 Supabase 项目。
2. 在 SQL Editor 执行 `supabase/migrations/202607290001_initial.sql`。
3. 免费套餐默认使用邮箱 Magic Link；如配置自有 SMTP，也可以自行改成 OTP 模板。
4. 配置以下环境变量：

```dotenv
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` 只能配置在服务端，不得写入 `NEXT_PUBLIC_*` 变量或浏览器代码。

## 部署到 Vercel

```bash
npx vercel
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel --prod
```

部署后，将 Supabase Site URL 设为正式域名，并允许 `/auth/callback` 回调地址。本仓库的
`supabase/config.toml` 可以通过 `supabase config push` 自动完成这一步。

## 嵌入

### 普通 HTML、WordPress 与绝大多数博客

```html
<script
  type="module"
  src="https://your-domain.vercel.app/embed.js">
</script>

<info-card-craft
  card-id="your-card-id"
  input-uid="7900967">
</info-card-craft>
```

每个自定义输入都使用 `input-*` 属性。修改属性会自动刷新卡片。`version="2"` 可以固定到某次发布；省略时总是读取最新版本。

### React / Next.js

把脚本放进根布局或 `next/script`，然后渲染自定义元素：

```tsx
import Script from "next/script";

export function AuthorCard() {
  return (
    <>
      <Script
        type="module"
        src="https://your-domain.vercel.app/embed.js"
      />
      <info-card-craft
        card-id="your-card-id"
        input-username="torvalds"
      />
    </>
  );
}
```

TypeScript 项目可添加：

```ts
declare namespace JSX {
  interface IntrinsicElements {
    "info-card-craft": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & Record<`input-${string}`, string>;
  }
}
```

### Vue

```vue
<script setup>
import { onMounted } from "vue";

onMounted(() => import("https://your-domain.vercel.app/embed.js"));
</script>

<template>
  <info-card-craft
    card-id="your-card-id"
    input-username="torvalds"
  />
</template>
```

### Astro

```astro
<script type="module" src="https://your-domain.vercel.app/embed.js"></script>
<info-card-craft card-id="your-card-id" input-id="1"></info-card-craft>
```

Web Component 使用 Shadow DOM，不会被博客主题的 CSS 污染。

## 安全边界

- 只执行公开 HTTPS GET 请求。
- 禁止 localhost、私有地址、云元数据地址和包含凭据的 URL。
- 重定向逐次校验，最多 3 次。
- 请求超时 8 秒，响应最大 1 MB。
- 不接受 Cookie、Authorization Header、用户名密码或用户 JavaScript。

## 质量检查

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

## License

MIT
