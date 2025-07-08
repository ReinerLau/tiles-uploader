import { NextResponse } from "next/server";
import prisma from "@/app/utils/prisma";
import { buildTreeFromTiles, type TileData } from "@/app/utils/treeUtils";

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

    // 将数据库记录转换为 TileData 格式
    const tileData: TileData[] = tiles.map((tile) => ({
      id: tile.id,
      fileName: tile.fileName,
      z: tile.z,
      x: tile.x,
      y: tile.y,
    }));

    // 使用工具函数构建树形结构
    const treeData = buildTreeFromTiles(tileData);

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
