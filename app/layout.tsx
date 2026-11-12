import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "拾页 · 每天读一点",
    template: "%s · 拾页",
  },
  description:
    "把一本书拆成每天的十几分钟，读完有鼓励，继续有分寸。拾页，属于你的每日阅读空间。",
  applicationName: "拾页",
};

export const viewport: Viewport = {
  themeColor: "#f6f9fe",
  width: "device-width",
  initialScale: 1,
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
