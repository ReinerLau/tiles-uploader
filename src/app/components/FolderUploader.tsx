"use client";

import { Button, Upload, message } from "antd";
import type { UploadFile, UploadProps } from "antd";
import type { TileData } from "@/app/utils/treeUtils";
import { useRef, useState } from "react";

/**
 * 文件夹上传组件的属性
 */
interface FolderUploaderProps {
  /**
   * 上传成功后的回调函数
   */
  onUploadSuccess?: (newTileData: TileData[]) => void;
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
}: FolderUploaderProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [isUploading, setIsUploading] = useState(false);
  const uploadQueueRef = useRef<UploadTask[]>([]);
  const isProcessingRef = useRef(false);
  const uploadedTilesRef = useRef<TileData[]>([]);

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
        messageApi.success(`文件上传成功！文件名：${result.data.fileName}`);

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
    if (isProcessingRef.current || uploadQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    setIsUploading(true);

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
    } finally {
      isProcessingRef.current = false;
      setIsUploading(false);
    }
  };

  /**
   * 上传文件夹前的处理
   * @param file 上传的文件
   * @returns 是否继续上传
   */
  const beforeUpload = (file: UploadFile): boolean => {
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

      // 开始处理队列
      processUploadQueue();
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
        <Button loading={isUploading}>
          {isUploading ? "上传中..." : "上传文件夹"}
        </Button>
      </Upload>
    </>
  );
}
