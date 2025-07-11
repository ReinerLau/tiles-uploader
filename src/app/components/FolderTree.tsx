"use client";

import { Tree, Card, Space, message, Button, Image, Progress } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useState, useRef, useEffect } from "react";
import type { TreeDataNode } from "antd";
import TilesUploader, {
  UploadMode,
  type UploadProgress,
} from "./TilesUploader";
import TileDeleter from "./TileDeleter";
import {
  addTileToTree,
  removeTilesFromTree,
  type TileData,
} from "@/app/utils/treeUtils";

// 扩展树节点类型，添加瓦片相关属性
interface ExtendedTreeDataNode extends TreeDataNode {
  tileId?: string;
  fileName?: string;
}

export default function FolderTree() {
  const [messageApi, contextHolder] = message.useMessage();
  const [treeData, setTreeData] = useState<ExtendedTreeDataNode[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // 添加全局上传状态管理
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<{
    visible: boolean;
    src: string;
    alt: string;
  }>({
    visible: false,
    src: "",
    alt: "",
  });
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    percent: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // 初始化时获取瓦片数据
  useEffect(() => {
    const fetchTileData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/tile");
        const result = await response.json();

        if (result.success) {
          setTreeData(result.data);
        } else {
          messageApi.error(result.error || "获取瓦片数据失败");
        }
      } catch (error) {
        console.error("获取瓦片数据失败:", error);
        messageApi.error("获取瓦片数据失败");
      } finally {
        setIsLoading(false);
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
   * 获取瓦片图片并显示预览
   * @param fileName 瓦片文件名
   */
  const handleTilePreview = async (fileName: string) => {
    try {
      // 解析文件名获取 z, x, y 坐标
      const parts = fileName.split("-");
      if (parts.length !== 3) {
        throw new Error("文件名格式不正确");
      }

      const [z, x, y] = parts;

      // 直接使用 API 端点作为图片源
      const imageUrl = `/tile/${z}/${x}/${y}`;

      // 显示图片预览
      setPreviewImage({
        visible: true,
        src: imageUrl,
        alt: `瓦片 ${fileName} (${z}/${x}/${y})`,
      });
    } catch (error) {
      console.error("获取瓦片预览失败:", error);
      messageApi.error(
        error instanceof Error ? error.message : "获取图片预览失败"
      );
    }
  };

  /**
   * 自定义节点标题渲染
   * @param nodeData 节点数据
   * @returns 渲染的节点标题
   */
  const titleRender = (nodeData: ExtendedTreeDataNode): React.ReactNode => {
    // 检查是否为叶子节点且有瓦片信息
    if (nodeData.isLeaf && nodeData.tileId && nodeData.fileName) {
      // 为叶子节点渲染链接按钮
      return (
        <Button
          type="link"
          size="small"
          style={{ padding: 0, height: "auto" }}
          onClick={(e) => {
            e.stopPropagation();
            // 调用预览函数
            if (nodeData.fileName) {
              handleTilePreview(nodeData.fileName);
            }
          }}
        >
          {typeof nodeData.title === "string"
            ? nodeData.title
            : String(nodeData.title)}
        </Button>
      );
    }

    // 非叶子节点正常显示
    return typeof nodeData.title === "function"
      ? nodeData.title(nodeData)
      : nodeData.title;
  };

  /**
   * 选中文件/文件夹
   * @param selectedKeys 选中文件/文件夹的key
   * @param info 选中文件/文件夹的信息
   */
  const onSelect = (selectedKeys: React.Key[]) => {
    setSelectedKeys(selectedKeys);
  };

  /**
   * 展开文件夹
   * @param expandedKeys 展开文件夹的key
   * @param info 展开文件夹的信息
   */
  const onExpand = (
    expandedKeys: React.Key[],
    info: { node: ExtendedTreeDataNode; expanded: boolean }
  ) => {
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
      | { checked: React.Key[]; halfChecked: React.Key[] }
  ) => {
    const keys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;
    setCheckedKeys(keys);
  };

  /**
   * 更新树形数据 - 在瓦片上传成功后调用（支持单个瓦片和文件夹上传）
   * @param newTileDataList 新的瓦片数据数组
   */
  const updateTreeDataAfterUpload = (newTileDataList: TileData[]) => {
    setTreeData((prevData) => {
      let updatedData = prevData;
      for (const tileData of newTileDataList) {
        updatedData = addTileToTree(
          updatedData,
          tileData
        ) as ExtendedTreeDataNode[];
      }
      return updatedData;
    });
  };

  /**
   * 更新树形数据 - 在瓦片删除成功后调用
   * @param deletedTiles 被删除的瓦片数据数组
   */
  const updateTreeDataAfterDelete = (deletedTiles: TileData[]) => {
    setTreeData((prevData) => {
      return removeTilesFromTree(
        prevData,
        deletedTiles
      ) as ExtendedTreeDataNode[];
    });
    // 删除成功后清空复选框选中状态
    setCheckedKeys([]);
  };

  /**
   * 处理上传进度变化
   * @param progress 上传进度信息
   */
  const handleUploadProgressChange = (progress: UploadProgress) => {
    setUploadProgress(progress);
    // 同步全局上传状态
    setIsUploading(progress.isUploading);
  };

  return (
    <>
      {contextHolder}
      <div className="inline-block h-full">
        <Card className="h-full">
          <div ref={containerRef}>
            <Space direction="vertical">
              <Space>
                <TilesUploader
                  mode={UploadMode.SINGLE}
                  selectedKeys={selectedKeys}
                  treeData={treeData}
                  onUploadSuccess={updateTreeDataAfterUpload}
                  onProgressChange={handleUploadProgressChange}
                  isUploading={isUploading}
                />
                <TilesUploader
                  mode={UploadMode.FOLDER}
                  onUploadSuccess={updateTreeDataAfterUpload}
                  onProgressChange={handleUploadProgressChange}
                  isUploading={isUploading}
                />
                <TileDeleter
                  checkedKeys={checkedKeys}
                  onDeleteSuccess={updateTreeDataAfterDelete}
                />
              </Space>
              <div>
                {isLoading ? (
                  <div className="text-center">
                    <LoadingOutlined spin className="mr-2 text-4xl" />
                  </div>
                ) : (
                  <Tree
                    checkable
                    height={600}
                    treeData={treeData}
                    selectedKeys={selectedKeys}
                    expandedKeys={expandedKeys}
                    checkedKeys={checkedKeys}
                    onSelect={onSelect}
                    onExpand={onExpand}
                    onCheck={onCheck}
                    titleRender={titleRender}
                  />
                )}
              </div>
              {uploadProgress.isUploading && (
                <div>
                  <Progress percent={uploadProgress.percent} status="active" />
                </div>
              )}
            </Space>
          </div>
        </Card>
      </div>
      {/* 图片预览组件 */}
      <Image
        style={{ display: "none" }}
        preview={{
          visible: previewImage.visible,
          src: previewImage.src,
          onVisibleChange: (visible) => {
            setPreviewImage((prev) => ({ ...prev, visible }));
          },
        }}
        alt={previewImage.alt}
      />
    </>
  );
}
