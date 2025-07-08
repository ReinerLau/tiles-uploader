import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/utils/prisma";

/**
 * 创建瓦片记录的请求体接口
 */
interface CreateTileRequest {
  fileName: string;
  z: number;
  x: number;
  y: number;
}

/**
 * GET /tile
 * 获取瓦片记录列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const z = searchParams.get("z");
    const x = searchParams.get("x");
    const y = searchParams.get("y");
    const fileName = searchParams.get("fileName");

    // 构建查询条件
    const where: {
      z?: number;
      x?: number;
      y?: number;
      fileName?: { contains: string };
    } = {};

    if (z !== null) where.z = parseInt(z);
    if (x !== null) where.x = parseInt(x);
    if (y !== null) where.y = parseInt(y);
    if (fileName) where.fileName = { contains: fileName };

    // 查询瓦片记录
    const tiles = await prisma.tile.findMany({
      where,
      orderBy: [{ z: "asc" }, { x: "asc" }, { y: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: tiles,
      count: tiles.length,
      message: "获取瓦片记录成功",
    });
  } catch (error) {
    console.error("获取瓦片记录失败:", error);

    return NextResponse.json(
      {
        error: "获取瓦片记录失败",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /tile
 * 创建瓦片文件信息记录
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: CreateTileRequest = await request.json();

    // 验证必需字段
    if (!body.fileName || typeof body.fileName !== "string") {
      return NextResponse.json(
        { error: "文件名是必需的，且必须是字符串" },
        { status: 400 }
      );
    }

    if (
      typeof body.z !== "number" ||
      typeof body.x !== "number" ||
      typeof body.y !== "number"
    ) {
      return NextResponse.json(
        { error: "z、x、y 坐标必须是数字" },
        { status: 400 }
      );
    }

    // 创建瓦片记录
    const tile = await prisma.tile.create({
      data: {
        fileName: body.fileName,
        z: body.z,
        x: body.x,
        y: body.y,
      },
    });

    // 返回创建的记录
    return NextResponse.json(
      {
        success: true,
        data: tile,
        message: "瓦片记录创建成功",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("创建瓦片记录失败:", error);

    // 处理 Prisma 错误
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "创建瓦片记录失败",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
