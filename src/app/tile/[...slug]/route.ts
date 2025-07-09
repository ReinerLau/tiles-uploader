import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/utils/prisma";
import { uploadFileStream, deleteFile } from "@/app/utils/minio";

/**
 * GET /tile/{z}/{x}/{y}
 * 获取瓦片记录列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const { slug } = await params;

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
 * 上传瓦片文件并创建记录
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const { slug } = await params;

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

    // 获取请求体中的文件流
    const fileBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    // 上传文件到 MinIO
    const uploadResult = await uploadFileStream(buffer, {
      fileName: fileName,
      contentType: "image/jpeg",
    });

    if (!uploadResult.success) {
      return NextResponse.json(
        {
          error: "文件上传失败",
          details: uploadResult.error,
        },
        { status: 500 }
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
        message: "瓦片文件上传并记录创建成功",
        uploadInfo: {
          etag: uploadResult.etag,
          versionId: uploadResult.versionId,
        },
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
 * 支持文件夹删除：
 * - DELETE /tile/{z} - 删除整个 z 层级文件夹下的所有瓦片
 * - DELETE /tile/{z}/{x} - 删除 z/x 文件夹下的所有瓦片
 * - DELETE /tile/{z}/{x}/{y} - 删除单个瓦片
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

    // 验证路径参数 - 至少需要 z 参数
    if (!z) {
      return NextResponse.json(
        { error: "路径参数 z 是必需的" },
        { status: 400 }
      );
    }

    // 验证参数是否为有效数字格式
    if (!/^\d+$/.test(z)) {
      return NextResponse.json(
        { error: "z 参数必须是有效的数字" },
        { status: 400 }
      );
    }

    if (x && !/^\d+$/.test(x)) {
      return NextResponse.json(
        { error: "x 参数必须是有效的数字" },
        { status: 400 }
      );
    }

    if (y && !/^\d+$/.test(y)) {
      return NextResponse.json(
        { error: "y 参数必须是有效的数字" },
        { status: 400 }
      );
    }

    // 构建查询条件
    const where: {
      z: string;
      x?: string;
      y?: string;
    } = { z };

    if (x) where.x = x;
    if (y) where.y = y;

    // 检查要删除的瓦片记录是否存在
    const existingTiles = await prisma.tile.findMany({
      where,
    });

    if (existingTiles.length === 0) {
      const pathStr = y ? `${z}/${x}/${y}` : x ? `${z}/${x}` : z;
      return NextResponse.json(
        {
          error: "瓦片记录不存在",
          details: `路径 "${pathStr}" 下没有找到瓦片记录`,
        },
        { status: 404 }
      );
    }

    // 删除 MinIO 中的文件
    const deleteErrors: string[] = [];
    for (const tile of existingTiles) {
      const deleteResult = await deleteFile(tile.fileName);
      if (!deleteResult.success) {
        deleteErrors.push(
          `删除文件 ${tile.fileName} 失败: ${deleteResult.error}`
        );
      }
    }

    // 如果有文件删除失败，记录错误但继续删除数据库记录
    if (deleteErrors.length > 0) {
      console.warn("部分文件删除失败:", deleteErrors);
    }

    // 删除瓦片记录
    const deleteResult = await prisma.tile.deleteMany({
      where,
    });

    // 构建返回信息
    const pathStr = y ? `${z}/${x}/${y}` : x ? `${z}/${x}` : z;
    const deletionType = y ? "瓦片" : "文件夹";

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: deleteResult.count,
        deletedTiles: existingTiles,
        path: pathStr,
        type: deletionType,
        fileDeleteErrors: deleteErrors.length > 0 ? deleteErrors : undefined,
      },
      message: `${deletionType}删除成功，共删除 ${
        deleteResult.count
      } 个瓦片记录${
        deleteErrors.length > 0
          ? `，但有 ${deleteErrors.length} 个文件删除失败`
          : "，所有相关文件已删除"
      }`,
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
