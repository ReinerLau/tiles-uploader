"use client";

import { Tree, Card } from "antd";
import type { TreeDataNode } from "antd";

/**
 * 文件夹结构数据
 */
const treeData: TreeDataNode[] = [
  {
    title: "src",
    key: "src",
    icon: "📁",
    children: [
      {
        title: "app",
        key: "app",
        icon: "📁",
        children: [
          {
            title: "layout.tsx",
            key: "layout.tsx",
            icon: "📄",
            isLeaf: true,
          },
          {
            title: "page.tsx",
            key: "page.tsx",
            icon: "📄",
            isLeaf: true,
          },
          {
            title: "globals.css",
            key: "globals.css",
            icon: "🎨",
            isLeaf: true,
          },
          {
            title: "utils",
            key: "utils",
            icon: "📁",
            children: [
              {
                title: "minio.ts",
                key: "minio.ts",
                icon: "📄",
                isLeaf: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "public",
    key: "public",
    icon: "📁",
    children: [
      {
        title: "file.svg",
        key: "file.svg",
        icon: "🖼️",
        isLeaf: true,
      },
      {
        title: "globe.svg",
        key: "globe.svg",
        icon: "🖼️",
        isLeaf: true,
      },
      {
        title: "next.svg",
        key: "next.svg",
        icon: "🖼️",
        isLeaf: true,
      },
      {
        title: "vercel.svg",
        key: "vercel.svg",
        icon: "🖼️",
        isLeaf: true,
      },
      {
        title: "window.svg",
        key: "window.svg",
        icon: "🖼️",
        isLeaf: true,
      },
    ],
  },
  {
    title: "package.json",
    key: "package.json",
    icon: "📦",
    isLeaf: true,
  },
  {
    title: "package-lock.json",
    key: "package-lock.json",
    icon: "🔒",
    isLeaf: true,
  },
  {
    title: "pnpm-lock.yaml",
    key: "pnpm-lock.yaml",
    icon: "🔒",
    isLeaf: true,
  },
  {
    title: "next.config.ts",
    key: "next.config.ts",
    icon: "⚙️",
    isLeaf: true,
  },
  {
    title: "tsconfig.json",
    key: "tsconfig.json",
    icon: "⚙️",
    isLeaf: true,
  },
  {
    title: "eslint.config.mjs",
    key: "eslint.config.mjs",
    icon: "⚙️",
    isLeaf: true,
  },
  {
    title: "postcss.config.mjs",
    key: "postcss.config.mjs",
    icon: "⚙️",
    isLeaf: true,
  },
  {
    title: "docker-compose.yaml",
    key: "docker-compose.yaml",
    icon: "🐳",
    isLeaf: true,
  },
  {
    title: "schema.prisma",
    key: "schema.prisma",
    icon: "🗄️",
    isLeaf: true,
  },
  {
    title: "README.md",
    key: "README.md",
    icon: "📖",
    isLeaf: true,
  },
];

export default function Home() {
  const onSelect = (
    selectedKeys: React.Key[],
    info: {
      node: TreeDataNode;
      selected: boolean;
      selectedNodes: TreeDataNode[];
    }
  ) => {
    console.log("选中的文件/文件夹:", selectedKeys, info);
  };

  const onExpand = (
    expandedKeys: React.Key[],
    info: { node: TreeDataNode; expanded: boolean }
  ) => {
    console.log("展开的文件夹:", expandedKeys, info);
  };

  return (
    <div style={{ padding: "24px" }}>
      <Card>
        <Tree
          showIcon
          defaultExpandedKeys={["src", "app", "public"]}
          defaultSelectedKeys={["page.tsx"]}
          treeData={treeData}
          onSelect={onSelect}
          onExpand={onExpand}
        />
      </Card>
    </div>
  );
}
