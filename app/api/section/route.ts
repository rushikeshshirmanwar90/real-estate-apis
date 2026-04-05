import connect from "@/lib/db";
import { Section } from "@/lib/models/Section";
import { NextRequest, NextResponse } from "next/server";
import { logActivity, extractUserInfo } from "@/lib/utils/activity-logger";
import { 
  safeRedisGetCache, 
  safeRedisSetCache, 
  invalidateCachePattern,
  safeRedisDelCache 
} from "@/lib/utils/redis-helpers";

export const GET = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    await connect();
    let data;
    if (!id) {
      let cachvalue = await safeRedisGetCache(`section`);
      if (cachvalue) {
        cachvalue = JSON.parse(cachvalue);
        return NextResponse.json(
          {
            cachvalue
          },
          { status: 200 }
        );
      }

      data = await Section.find();

      await safeRedisSetCache(`section`, JSON.stringify(data));

    }
    else {

      let cachvalue = await safeRedisGetCache(`section:${id}`);

      if (cachvalue) {
        cachvalue = JSON.parse(cachvalue);
        return NextResponse.json(
          {
            cachvalue
          },
          { status: 200 }
        );
      }

      data = await Section.findById(id);
      await safeRedisSetCache(`section:${id}`, JSON.stringify(data));
    }

    if (!data) {
      return NextResponse.json(
        {
          message: "section not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        data,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.log("something went wrong : ", error);
    return NextResponse.json(
      {
        message: "Something wen't wrong !",
        error: error,
      },
      {
        status: 500,
      }
    );
  }
};

export const POST = async (req: NextRequest | Request) => {
  try {
    const data = await req.json();

    await connect();

    // ✅ FIX: Actually save the section to database
    const newSection = new Section(data);
    await newSection.save();

    if (!newSection) {
      return NextResponse.json(
        {
          message: "can't able to add data !",
        },
        {
          status: 404,
        }
      );
    }

    // ✅ Invalidate cache after creating new section
    await safeRedisDelCache(`section`);

    // ✅ Log activity for section creation (consistent format)
    const userInfo = extractUserInfo(req, data);
    if (userInfo && data.clientId) {
      await logActivity({
        user: userInfo,
        clientId: data.clientId,
        projectId: data.projectId,
        projectName: data.projectName,
        sectionId: newSection._id.toString(),
        sectionName: newSection.sectionName || newSection.name || 'Unnamed Section',
        activityType: "section_created",
        category: "section",
        action: "create",
        description: `Created section "${newSection.sectionName || newSection.name || 'Unnamed Section'}" in project "${data.projectName || 'Unknown Project'}"`,
        message: `Section created successfully in project`,
        metadata: {
          sectionData: {
            name: newSection.sectionName || newSection.name,
            type: newSection.type,
            projectId: data.projectId
          }
        }
      });
    }

    return NextResponse.json(
      {
        newSection,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.log("something went wrong : ", error);
    return NextResponse.json(
      {
        message: "Something wen't wrong !",
        error: error,
      },
      {
        status: 500,
      }
    );
  }
};

export const DELETE = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId");

  try {
    await connect();

    const deletedSection = await Section.findByIdAndUpdate(sectionId, {
      new: true,
    });

    if (!deletedSection) {
      return NextResponse.json(
        {
          message: "invalid section id",
        },
        {
          status: 404,
        }
      );
    }

    // ✅ Invalidate cache after deleting section
    await safeRedisDelCache(`section`);
    await safeRedisDelCache(`section:${sectionId}`);

    return NextResponse.json({
      message: "section deleted Successfully !",
      deletedData: deletedSection,
    });
  } catch (error: unknown) {
    console.log("something went wrong : ", error);
    return NextResponse.json(
      {
        message: "Something wen't wrong !",
        error: error,
      },
      {
        status: 500,
      }
    );
  }
};

export const PUT = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId");
  try {
    await connect();

    const newData = await req.json();

    const updatedData = await Section.findByIdAndUpdate(sectionId, newData, {
      new: true,
    });

    if (!updatedData) {
      return NextResponse.json(
        {
          message: "can't able to update the section !",
        },
        {
          status: 404,
        }
      );
    }

    // ✅ Invalidate cache after updating section
    await safeRedisDelCache(`section`);
    await safeRedisDelCache(`section:${sectionId}`);

    return NextResponse.json(
      {
        updatedData,
      },
      {
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.log("something went wrong : ", error);
    return NextResponse.json(
      {
        message: "Something wen't wrong !",
        error: error,
      },
      {
        status: 500,
      }
    );
  }
};
