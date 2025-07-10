"use client";

import { Button, Upload, message } from "antd";
import type { TreeDataNode, UploadFile, UploadProps } from "antd";
import type { TileData } from "@/app/utils/treeUtils";
import { useRef } from "react";

/**
 * 上传进度信息接口
 */
export interface UploadProgress {
  isUploading: boolean;
  percent: number;
}

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
  onUploadSuccess?: (newTileData: TileData[]) => void;
  /**
   * 上传进度变化的回调函数
   */
  onProgressChange?: (progress: UploadProgress) => void;
  /**
   * 是否正在上传（由父组件管理）
   */
  isUploading: boolean;
}

/**
 * 上传任务接口
 */
interface UploadTask {
  file: File;
  z: string;
  x: string;
  y: string;
  onSuccess?: (response: unknown) => void;
  onError?: (error: Error) => void;
}

export default function TileUploader({
  selectedKeys,
  treeData,
  onUploadSuccess,
  onProgressChange,
  isUploading,
}: TileUploaderProps) {
  const [messageApi, contextHolder] = message.useMessage();
  // 移除内部的 isUploading 状态，使用从父组件传递的状态

  /**
   * 上传队列
   */
  const uploadQueueRef = useRef<UploadTask[]>([]);

  /**
   * 上传成功的瓦片数据
   */
  const uploadedTilesRef = useRef<TileData[]>([]);

  /**
   * 总文件数
   */
  const totalFilesRef = useRef(0);

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
   * 处理单个文件上传
   * @param task 上传任务
   */
  const processSingleUpload = async (task: UploadTask): Promise<void> => {
    try {
      // 更新上传进度
      const currentPercent =
        totalFilesRef.current > 0
          ? Math.round(
              (uploadedTilesRef.current.length / totalFilesRef.current) * 100
            )
          : 0;
      onProgressChange?.({
        isUploading: true,
        percent: currentPercent,
      });

      // 将文件流作为请求体发送到后端 API
      const response = await fetch(`/tile/${task.z}/${task.x}/${task.y}`, {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
        },
        body: task.file,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "上传失败");
      }

      const result = await response.json();

      if (result.success) {
        // 收集上传成功的瓦片数据
        if (result.data) {
          const tileData: TileData = {
            id: result.data.id,
            fileName: result.data.fileName,
            z: result.data.z,
            x: result.data.x,
            y: result.data.y,
          };
          uploadedTilesRef.current.push(tileData);
        }

        // 更新完成文件数和进度
        const updatedPercent =
          totalFilesRef.current > 0
            ? Math.round(
                (uploadedTilesRef.current.length / totalFilesRef.current) * 100
              )
            : 0;
        onProgressChange?.({
          isUploading: true,
          percent: updatedPercent,
        });

        task.onSuccess?.(result);
      } else {
        throw new Error(result.error || "上传失败");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "上传失败";
      messageApi.error(`${task.file.name}: ${errorMessage}`);
      task.onError?.(error as Error);
    }
  };

  /**
   * 处理上传队列
   */
  const processUploadQueue = async (): Promise<void> => {
    if (isUploading || uploadQueueRef.current.length === 0) {
      return;
    }

    // 通过 onProgressChange 通知开始上传
    onProgressChange?.({
      isUploading: true,
      percent: 0,
    });

    try {
      while (uploadQueueRef.current.length > 0) {
        const task = uploadQueueRef.current.shift();
        if (task) {
          await processSingleUpload(task);
        }
      }

      // 所有文件上传完成后，统一调用回调函数
      if (uploadedTilesRef.current.length > 0 && onUploadSuccess) {
        onUploadSuccess([...uploadedTilesRef.current]);
        uploadedTilesRef.current = [];
      }

      messageApi.success("所有文件上传完成！");

      // 上传完成后更新进度状态
      onProgressChange?.({
        isUploading: false,
        percent: 100,
      });
    } finally {
      // 确保上传状态被重置
      onProgressChange?.({
        isUploading: false,
        percent: 100,
      });
      // 重置计数器
      totalFilesRef.current = 0;
    }
  };

  /**
   * 上传文件前的处理
   * @param file 上传的文件
   * @param fileList 所有待上传的文件列表
   * @returns 是否继续上传
   */
  const beforeUpload = (file: UploadFile, fileList: UploadFile[]): boolean => {
    // 检查是否选中了文件夹
    if (selectedKeys.length === 0) {
      messageApi.error("请先选择一个文件夹");
      return false;
    }

    // 检查文件类型
    const isJpg =
      file.type === "image/jpeg" || file.name?.toLowerCase().endsWith(".jpg");
    if (!isJpg) {
      messageApi.error(`文件 ${file.name} 不是 JPG 格式`);
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

    // 从文件名中提取 y 参数（假设文件名格式为 "y.jpg"）
    const fileName = file.name || "";
    const yMatch = fileName.match(/^(\d+)\.jpg$/i);
    if (!yMatch) {
      messageApi.error(`文件 ${file.name} 的名称格式不正确，应为 'y.jpg' 格式`);
      return false;
    }

    const z = path[0];
    const x = path[1];
    const y = yMatch[1];

    // 验证参数是否为有效数字格式
    if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
      messageApi.error("文件夹名称和文件名必须是有效的数字");
      return false;
    }

    // 使用 isUploading 状态判断是否为新的上传批次
    if (!isUploading && totalFilesRef.current === 0) {
      totalFilesRef.current = fileList.length;
      onProgressChange?.({
        isUploading: false,
        percent: 0,
      });
    }

    return true;
  };

  /**
   * 自定义上传请求
   * @param options 上传选项
   */
  const customRequest: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;

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

      // 将上传任务添加到队列中
      const task: UploadTask = {
        file: file as File,
        z,
        x,
        y,
        onSuccess,
        onError,
      };

      uploadQueueRef.current.push(task);

      // 只有当队列达到总文件数时才开始处理
      if (uploadQueueRef.current.length === totalFilesRef.current) {
        processUploadQueue();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "上传失败";
      messageApi.error(errorMessage);
      onError?.(error as Error);
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
        multiple
        disabled={isDisabled}
      >
        <Button disabled={isDisabled} loading={isUploading}>
          {isUploading ? "上传中..." : "上传瓦片"}
        </Button>
      </Upload>
    </>
  );
}
