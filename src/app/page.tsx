"use client";

import { Tree, Card, Button, Space, Input } from "antd";
import { useState } from "react";
import type { TreeDataNode } from "antd";

export default function Home() {
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  /**
   * 选中文件/文件夹
   * @param selectedKeys 选中文件/文件夹的key
   * @param info 选中文件/文件夹的信息
   */
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

  /**
   * 展开文件夹
   * @param expandedKeys 展开文件夹的key
   * @param info 展开文件夹的信息
   */
  const onExpand = (
    expandedKeys: React.Key[],
    info: { node: TreeDataNode; expanded: boolean }
  ) => {
    console.log("展开的文件夹:", expandedKeys, info);
  };

  /**
   * 新增文件夹
   */
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

  /**
   * 输入框内容改变
   * @param e 输入框内容改变的事件
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingValue(e.target.value);
  };

  /**
   * 输入框失去焦点
   */
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

  /**
   * 输入框按下回车键
   * @param e 输入框按下回车键的事件
   */
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  /**
   * 渲染树节点标题
   * @param node 树节点
   * @returns 渲染后的树节点标题
   */
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

  /**
   * 处理树数据
   * @returns 处理后的树数据
   */
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
