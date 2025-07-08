"use client";

import { Tree, Card, Button, Space, Input } from "antd";
import { useState, useRef, useEffect } from "react";
import type { TreeDataNode } from "antd";

export default function Home() {
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // 监听点击事件，点击容器外部时取消选择
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setSelectedKeys([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    setSelectedKeys(selectedKeys);
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
    setExpandedKeys(expandedKeys);
  };

  /**
   * 递归更新树节点
   * @param nodes 树节点数组
   * @param targetKey 目标节点key
   * @param newChild 新增的子节点
   * @returns 更新后的树节点数组
   */
  const updateTreeNodes = (
    nodes: TreeDataNode[],
    targetKey: React.Key,
    newChild: TreeDataNode
  ): TreeDataNode[] => {
    return nodes.map((node) => {
      if (node.key === targetKey) {
        // 找到目标节点，添加子节点
        const updatedChildren = [...(node.children || []), newChild];
        return {
          ...node,
          children: updatedChildren,
        };
      } else if (node.children && node.children.length > 0) {
        // 递归查找子节点
        return {
          ...node,
          children: updateTreeNodes(node.children, targetKey, newChild),
        };
      }
      return node;
    });
  };

  /**
   * 递归更新树节点标题
   * @param nodes 树节点数组
   * @param targetKey 目标节点key
   * @param newTitle 新标题
   * @returns 更新后的树节点数组
   */
  const updateTreeNodeTitle = (
    nodes: TreeDataNode[],
    targetKey: React.Key,
    newTitle: string
  ): TreeDataNode[] => {
    return nodes.map((node) => {
      if (node.key === targetKey) {
        return { ...node, title: newTitle };
      } else if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateTreeNodeTitle(node.children, targetKey, newTitle),
        };
      }
      return node;
    });
  };

  /**
   * 递归删除树节点
   * @param nodes 树节点数组
   * @param targetKey 目标节点key
   * @returns 更新后的树节点数组
   */
  const removeTreeNode = (
    nodes: TreeDataNode[],
    targetKey: React.Key
  ): TreeDataNode[] => {
    return nodes
      .filter((node) => node.key !== targetKey)
      .map((node) => {
        if (node.children && node.children.length > 0) {
          return {
            ...node,
            children: removeTreeNode(node.children, targetKey),
          };
        }
        return node;
      });
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

    // 检查是否有选中的文件夹
    if (selectedKeys.length > 0) {
      const selectedKey = selectedKeys[0];
      // 在选中的文件夹下新增子文件夹
      setTreeData((prevData) =>
        updateTreeNodes(prevData, selectedKey, newFolder)
      );
      // 展开父文件夹
      setExpandedKeys((prevExpanded) => [...prevExpanded, selectedKey]);
    } else {
      // 在根目录新增文件夹
      setTreeData([...treeData, newFolder]);
    }

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
        updateTreeNodeTitle(prevData, editingKey!, editingValue.trim())
      );
      // 确认新增后选中该文件夹
      setSelectedKeys([editingKey!]);
    } else {
      // 取消新增 - 删除该文件夹
      setTreeData((prevData) => removeTreeNode(prevData, editingKey!));
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
  const titleRender = (node: TreeDataNode): React.ReactNode => {
    if (editingKey === node.key) {
      return (
        <Input
          value={editingValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          autoFocus
          size="small"
        />
      );
    }
    return typeof node.title === "function" ? node.title(node) : node.title;
  };

  return (
    <div style={{ padding: "24px" }}>
      <Card>
        <div ref={containerRef}>
          <Space direction="vertical">
            <Button type="primary" onClick={addRootFolder}>
              新增文件夹
            </Button>
            <div>
              <Tree
                treeData={treeData}
                selectedKeys={selectedKeys}
                expandedKeys={expandedKeys}
                onSelect={onSelect}
                onExpand={onExpand}
                titleRender={titleRender}
              />
            </div>
          </Space>
        </div>
      </Card>
    </div>
  );
}
