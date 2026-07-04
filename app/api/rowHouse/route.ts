import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { RowHouse } from "@/lib/models/RowHouse";
import { NextRequest, NextResponse } from "next/server";
import { checkValidClient } from "@/lib/auth";
import { 
  safeRedisGetCache, 
  safeRedisSetCache, 
  safeRedisDelCache,
  safeRedisKeysCache 
} from "@/lib/utils/redis-helpers";

export const GET = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  
  try {
    await connect();
    let data;

    if (id) {
      // Check cache for single rowHouse
      const cachedData = await safeRedisGetCache(`rowHouse:${id}`);
      if (cachedData) {
        const cacheValue = JSON.parse(cachedData);
        return NextResponse.json({ data: cacheValue }, { status: 200 });
      }

      data = await RowHouse.findById(id);

      // Cache the rowHouse with 24-hour expiration
      if (data) {
        await safeRedisSetCache(`rowHouse:${id}`, JSON.stringify(data), 'EX', 86400);
      }
    } else {
      // Check cache for all rowHouses
      const cachedData = await safeRedisGetCache(`rowHouse:all`);
      if (cachedData) {
        const cacheValue = JSON.parse(cachedData);
        return NextResponse.json({ data: cacheValue }, { status: 200 });
      }

      data = await RowHouse.find();

      // Cache all rowHouses with 24-hour expiration
      await safeRedisSetCache(`rowHouse:all`, JSON.stringify(data), 'EX', 86400);
    }

    if (!data) {
      return NextResponse.json(
        { message: "can't able to find RowHouse" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.log("something went wrong : ", error);
    return NextResponse.json(
      { message: "Something wen't wrong !", error: error },
      { status: 500 }
    );
  }
};

export const POST = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connect();
    const data = await req.json();

    const newData = await new RowHouse(data);
    const savedData = await newData.save();

    if (!newData) {
      return NextResponse.json(
        { message: "can't able to add new RowHouse" },
        { status: 404 }
      );
    }

    const updatedProject = await Projects.findByIdAndUpdate(
      savedData.projectId,
      {
        $push: {
          section: {
            sectionId: savedData._id,
            name: savedData.name,
            type: "rowhouse",
          },
        },
      },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 }
      );
    }

    // Invalidate cache
    await safeRedisDelCache(`rowHouse:all`);
    const projectKeys = await safeRedisKeysCache(`project:*`);
    if (projectKeys.length > 0) {
      await safeRedisDelCache(...projectKeys);
    }

    return NextResponse.json({ newData }, { status: 200 });
  } catch (error) {
    console.log("something went wrong : ", error);
    return NextResponse.json(
      { message: "Something wen't wrong !", error: error },
      { status: 500 }
    );
  }
};

export const DELETE = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const sectionId = searchParams.get("sectionId");

  console.log('🗑️ DELETE /api/rowHouse - Request received');
  console.log('   Project ID:', projectId);
  console.log('   Section ID:', sectionId);

  try {
    await connect();

    if (!projectId || !sectionId) {
      console.error('❌ Missing required parameters');
      return NextResponse.json(
        { error: "Project ID and Section ID are required" },
        { status: 400 }
      );
    }

    console.log('🔄 Removing section from project...');
    const updatedProject = await Projects.findByIdAndUpdate(
      projectId,
      { $pull: { section: { sectionId: sectionId } } },
      { new: true }
    );

    if (!updatedProject) {
      console.error('❌ Project not found:', projectId);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    console.log('✅ Section removed from project');
    console.log('🔄 Deleting rowhouse record...');

    const deletedRowHouse = await RowHouse.findByIdAndDelete(sectionId);
    
    if (!deletedRowHouse) {
      console.warn('⚠️ RowHouse record not found, but section was removed from project');
      // Don't fail - the section removal is what matters
      console.log('✅ Section deleted successfully (rowhouse record did not exist)');
      
      // Invalidate cache
      await safeRedisDelCache(`rowHouse:${sectionId}`);
      await safeRedisDelCache(`rowHouse:all`);
      const projectKeys = await safeRedisKeysCache(`project:*`);
      if (projectKeys.length > 0) {
        await safeRedisDelCache(...projectKeys);
      }
      
      return NextResponse.json(
        { 
          message: "Section deleted successfully (rowhouse record did not exist)",
          _id: sectionId,
          projectId 
        },
        { status: 200 }
      );
    }

    console.log('✅ RowHouse record deleted');

    // Invalidate cache
    await safeRedisDelCache(`rowHouse:${sectionId}`);
    await safeRedisDelCache(`rowHouse:all`);
    const projectKeys = await safeRedisKeysCache(`project:*`);
    if (projectKeys.length > 0) {
      await safeRedisDelCache(...projectKeys);
    }

    return NextResponse.json(
      { deletedRowHouse },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error in delete operation:', error);
    return NextResponse.json(
      { message: "Something wen't wrong !", error: error },
      { status: 500 }
    );
  }
};

export const PUT = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const sectionId = searchParams.get("sectionId");
  const newData = await req.json();

  console.log('🔄 PUT /api/rowHouse - Request received');
  console.log('   Project ID:', projectId);
  console.log('   Section ID:', sectionId);
  console.log('   Update data:', newData);

  try {
    await connect();

    if (!sectionId) {
      return NextResponse.json(
        { message: "Section ID is required" },
        { status: 400 }
      );
    }

    console.log('🔄 Updating rowhouse...');
    const updatedRowHouse = await RowHouse.findByIdAndUpdate(
      sectionId,
      { $set: newData },
      { new: true, runValidators: true }
    );

    if (!updatedRowHouse) {
      console.error('❌ RowHouse not found:', sectionId);
      return NextResponse.json(
        { message: "can't able to update the row house" },
        { status: 404 }
      );
    }

    console.log('✅ RowHouse updated successfully');

    // Also update the section name in the project if name was changed
    if (newData.name && projectId) {
      console.log('🔄 Updating section name in project...');
      await Projects.updateOne(
        { _id: projectId, "section.sectionId": sectionId },
        { $set: { "section.$.name": newData.name } }
      );
      console.log('✅ Section name updated in project');
    }

    // Invalidate cache
    await safeRedisDelCache(`rowHouse:${sectionId}`);
    await safeRedisDelCache(`rowHouse:all`);
    if (projectId) {
      const projectKeys = await safeRedisKeysCache(`project:*`);
      if (projectKeys.length > 0) {
        await safeRedisDelCache(...projectKeys);
      }
    }

    return NextResponse.json(
      { newHouse: updatedRowHouse },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error updating rowhouse:', error);
    return NextResponse.json(
      { message: "Something wen't wrong !", error: error },
      { status: 500 }
    );
  }
};
