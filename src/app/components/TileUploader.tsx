"use client";

import { Button, Upload, message } from "antd";
import type { TreeDataNode, UploadFile, UploadProps } from "antd";
import type { TileData } from "@/app/utils/treeUtils";
import { useState } from "react";

/**
 * 瓦片上传组件的属性
 */
interface TileUploaderProps {
  /**
   * 选中的文件夹key数组
   */
  selectedKeys: React.Key[];
  /**
   * 树节点数据数组
   */
  treeData: TreeDataNode[];
  /**
   * 上传成功后的回调函数
   */
  onUploadSuccess?: (newTileData: TileData) => void;
}

export default function TileUploader({
  selectedKeys,
  treeData,
  onUploadSuccess,
}: TileUploaderProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [isUploading, setIsUploading] = useState(false);

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
   * 上传文件前的处理
   * @param file 上传的文件
   * @returns 是否继续上传
   */
  const beforeUpload = (file: UploadFile): boolean => {
    // 检查是否选中了文件夹
    if (selectedKeys.length === 0) {
      messageApi.error("请先选择一个文件夹");
      return false;
    }

    // 检查文件类型
    const isJpg =
      file.type === "image/jpeg" || file.name?.toLowerCase().endsWith(".jpg");
    if (!isJpg) {
      messageApi.error("只能上传 JPG 格式的文件");
      return false;
    }

    // 获取选中节点的路径
    const selectedKey = selectedKeys[0];
    const path = getNodePath(selectedKey);

    // 检查路径层级是否符合要求（至少需要2层：z/x/）
    if (path.length < 2) {
      messageApi.error("请选择至少二层级的文件夹（z/x/）");
      return false;
    }

    return true;
  };

  /**
   * 自定义上传请求
   * @param options 上传选项
   */
  const customRequest: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;

    setIsUploading(true);
    try {
      // 获取选中节点的路径
      const selectedKey = selectedKeys[0];
      const path = getNodePath(selectedKey);

      // 提取 z, x 参数
      const z = path[0]; // 第一层级文件夹名作为 z 参数
      const x = path[1]; // 第二层级文件夹名作为 x 参数

      // 从文件名中提取 y 参数（假设文件名格式为 "y.jpg"）
      const fileName = (file as File).name;
      const yMatch = fileName.match(/^(\d+)\.jpg$/i);
      if (!yMatch) {
        throw new Error("文件名格式不正确，应为 'y.jpg' 格式");
      }
      const y = yMatch[1];

      // 验证参数是否为有效数字格式
      if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
        throw new Error("文件夹名称和文件名必须是有效的数字");
      }

      // 将文件流作为请求体发送到后端 API
      const response = await fetch(`/tile/${z}/${x}/${y}`, {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
        },
        body: file as File,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "上传失败");
      }

      const result = await response.json();

      messageApi.success(`文件上传成功`);

      // 调用回调函数更新树形数据
      if (onUploadSuccess && result.data) {
        const tileData: TileData = {
          id: result.data.id,
          fileName: result.data.fileName,
          z: result.data.z,
          x: result.data.x,
          y: result.data.y,
        };
        onUploadSuccess(tileData);
      }

      onSuccess?.(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "上传失败";
      messageApi.error(errorMessage);
      onError?.(error as Error);
    } finally {
      setIsUploading(false);
    }
  };

  const isDisabled = selectedKeys.length === 0 || isUploading;

  return (
    <>
      {contextHolder}
      <Upload
        beforeUpload={beforeUpload}
        customRequest={customRequest}
        showUploadList={false}
        accept=".jpg,.jpeg"
        disabled={isDisabled}
      >
        <Button disabled={isDisabled} loading={isUploading}>
          {isUploading ? "上传中..." : "上传瓦片"}
        </Button>
      </Upload>
    </>
  );
}
