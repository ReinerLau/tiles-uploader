"use client";

import { Button, message, Modal } from "antd";
import type { TileData } from "@/app/utils/treeUtils";
import { useState } from "react";

/**
 * 瓦片删除组件的属性
 */
interface TileDeleterProps {
  /**
   * 复选框选中的key数组
   */
  checkedKeys: React.Key[];
  /**
   * 删除成功后的回调函数
   */
  onDeleteSuccess?: (deletedTiles: TileData[]) => void;
}

/**
 * 坐标接口
 */
interface Coordinate {
  z: string;
  x?: string;
  y?: string;
}

export default function TileDeleter({
  checkedKeys,
  onDeleteSuccess,
}: TileDeleterProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * 解析节点key获取坐标信息
   * @param key 节点key
   * @returns 坐标对象或null
   */
  const parseKeyToCoordinate = (key: React.Key): Coordinate | null => {
    const keyStr = String(key);
    const parts = keyStr.split("_");

    // 验证key格式
    if (parts.length < 2 || parts[0] !== "z") {
      return null;
    }

    const coordinate: Coordinate = {
      z: parts[1],
    };

    // 检查是否有x坐标
    if (parts.length >= 4 && parts[2] === "x") {
      coordinate.x = parts[3];
    }

    // 检查是否有y坐标
    if (parts.length >= 6 && parts[4] === "y") {
      coordinate.y = parts[5];
    }

    return coordinate;
  };

  /**
   * 筛选出最高层级的key
   * 如果选中了父级节点，则忽略其子级节点
   * @param keys 选中的key数组
   * @returns 筛选后的最高层级key数组
   */
  const filterHighestLevelKeys = (keys: React.Key[]): React.Key[] => {
    const coordinates = keys
      .map((key) => ({ key, coord: parseKeyToCoordinate(key) }))
      .filter((item) => item.coord !== null);

    const highestLevelKeys: React.Key[] = [];

    coordinates.forEach(({ key, coord }) => {
      if (!coord) return;

      // 检查是否存在更高层级的父级节点
      const hasParent = coordinates.some(
        ({ key: otherKey, coord: otherCoord }) => {
          if (!otherCoord || otherKey === key) return false;

          // 检查是否是父级关系
          if (otherCoord.z === coord.z) {
            // 同一z层级，检查x层级
            if (!otherCoord.x && coord.x) {
              // otherCoord是z层级，coord是z/x层级，otherCoord是父级
              return true;
            }
            if (otherCoord.x === coord.x && !otherCoord.y && coord.y) {
              // otherCoord是z/x层级，coord是z/x/y层级，otherCoord是父级
              return true;
            }
          }
          return false;
        }
      );

      if (!hasParent) {
        highestLevelKeys.push(key);
      }
    });

    return highestLevelKeys;
  };

  /**
   * 删除瓦片记录
   */
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // 检查是否选中了有效节点
      if (checkedKeys.length === 0) {
        messageApi.error("请先选择要删除的瓦片文件或文件夹");
        return;
      }

      // 筛选出最高层级的key
      const highestLevelKeys = filterHighestLevelKeys(checkedKeys);

      if (highestLevelKeys.length === 0) {
        messageApi.error("没有找到有效的瓦片文件或文件夹");
        return;
      }

      // 将key转换为坐标格式
      const coordinates = highestLevelKeys
        .map((key) => parseKeyToCoordinate(key))
        .filter((coord): coord is Coordinate => coord !== null);

      if (coordinates.length === 0) {
        messageApi.error("选中的项目格式无效");
        return;
      }

      // 构建请求体
      const requestBody = {
        coordinates,
      };

      // 发送删除请求到后端 API
      const response = await fetch("/tile", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "删除失败");
      }

      const result = await response.json();

      const deletedCount = result.data.deletedCount || 0;

      messageApi.success(`删除成功！共删除 ${deletedCount} 个瓦片记录`);

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
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * 显示删除确认对话框
   */
  const showDeleteConfirm = () => {
    if (checkedKeys.length === 0) {
      messageApi.error("请先选择要删除的瓦片文件或文件夹");
      return;
    }

    // 筛选出最高层级的key
    const highestLevelKeys = filterHighestLevelKeys(checkedKeys);

    if (highestLevelKeys.length === 0) {
      messageApi.error("没有找到有效的瓦片文件或文件夹");
      return;
    }

    // 将key转换为坐标格式
    const coordinates = highestLevelKeys
      .map((key) => parseKeyToCoordinate(key))
      .filter((coord): coord is Coordinate => coord !== null);

    if (coordinates.length === 0) {
      messageApi.error("选中的项目格式无效");
      return;
    }

    modal.confirm({
      title: "确认删除",
      content: `此操作将删除选中项目及其下所有瓦片，操作不可撤销。`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: handleDelete,
    });
  };

  const isDisabled = checkedKeys.length === 0 || isDeleting;

  return (
    <>
      {contextHolder}
      {modalContextHolder}
      <Button
        danger
        onClick={showDeleteConfirm}
        disabled={isDisabled}
        loading={isDeleting}
      >
        {isDeleting ? "删除中..." : "删除"}
      </Button>
    </>
  );
}
