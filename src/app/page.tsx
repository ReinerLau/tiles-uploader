"use client";

import { Tree, Card, Button, Space, Input } from "antd";
import { useState } from "react";
import type { TreeDataNode } from "antd";

export default function Home() {
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

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
      title: "",
      key: newFolderKey,
      isLeaf: false,
      children: [],
    };

    setTreeData([...treeData, newFolder]);
    setEditingKey(newFolderKey);
    setEditingValue("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingValue(e.target.value);
  };

  const handleInputBlur = () => {
    if (editingValue.trim()) {
      // 确认新增 - 更新文件夹名称
      setTreeData((prevData) =>
        prevData.map((item) =>
          item.key === editingKey
            ? { ...item, title: editingValue.trim() }
            : item
        )
      );
    } else {
      // 取消新增 - 删除该文件夹
      setTreeData((prevData) =>
        prevData.filter((item) => item.key !== editingKey)
      );
    }
    setEditingKey(null);
    setEditingValue("");
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const renderTreeTitle = (node: TreeDataNode) => {
    if (editingKey === node.key) {
      return (
        <Input
          value={editingValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          autoFocus
          size="small"
          style={{ width: "150px" }}
        />
      );
    }
    return node.title;
  };

  const processedTreeData = treeData.map((node) => ({
    ...node,
    title: renderTreeTitle(node),
  }));

  return (
    <div style={{ padding: "24px" }}>
      <Card>
        <Space direction="vertical">
          <Button type="primary" onClick={addRootFolder}>
            新增文件夹
          </Button>
          <Tree
            treeData={processedTreeData}
            onSelect={onSelect}
            onExpand={onExpand}
          />
        </Space>
      </Card>
    </div>
  );
}
