import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/utils/prisma";

/**
 * GET /tile/{z}/{x}/{y}
 * 获取瓦片记录列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const { slug } = params;

    // 解析路径参数
    const z = slug[0];
    const x = slug[1];
    const y = slug[2];

    // 构建查询条件
    const where: {
      z?: string;
      x?: string;
      y?: string;
    } = {};

    if (z) where.z = z;
    if (x) where.x = x;
    if (y) where.y = y;

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
 * POST /tile/{z}/{x}/{y}
 * 创建瓦片文件信息记录
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const { slug } = params;

    // 从路径中提取 z、x、y 参数
    const z = slug[0];
    const x = slug[1];
    const y = slug[2];

    // 验证路径参数
    if (!z || !x || !y) {
      return NextResponse.json(
        { error: "路径参数 z、x、y 都是必需的" },
        { status: 400 }
      );
    }

    // 可以解析请求体，但不需要验证任何字段
    // 所有必需的参数都从路径中获取

    // 验证参数是否为有效数字格式
    if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
      return NextResponse.json(
        { error: "z、x、y 参数必须是有效的数字" },
        { status: 400 }
      );
    }

    // 在后端组装 fileName 参数：z-x-y
    const fileName = `${z}-${x}-${y}`;

    // 检查是否已存在相同的 fileName
    const existingTile = await prisma.tile.findFirst({
      where: {
        fileName: fileName,
      },
    });

    if (existingTile) {
      return NextResponse.json(
        {
          error: "瓦片记录已存在",
          details: `fileName "${fileName}" 已存在，无法重复创建`,
        },
        { status: 409 }
      );
    }

    // 创建瓦片记录
    const tile = await prisma.tile.create({
      data: {
        fileName: fileName,
        z: z,
        x: x,
        y: y,
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

/**
 * DELETE /tile/{z}/{x}/{y}
 * 删除瓦片记录
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const { slug } = params;

    // 从路径中提取 z、x、y 参数
    const z = slug[0];
    const x = slug[1];
    const y = slug[2];

    // 验证路径参数
    if (!z || !x || !y) {
      return NextResponse.json(
        { error: "路径参数 z、x、y 都是必需的" },
        { status: 400 }
      );
    }

    // 验证参数是否为有效数字格式
    if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
      return NextResponse.json(
        { error: "z、x、y 参数必须是有效的数字" },
        { status: 400 }
      );
    }

    // 在后端组装 fileName 参数：z-x-y
    const fileName = `${z}-${x}-${y}`;

    // 检查瓦片记录是否存在
    const existingTile = await prisma.tile.findFirst({
      where: {
        fileName: fileName,
      },
    });

    if (!existingTile) {
      return NextResponse.json(
        {
          error: "瓦片记录不存在",
          details: `fileName "${fileName}" 不存在，无法删除`,
        },
        { status: 404 }
      );
    }

    // 删除瓦片记录
    const deletedTile = await prisma.tile.delete({
      where: {
        id: existingTile.id,
      },
    });

    // 返回删除的记录信息
    return NextResponse.json({
      success: true,
      data: deletedTile,
      message: "瓦片记录删除成功",
    });
  } catch (error) {
    console.error("删除瓦片记录失败:", error);

    // 处理 Prisma 错误
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "删除瓦片记录失败",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
