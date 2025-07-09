import { NextResponse } from "next/server";
import prisma from "@/app/utils/prisma";
import { buildTreeFromTiles, type TileData } from "@/app/utils/treeUtils";

// 定义瓦片记录类型
interface TileRecord {
  id: string;
  fileName: string;
  z: string;
  x: string;
  y: string;
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

/**
 * DELETE /tile
 * 批量删除瓦片记录
 * 支持通过坐标批量删除，支持不同层级的删除：
 * {
 *   "coordinates": [
 *     {"z": "1"},                    // 删除整个 z=1 层级
 *     {"z": "2", "x": "3"},          // 删除 z=2, x=3 层级
 *     {"z": "4", "x": "5", "y": "6"} // 删除单个瓦片 z=4, x=5, y=6
 *   ]
 * }
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    // 验证请求体格式
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "请求体格式错误，必须是有效的 JSON 对象" },
        { status: 400 }
      );
    }

    const { coordinates } = body;

    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return NextResponse.json(
        { error: "coordinates 字段必须是非空数组" },
        { status: 400 }
      );
    }

    const tilesToDelete: TileRecord[] = [];
    const deletionSummary: string[] = [];

    // 处理坐标删除
    for (const coord of coordinates) {
      // 验证必需的 z 字段
      if (!coord.z) {
        return NextResponse.json(
          { error: "坐标对象必须包含 z 字段" },
          { status: 400 }
        );
      }

      // 验证层级关系：如果有 y 必须有 x
      if (coord.y && !coord.x) {
        return NextResponse.json(
          { error: "指定 y 字段时必须同时指定 x 字段" },
          { status: 400 }
        );
      }

      // 构建查询条件
      const where: {
        z: string;
        x?: string;
        y?: string;
      } = { z: coord.z };

      if (coord.x) {
        where.x = coord.x;
      }

      if (coord.y) {
        where.y = coord.y;
      }

      // 查找要删除的瓦片
      const coordTiles = await prisma.tile.findMany({
        where,
        orderBy: [{ z: "asc" }, { x: "asc" }, { y: "asc" }],
      });

      if (coordTiles.length > 0) {
        await prisma.tile.deleteMany({
          where,
        });
        tilesToDelete.push(...coordTiles);

        // 构建删除摘要信息
        const pathStr = coord.y
          ? `${coord.z}/${coord.x}/${coord.y}`
          : coord.x
          ? `${coord.z}/${coord.x}`
          : coord.z;
        const deletionType = coord.y ? "瓦片" : coord.x ? "x层级" : "z层级";

        deletionSummary.push(
          `${deletionType} ${pathStr}: ${coordTiles.length} 个瓦片`
        );
      }
    }

    if (tilesToDelete.length === 0) {
      return NextResponse.json(
        {
          error: "没有找到要删除的瓦片记录",
          details: "请检查提供的坐标是否正确",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: tilesToDelete.length,
        deletedTiles: tilesToDelete,
        deletionSummary,
      },
      message: `批量删除成功，共删除 ${tilesToDelete.length} 个瓦片记录`,
    });
  } catch (error) {
    console.error("批量删除瓦片记录失败:", error);

    // 处理 Prisma 错误
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "批量删除瓦片记录失败",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
