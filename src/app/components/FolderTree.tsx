"use client";

import { Tree, Card, Button, Space, Input, message } from "antd";
import { useState, useRef, useEffect } from "react";
import type { TreeDataNode } from "antd";
import TileUploader from "./TileUploader";
import TileDeleter from "./TileDeleter";
import {
  addTileToTree,
  removeTilesFromTree,
  type TileData,
} from "@/app/utils/treeUtils";

export default function FolderTree() {
  const [messageApi, contextHolder] = message.useMessage();
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]); // 新增：复选框选中的key
  const [editingParentKey, setEditingParentKey] = useState<React.Key | null>(
    null
  ); // 新增：记录正在编辑节点的父级key
  const containerRef = useRef<HTMLDivElement>(null);

  // 初始化时获取瓦片数据
  useEffect(() => {
    const fetchTileData = async () => {
      try {
        const response = await fetch("/tile");
        const result = await response.json();

        if (result.success) {
          setTreeData(result.data);
          messageApi.success(`加载了 ${result.count} 个瓦片数据`);
        } else {
          messageApi.error(result.error || "获取瓦片数据失败");
        }
      } catch (error) {
        console.error("获取瓦片数据失败:", error);
        messageApi.error("获取瓦片数据失败");
      }
    };

    fetchTileData();
  }, [messageApi]);

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
    // 切换文件夹展开状态时选中该文件夹
    setSelectedKeys([info.node.key]);
  };

  /**
   * 复选框选中状态改变
   * @param checkedKeys 选中的key数组
   * @param info 选中状态信息
   */
  const onCheck = (
    checkedKeys:
      | React.Key[]
      | { checked: React.Key[]; halfChecked: React.Key[] },
    info: {
      event: "check";
      node: TreeDataNode;
      checked: boolean;
      nativeEvent: MouseEvent;
      checkedNodes: TreeDataNode[];
      checkedNodesPositions?: { node: TreeDataNode; pos: string }[];
      halfCheckedKeys?: React.Key[];
    }
  ) => {
    const keys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;
    setCheckedKeys(keys);
    console.log("复选框选中的项:", keys, info);

    // 可以在这里添加自定义的处理逻辑
    if (info.checked) {
      messageApi.info(`选中了: ${info.node.title}`);
    } else {
      messageApi.info(`取消选中: ${info.node.title}`);
    }
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
   * 递归更新树节点key
   * @param nodes 树节点数组
   * @param targetKey 目标节点key
   * @param newKey 新key
   * @returns 更新后的树节点数组
   */
  const updateTreeNodeKey = (
    nodes: TreeDataNode[],
    targetKey: React.Key,
    newKey: React.Key
  ): TreeDataNode[] => {
    return nodes.map((node) => {
      if (node.key === targetKey) {
        return { ...node, key: newKey };
      } else if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateTreeNodeKey(node.children, targetKey, newKey),
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
   * 检查同一层级下是否存在相同名称的文件夹
   * @param nodes 树节点数组
   * @param parentKey 父级节点key，null表示根目录
   * @param targetName 要检查的名称
   * @param excludeKey 要排除的节点key（当前正在编辑的节点）
   * @returns 是否存在重复名称
   */
  const checkDuplicateName = (
    nodes: TreeDataNode[],
    parentKey: React.Key | null,
    targetName: string,
    excludeKey: React.Key
  ): boolean => {
    if (parentKey === null) {
      // 检查根目录
      return nodes.some(
        (node) => node.key !== excludeKey && node.title === targetName
      );
    } else {
      // 递归查找父级节点并检查其子节点
      const findParentAndCheck = (nodeList: TreeDataNode[]): boolean => {
        for (const node of nodeList) {
          if (node.key === parentKey) {
            // 找到父级节点，检查其子节点
            return (node.children || []).some(
              (child) => child.key !== excludeKey && child.title === targetName
            );
          } else if (node.children && node.children.length > 0) {
            // 递归查找
            const result = findParentAndCheck(node.children);
            if (result) return true;
          }
        }
        return false;
      };
      return findParentAndCheck(nodes);
    }
  };

  /**
   * 生成新文件夹的key
   * @param parentKey 父级节点key，null表示根目录
   * @param folderName 文件夹名称
   * @returns 新文件夹的key
   */
  const generateFolderKey = (
    parentKey: React.Key | null,
    folderName: string
  ): string => {
    if (parentKey === null) {
      // 根目录下的文件夹，生成 z 层级的key
      return `z_${folderName}`;
    } else {
      const parentKeyStr = String(parentKey);
      if (parentKeyStr.startsWith("z_") && !parentKeyStr.includes("_x_")) {
        // 父级是 z 层级，生成 x 层级的key
        const zValue = parentKeyStr.split("_")[1];
        return `z_${zValue}_x_${folderName}`;
      } else if (
        parentKeyStr.includes("_x_") &&
        !parentKeyStr.includes("_y_")
      ) {
        // 父级是 x 层级，生成 y 层级的key
        const parts = parentKeyStr.split("_");
        const zValue = parts[1];
        const xValue = parts[3];
        return `z_${zValue}_x_${xValue}_y_${folderName}`;
      }
    }
    // 默认情况下使用时间戳（不应该到达这里）
    return `folder_${Date.now()}`;
  };

  /**
   * 新增文件夹
   */
  const addRootFolder = () => {
    const tempFolderKey = `temp_folder_${Date.now()}`;
    const newFolder: TreeDataNode = {
      title: "",
      key: tempFolderKey,
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
      setEditingParentKey(selectedKey); // 记录父级key
    } else {
      // 在根目录新增文件夹
      setTreeData([...treeData, newFolder]);
      setEditingParentKey(null); // 根目录的父级为null
    }

    setEditingKey(tempFolderKey);
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
      // 检查同一层级下是否存在相同名称的文件夹
      const isDuplicate = checkDuplicateName(
        treeData,
        editingParentKey,
        editingValue.trim(),
        editingKey!
      );

      if (isDuplicate) {
        // 存在重复名称，取消新增
        setTreeData((prevData) => removeTreeNode(prevData, editingKey!));
        messageApi.error("文件夹名称重复，请使用其他名称");
      } else {
        // 生成正确的文件夹key
        const correctKey = generateFolderKey(
          editingParentKey,
          editingValue.trim()
        );

        // 确认新增 - 更新文件夹名称和key
        setTreeData((prevData) => {
          // 先更新标题
          const updatedData = updateTreeNodeTitle(
            prevData,
            editingKey!,
            editingValue.trim()
          );
          // 然后更新key
          return updateTreeNodeKey(updatedData, editingKey!, correctKey);
        });

        // 更新展开状态：如果旧key在展开列表中，替换为新key
        setExpandedKeys((prevExpanded) => {
          return prevExpanded.map((key) =>
            key === editingKey ? correctKey : key
          );
        });

        // 确认新增后选中该文件夹（使用新的key）
        setSelectedKeys([correctKey]);
      }
    } else {
      // 取消新增 - 删除该文件夹
      setTreeData((prevData) => removeTreeNode(prevData, editingKey!));
    }
    setEditingKey(null);
    setEditingValue("");
    setEditingParentKey(null); // 清除父级key记录
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
   * 更新树形数据 - 在瓦片上传成功后调用
   * @param newTileData 新的瓦片数据
   */
  const updateTreeDataAfterUpload = (newTileData: TileData) => {
    setTreeData((prevData) => {
      return addTileToTree(prevData, newTileData);
    });
  };

  /**
   * 更新树形数据 - 在瓦片删除成功后调用
   * @param deletedTiles 被删除的瓦片数据数组
   */
  const updateTreeDataAfterDelete = (deletedTiles: TileData[]) => {
    setTreeData((prevData) => {
      return removeTilesFromTree(prevData, deletedTiles);
    });
    // 删除成功后清空复选框选中状态
    setCheckedKeys([]);
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

  const isAddFolderDisabled = editingKey !== null;

  return (
    <>
      {contextHolder}
      <div className="p-4 inline-block">
        <Card>
          <div ref={containerRef}>
            <Space direction="vertical">
              <Space>
                <Button
                  type="primary"
                  onClick={addRootFolder}
                  disabled={isAddFolderDisabled}
                >
                  新增文件夹
                </Button>
                <TileUploader
                  selectedKeys={selectedKeys}
                  treeData={treeData}
                  onUploadSuccess={updateTreeDataAfterUpload}
                />
                <TileDeleter
                  checkedKeys={checkedKeys}
                  onDeleteSuccess={updateTreeDataAfterDelete}
                />
              </Space>
              <div>
                <Tree
                  checkable
                  treeData={treeData}
                  selectedKeys={selectedKeys}
                  expandedKeys={expandedKeys}
                  checkedKeys={checkedKeys}
                  onSelect={onSelect}
                  onExpand={onExpand}
                  onCheck={onCheck}
                  titleRender={titleRender}
                />
              </div>
            </Space>
          </div>
        </Card>
      </div>
    </>
  );
}
