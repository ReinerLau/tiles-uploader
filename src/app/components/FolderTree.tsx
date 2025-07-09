"use client";

import { Tree, Card, Space, message, Button } from "antd";
import { useState, useRef, useEffect } from "react";
import type { TreeDataNode } from "antd";
import TileUploader from "./TileUploader";
import TileDeleter from "./TileDeleter";
import FolderUploader from "./FolderUploader";
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
  const containerRef = useRef<HTMLDivElement>(null);

  // 初始化时获取瓦片数据
  useEffect(() => {
    const fetchTileData = async () => {
      try {
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
            // 这里可以添加点击链接的逻辑，比如下载文件或查看详情
            console.log("点击瓦片链接:", nodeData.tileId, nodeData.fileName);
            messageApi.info(`点击了瓦片: ${nodeData.fileName}`);
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
  const onSelect = (
    selectedKeys: React.Key[],
    info: {
      node: ExtendedTreeDataNode;
      selected: boolean;
      selectedNodes: ExtendedTreeDataNode[];
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
    info: { node: ExtendedTreeDataNode; expanded: boolean }
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
      | { checked: React.Key[]; halfChecked: React.Key[] }
  ) => {
    const keys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;
    setCheckedKeys(keys);
  };

  /**
   * 更新树形数据 - 在瓦片上传成功后调用
   * @param newTileData 新的瓦片数据
   */
  const updateTreeDataAfterUpload = (newTileData: TileData) => {
    setTreeData((prevData) => {
      return addTileToTree(prevData, newTileData) as ExtendedTreeDataNode[];
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
   * 更新树形数据 - 在文件夹上传成功后调用
   * @param newTileDataList 新的瓦片数据数组
   */
  const updateTreeDataAfterFolderUpload = (newTileDataList: TileData[]) => {
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

  return (
    <>
      {contextHolder}
      <div className="p-4 inline-block">
        <Card>
          <div ref={containerRef}>
            <Space direction="vertical">
              <Space>
                <TileUploader
                  selectedKeys={selectedKeys}
                  treeData={treeData}
                  onUploadSuccess={updateTreeDataAfterUpload}
                />
                <FolderUploader
                  onUploadSuccess={updateTreeDataAfterFolderUpload}
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
