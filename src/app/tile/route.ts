import { NextResponse } from "next/server";
import prisma from "@/app/utils/prisma";

/**
 * 树形节点接口
 */
interface TreeNode {
  key: string;
  title: string;
  children?: TreeNode[];
  isLeaf?: boolean;
  tileId?: string; // 叶子节点存储瓦片ID
  fileName?: string; // 叶子节点存储文件名
}

/**
 * GET /tile
 * 获取所有瓦片数据，按照 z -> x -> y 的层级结构组织成树形结构
 */
export async function GET() {
  try {
    // 查询所有瓦片记录
    const tiles = await prisma.tile.findMany({
      orderBy: [{ z: "asc" }, { x: "asc" }, { y: "asc" }],
    });

    // 构建树形结构
    const treeMap = new Map<string, TreeNode>();

    // 遍历所有瓦片，构建树形结构
    tiles.forEach((tile) => {
      const { z, x, y, id, fileName } = tile;

      // 构建 z 层级节点
      const zKey = `z_${z}`;
      if (!treeMap.has(zKey)) {
        treeMap.set(zKey, {
          key: zKey,
          title: `Z-${z}`,
          children: [],
          isLeaf: false,
        });
      }

      // 构建 x 层级节点
      const xKey = `z_${z}_x_${x}`;
      const zNode = treeMap.get(zKey)!;
      let xNode = zNode.children?.find((child) => child.key === xKey);
      if (!xNode) {
        xNode = {
          key: xKey,
          title: `X-${x}`,
          children: [],
          isLeaf: false,
        };
        zNode.children!.push(xNode);
      }

      // 构建 y 层级节点（叶子节点）
      const yKey = `z_${z}_x_${x}_y_${y}`;
      const yNode: TreeNode = {
        key: yKey,
        title: `Y-${y}`,
        isLeaf: true,
        tileId: id,
        fileName: fileName,
      };
      xNode.children!.push(yNode);
    });

    // 转换为数组并排序
    const treeData = Array.from(treeMap.values()).sort((a, b) => {
      const aZ = parseInt(a.key.split("_")[1]);
      const bZ = parseInt(b.key.split("_")[1]);
      return aZ - bZ;
    });

    // 对每个层级的子节点进行排序
    treeData.forEach((zNode) => {
      if (zNode.children) {
        zNode.children.sort((a, b) => {
          const aX = parseInt(a.key.split("_")[3]);
          const bX = parseInt(b.key.split("_")[3]);
          return aX - bX;
        });

        zNode.children.forEach((xNode) => {
          if (xNode.children) {
            xNode.children.sort((a, b) => {
              const aY = parseInt(a.key.split("_")[5]);
              const bY = parseInt(b.key.split("_")[5]);
              return aY - bY;
            });
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: treeData,
      count: tiles.length,
      message: "获取瓦片树形结构成功",
    });
  } catch (error) {
    console.error("获取瓦片树形结构失败:", error);

    return NextResponse.json(
      {
        error: "获取瓦片树形结构失败",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
