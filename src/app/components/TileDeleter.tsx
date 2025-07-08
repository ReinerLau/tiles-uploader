"use client";

import { Button, message, Modal } from "antd";
import type { TreeDataNode } from "antd";
import type { TileData } from "@/app/utils/treeUtils";

/**
 * 瓦片删除组件的属性
 */
interface TileDeleterProps {
  /**
   * 选中的文件夹key数组
   */
  selectedKeys: React.Key[];
  /**
   * 树节点数据数组
   */
  treeData: TreeDataNode[];
  /**
   * 删除成功后的回调函数
   */
  onDeleteSuccess?: (deletedTiles: TileData[]) => void;
}

export default function TileDeleter({
  selectedKeys,
  treeData,
  onDeleteSuccess,
}: TileDeleterProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();

  /**
   * 获取节点的完整路径
   * @param nodeKey 节点key
   * @returns 从根到该节点的路径数组
   */
  const getNodePath = (nodeKey: React.Key): string[] => {
    const path: string[] = [];

    /**
     * 递归查找节点路径
     * @param nodes 树节点数组
     * @param targetKey 目标节点key
     * @param currentPath 当前路径
     * @returns 是否找到目标节点
     */
    const findPath = (
      nodes: TreeDataNode[],
      targetKey: React.Key,
      currentPath: string[]
    ): boolean => {
      for (const node of nodes) {
        const newPath = [...currentPath, node.title as string];

        if (node.key === targetKey) {
          path.push(...newPath);
          return true;
        }

        if (node.children && node.children.length > 0) {
          if (findPath(node.children, targetKey, newPath)) {
            return true;
          }
        }
      }
      return false;
    };

    findPath(treeData, nodeKey, []);
    return path;
  };

  /**
   * 检查选中的节点类型
   * @returns 节点类型信息
   */
  const getSelectedNodeType = (): {
    isValid: boolean;
    type: "tile" | "folder";
    level: number;
    path: string[];
  } => {
    if (selectedKeys.length === 0) {
      return { isValid: false, type: "tile", level: 0, path: [] };
    }

    const selectedKey = selectedKeys[0];
    const path = getNodePath(selectedKey);

    // 检查路径层级
    if (path.length === 0) {
      return { isValid: false, type: "tile", level: 0, path: [] };
    }

    // 验证所有路径参数是否为数字格式
    const allNumeric = path.every((segment) => /^\d+$/.test(segment));
    if (!allNumeric) {
      return { isValid: false, type: "tile", level: 0, path: [] };
    }

    // 根据路径层级确定类型
    if (path.length === 1) {
      // z 层级文件夹
      return { isValid: true, type: "folder", level: 1, path };
    } else if (path.length === 2) {
      // z/x 层级文件夹
      return { isValid: true, type: "folder", level: 2, path };
    } else if (path.length === 3) {
      // z/x/y 瓦片文件
      return { isValid: true, type: "tile", level: 3, path };
    }

    return { isValid: false, type: "tile", level: 0, path: [] };
  };

  /**
   * 删除瓦片记录
   */
  const handleDelete = async () => {
    try {
      // 检查是否选中了有效节点
      if (selectedKeys.length === 0) {
        messageApi.error("请先选择一个瓦片文件或文件夹");
        return;
      }

      const nodeType = getSelectedNodeType();
      if (!nodeType.isValid) {
        messageApi.error("请选择一个有效的瓦片文件或文件夹");
        return;
      }

      const { path } = nodeType;

      // 构建API路径
      const apiPath = path.join("/");

      // 发送删除请求到后端 API
      const response = await fetch(`/tile/${apiPath}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "删除失败");
      }

      const result = await response.json();

      const deletionType = nodeType.type === "tile" ? "瓦片" : "文件夹";
      const deletedCount = result.data.deletedCount || 1;

      messageApi.success(
        `${deletionType}删除成功！共删除 ${deletedCount} 个瓦片记录`
      );

      // 调用回调函数更新树形数据
      if (onDeleteSuccess && result.data.deletedTiles) {
        const deletedTiles: TileData[] = result.data.deletedTiles.map(
          (tile: {
            id: string;
            fileName: string;
            z: string;
            x: string;
            y: string;
          }) => ({
            id: tile.id,
            fileName: tile.fileName,
            z: tile.z,
            x: tile.x,
            y: tile.y,
          })
        );
        onDeleteSuccess(deletedTiles);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "删除失败";
      messageApi.error(errorMessage);
    }
  };

  /**
   * 显示删除确认对话框
   */
  const showDeleteConfirm = () => {
    const nodeType = getSelectedNodeType();
    if (!nodeType.isValid) {
      messageApi.error("请选择一个有效的瓦片文件或文件夹");
      return;
    }

    const { type, path } = nodeType;
    const pathStr = path.join("/");
    const itemName =
      type === "tile" ? `瓦片文件 "${pathStr}"` : `文件夹 "${pathStr}"`;
    const actionDescription =
      type === "tile" ? "删除该瓦片文件" : "删除该文件夹及其下所有瓦片";

    modal.confirm({
      title: "确认删除",
      content: `确定要${actionDescription} ${itemName} 吗？此操作不可撤销。`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: handleDelete,
    });
  };

  const nodeType = getSelectedNodeType();
  const buttonText =
    nodeType.isValid && nodeType.type === "folder" ? "删除文件夹" : "删除瓦片";

  return (
    <>
      {contextHolder}
      {modalContextHolder}
      <Button danger onClick={showDeleteConfirm} disabled={!nodeType.isValid}>
        {buttonText}
      </Button>
    </>
  );
}
