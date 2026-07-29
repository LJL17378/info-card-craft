import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Info Card Craft — 把 API 变成博客卡片",
    template: "%s · Info Card Craft",
  },
  description: "连接公开 API，映射字段并发布为可以嵌入任意博客的动态 Web Component。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
