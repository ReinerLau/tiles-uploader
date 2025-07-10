"use client";

import { Button, Upload, message } from "antd";
import type { UploadFile, UploadProps } from "antd";
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
 * 文件夹上传组件的属性
 */
interface FolderUploaderProps {
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
  webkitRelativePath: string;
  onSuccess?: (response: unknown) => void;
  onError?: (error: Error) => void;
}

export default function FolderUploader({
  onUploadSuccess,
  onProgressChange,
  isUploading,
}: FolderUploaderProps) {
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
   * 解析文件路径，提取z、x、y参数
   * @param filePath 文件路径
   * @returns 解析后的坐标对象或null
   */
  const parseFilePath = (
    filePath: string
  ): { z: string; x: string; y: string } | null => {
    // 移除文件扩展名
    const pathWithoutExt = filePath.replace(/\.[^/.]+$/, "");

    // 分割路径
    const parts = pathWithoutExt
      .split("/")
      .filter((part) => part.trim() !== "");

    // 检查是否为三层结构
    if (parts.length !== 3) {
      return null;
    }

    const [z, x, y] = parts;

    // 验证是否为有效数字
    if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
      return null;
    }

    return { z, x, y };
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

      const parsedPath = parseFilePath(task.webkitRelativePath);
      if (!parsedPath) {
        throw new Error("文件路径格式不正确");
      }

      // 调用后端 API 创建瓦片记录
      const response = await fetch(
        `/tile/${parsedPath.z}/${parsedPath.x}/${parsedPath.y}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "image/jpeg",
          },
          body: task.file,
        }
      );

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
   * 上传文件夹前的处理
   * @param file 上传的文件
   * @param fileList 所有待上传的文件列表
   * @returns 是否继续上传
   */
  const beforeUpload = (file: UploadFile, fileList: UploadFile[]): boolean => {
    // 检查文件类型
    const isJpg =
      file.type === "image/jpeg" || file.name?.toLowerCase().endsWith(".jpg");
    if (!isJpg) {
      messageApi.error(`文件 ${file.name} 不是 JPG 格式`);
      return false;
    }

    // 检查文件路径结构
    const webkitRelativePath = (
      file as UploadFile & { webkitRelativePath?: string }
    ).webkitRelativePath;
    if (!webkitRelativePath) {
      messageApi.error("请选择文件夹而不是单个文件");
      return false;
    }

    const parsedPath = parseFilePath(webkitRelativePath);
    if (!parsedPath) {
      messageApi.error(
        `文件 ${file.name} 的路径结构不正确，应为 z/x/y.jpg 格式`
      );
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
      // 获取文件的相对路径
      const webkitRelativePath = (
        file as UploadFile & { webkitRelativePath?: string }
      ).webkitRelativePath;

      if (!webkitRelativePath) {
        throw new Error("无法获取文件路径信息");
      }

      // 将上传任务添加到队列中
      const task: UploadTask = {
        file: file as File,
        webkitRelativePath,
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

  return (
    <>
      {contextHolder}
      <Upload
        beforeUpload={beforeUpload}
        customRequest={customRequest}
        showUploadList={false}
        accept=".jpg,.jpeg"
        directory
        multiple
        disabled={isUploading}
      >
        <Button loading={isUploading} disabled={isUploading}>
          {isUploading ? "上传中..." : "上传文件夹"}
        </Button>
      </Upload>
    </>
  );
}
