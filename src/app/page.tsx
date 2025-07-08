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
    children: [
      {
        title: "app",
        key: "app",
        children: [
          {
            title: "layout.tsx",
            key: "layout.tsx",
            isLeaf: true,
          },
          {
            title: "page.tsx",
            key: "page.tsx",
            isLeaf: true,
          },
          {
            title: "globals.css",
            key: "globals.css",
            isLeaf: true,
          },
          {
            title: "utils",
            key: "utils",
            children: [
              {
                title: "minio.ts",
                key: "minio.ts",
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
    children: [
      {
        title: "file.svg",
        key: "file.svg",
        isLeaf: true,
      },
      {
        title: "globe.svg",
        key: "globe.svg",
        isLeaf: true,
      },
      {
        title: "next.svg",
        key: "next.svg",
        isLeaf: true,
      },
      {
        title: "vercel.svg",
        key: "vercel.svg",
        isLeaf: true,
      },
      {
        title: "window.svg",
        key: "window.svg",
        isLeaf: true,
      },
    ],
  },
  {
    title: "package.json",
    key: "package.json",
    isLeaf: true,
  },
  {
    title: "package-lock.json",
    key: "package-lock.json",
    isLeaf: true,
  },
  {
    title: "pnpm-lock.yaml",
    key: "pnpm-lock.yaml",
    isLeaf: true,
  },
  {
    title: "next.config.ts",
    key: "next.config.ts",
    isLeaf: true,
  },
  {
    title: "tsconfig.json",
    key: "tsconfig.json",
    isLeaf: true,
  },
  {
    title: "eslint.config.mjs",
    key: "eslint.config.mjs",
    isLeaf: true,
  },
  {
    title: "postcss.config.mjs",
    key: "postcss.config.mjs",
    isLeaf: true,
  },
  {
    title: "docker-compose.yaml",
    key: "docker-compose.yaml",
    isLeaf: true,
  },
  {
    title: "schema.prisma",
    key: "schema.prisma",
    isLeaf: true,
  },
  {
    title: "README.md",
    key: "README.md",
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
