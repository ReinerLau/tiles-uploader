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
  onDeleteSuccess?: (deletedTileData: TileData) => void;
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
   * 检查选中的节点是否为瓦片文件
   * @returns 是否为瓦片文件
   */
  const isSelectedNodeTileFile = (): boolean => {
    if (selectedKeys.length === 0) return false;

    const selectedKey = selectedKeys[0];
    const path = getNodePath(selectedKey);

    // 检查路径层级是否符合要求（需要3层：z/x/y）
    if (path.length !== 3) return false;

    // 检查最后一层是否为数字格式（瓦片文件名）
    const y = path[2];
    return /^\d+$/.test(y);
  };

  /**
   * 删除瓦片记录
   */
  const handleDelete = async () => {
    try {
      // 检查是否选中了瓦片文件
      if (selectedKeys.length === 0) {
        messageApi.error("请先选择一个瓦片文件");
        return;
      }

      if (!isSelectedNodeTileFile()) {
        messageApi.error("请选择一个瓦片文件（需要选择三层级的文件：z/x/y）");
        return;
      }

      // 获取选中节点的路径
      const selectedKey = selectedKeys[0];
      const path = getNodePath(selectedKey);

      // 提取 z, x, y 参数
      const z = path[0]; // 第一层级文件夹名作为 z 参数
      const x = path[1]; // 第二层级文件夹名作为 x 参数
      const y = path[2]; // 第三层级文件夹名作为 y 参数

      // 验证参数是否为有效数字格式
      if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
        messageApi.error("文件夹名称必须是有效的数字");
        return;
      }

      // 发送删除请求到后端 API
      const response = await fetch(`/tile/${z}/${x}/${y}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "删除失败");
      }

      const result = await response.json();

      messageApi.success(`瓦片删除成功！文件名：${result.data.fileName}`);

      // 调用回调函数更新树形数据
      if (onDeleteSuccess && result.data) {
        const tileData: TileData = {
          id: result.data.id,
          fileName: result.data.fileName,
          z: result.data.z,
          x: result.data.x,
          y: result.data.y,
        };
        onDeleteSuccess(tileData);
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
    if (!isSelectedNodeTileFile()) {
      messageApi.error("请选择一个瓦片文件（需要选择三层级的文件：z/x/y）");
      return;
    }

    const selectedKey = selectedKeys[0];
    const path = getNodePath(selectedKey);
    const fileName = `${path[0]}-${path[1]}-${path[2]}`;

    modal.confirm({
      title: "确认删除",
      content: `确定要删除瓦片文件 "${fileName}" 吗？此操作不可撤销。`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: handleDelete,
    });
  };

  return (
    <>
      {contextHolder}
      {modalContextHolder}
      <Button
        danger
        onClick={showDeleteConfirm}
        disabled={!isSelectedNodeTileFile()}
      >
        删除瓦片
      </Button>
    </>
  );
}
