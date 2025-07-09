import type { TreeDataNode } from "antd";
import type { Key } from "react";

/**
 * 瓦片数据接口
 */
export interface TileData {
  id: string;
  fileName: string;
  z: string;
  x: string;
  y: string;
}

/**
 * 树形节点接口（用于后端）
 */
export interface TreeNode {
  key: string;
  title: string;
  children?: TreeNode[];
  isLeaf?: boolean;
  tileId?: string;
  fileName?: string;
  selectable?: boolean;
}

/**
 * 构建节点key
 * @param z z层级
 * @param x x层级（可选）
 * @param y y层级（可选）
 * @returns 节点key
 */
export function buildNodeKey(z: string, x?: string, y?: string): string {
  if (y !== undefined && x !== undefined) {
    return `z_${z}_x_${x}_y_${y}`;
  }
  if (x !== undefined) {
    return `z_${z}_x_${x}`;
  }
  return `z_${z}`;
}

/**
 * 对树形数据进行排序
 * @param treeData 树形数据数组
 * @returns 排序后的树形数据
 */
export function sortTreeData<T extends { key: Key; children?: T[] }>(
  treeData: T[]
): T[] {
  // 对根级别节点进行排序（z层级）
  const sortedData = treeData.sort((a, b) => {
    const aZ = parseInt(String(a.key).split("_")[1]);
    const bZ = parseInt(String(b.key).split("_")[1]);
    return aZ - bZ;
  });

  // 对每个层级的子节点进行排序
  sortedData.forEach((zNode) => {
    if (zNode.children) {
      // 对x层级节点排序
      zNode.children.sort((a, b) => {
        const aX = parseInt(String(a.key).split("_")[3]);
        const bX = parseInt(String(b.key).split("_")[3]);
        return aX - bX;
      });

      // 对y层级节点排序
      zNode.children.forEach((xNode) => {
        if (xNode.children) {
          xNode.children.sort((a, b) => {
            const aY = parseInt(String(a.key).split("_")[5]);
            const bY = parseInt(String(b.key).split("_")[5]);
            return aY - bY;
          });
        }
      });
    }
  });

  return sortedData;
}

/**
 * 从瓦片数据数组构建完整的树形结构
 * @param tiles 瓦片数据数组
 * @returns 树形结构数据
 */
export function buildTreeFromTiles(tiles: TileData[]): TreeNode[] {
  const treeMap = new Map<string, TreeNode>();

  // 遍历所有瓦片，构建树形结构
  tiles.forEach((tile) => {
    const { z, x, y, id, fileName } = tile;

    // 构建 z 层级节点
    const zKey = buildNodeKey(z);
    if (!treeMap.has(zKey)) {
      treeMap.set(zKey, {
        key: zKey,
        title: z,
        children: [],
        isLeaf: false,
      });
    }

    // 构建 x 层级节点
    const xKey = buildNodeKey(z, x);
    const zNode = treeMap.get(zKey)!;
    let xNode = zNode.children?.find((child) => child.key === xKey);
    if (!xNode) {
      xNode = {
        key: xKey,
        title: x,
        children: [],
        isLeaf: false,
      };
      zNode.children!.push(xNode);
    }

    // 构建 y 层级节点（叶子节点）
    const yKey = buildNodeKey(z, x, y);
    const yNode: TreeNode = {
      key: yKey,
      title: y,
      isLeaf: true,
      tileId: id,
      fileName: fileName,
      selectable: false,
    };
    xNode.children!.push(yNode);
  });

  // 转换为数组并排序
  const treeData = Array.from(treeMap.values());
  return sortTreeData(treeData);
}

/**
 * 向现有树形结构添加单个瓦片
 * @param treeData 现有的树形数据
 * @param tileData 要添加的瓦片数据
 * @returns 更新后的树形数据
 */
export function addTileToTree(
  treeData: TreeDataNode[],
  tileData: TileData
): TreeDataNode[] {
  const { z, x, y, id, fileName } = tileData;
  const newData = [...treeData];

  // 构建节点key
  const zKey = buildNodeKey(z);
  const xKey = buildNodeKey(z, x);
  const yKey = buildNodeKey(z, x, y);

  // 查找或创建 z 层级节点
  let zNode = newData.find((node) => node.key === zKey);
  if (!zNode) {
    zNode = {
      key: zKey,
      title: z,
      children: [],
      isLeaf: false,
    };
    newData.push(zNode);
  }

  // 查找或创建 x 层级节点
  let xNode = zNode.children?.find((child) => child.key === xKey);
  if (!xNode) {
    xNode = {
      key: xKey,
      title: x,
      children: [],
      isLeaf: false,
    };
    if (!zNode.children) zNode.children = [];
    zNode.children.push(xNode);
  }

  // 创建 y 层级节点（叶子节点）
  const yNode = {
    key: yKey,
    title: y,
    isLeaf: true,
    tileId: id,
    fileName: fileName,
    selectable: false,
  };

  // 检查是否已存在相同的 y 节点
  const existingYNode = xNode.children?.find((child) => child.key === yKey);
  if (!existingYNode) {
    if (!xNode.children) xNode.children = [];
    xNode.children.push(yNode);
  }

  // 对树形数据进行排序
  return sortTreeData(newData);
}

/**
 * 从现有树形结构移除多个瓦片（用于文件夹删除）
 * @param treeData 现有的树形数据
 * @param tilesToRemove 要移除的瓦片数据数组
 * @returns 更新后的树形数据
 */
export function removeTilesFromTree(
  treeData: TreeDataNode[],
  tilesToRemove: TileData[]
): TreeDataNode[] {
  let newData = [...treeData];

  // 逐个移除瓦片
  tilesToRemove.forEach((tile) => {
    newData = removeTileFromTree(newData, tile);
  });

  return newData;
}

/**
 * 从现有树形结构移除单个瓦片
 * @param treeData 现有的树形数据
 * @param tileData 要移除的瓦片数据
 * @returns 更新后的树形数据
 */
export function removeTileFromTree(
  treeData: TreeDataNode[],
  tileData: TileData
): TreeDataNode[] {
  const { z, x, y } = tileData;
  const newData = [...treeData];

  // 构建节点key
  const zKey = buildNodeKey(z);
  const xKey = buildNodeKey(z, x);
  const yKey = buildNodeKey(z, x, y);

  // 查找 z 层级节点
  const zNode = newData.find((node) => node.key === zKey);
  if (!zNode || !zNode.children) {
    return newData; // 如果找不到 z 节点，直接返回原数据
  }

  // 查找 x 层级节点
  const xNode = zNode.children.find((child) => child.key === xKey);
  if (!xNode || !xNode.children) {
    return newData; // 如果找不到 x 节点，直接返回原数据
  }

  // 从 x 节点的子节点中移除 y 节点
  xNode.children = xNode.children.filter((child) => child.key !== yKey);

  // 如果 x 节点没有子节点了，从 z 节点中移除 x 节点
  if (xNode.children.length === 0) {
    zNode.children = zNode.children.filter((child) => child.key !== xKey);
  }

  // 如果 z 节点没有子节点了，从根节点中移除 z 节点
  if (zNode.children.length === 0) {
    return newData.filter((node) => node.key !== zKey);
  }

  // 对树形数据进行排序
  return sortTreeData(newData);
}
