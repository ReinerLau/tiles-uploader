"use client";

import { Tree, Card, Button, Space } from "antd";
import { useState } from "react";
import type { TreeDataNode } from "antd";

/**
 * 文件夹结构数据
 */
const initialTreeData: TreeDataNode[] = [];

export default function Home() {
  const [treeData, setTreeData] = useState<TreeDataNode[]>(initialTreeData);

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

  const addRootFolder = () => {
    const newFolderKey = `folder_${Date.now()}`;
    const newFolder: TreeDataNode = {
      title: `新文件夹${treeData.length + 1}`,
      key: newFolderKey,
      isLeaf: false,
      children: [],
    };

    setTreeData([...treeData, newFolder]);
  };

  return (
    <div style={{ padding: "24px" }}>
      <Card>
        <Space direction="vertical">
          <Button type="primary" onClick={addRootFolder}>
            新增文件夹
          </Button>
          <Tree treeData={treeData} onSelect={onSelect} onExpand={onExpand} />
        </Space>
      </Card>
    </div>
  );
}
