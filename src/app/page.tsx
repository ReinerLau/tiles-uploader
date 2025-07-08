"use client";

import { Tree, Card } from "antd";
import type { TreeDataNode } from "antd";

/**
 * 文件夹结构数据
 */
const treeData: TreeDataNode[] = [];

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
        <Tree treeData={treeData} onSelect={onSelect} onExpand={onExpand} />
      </Card>
    </div>
  );
}
