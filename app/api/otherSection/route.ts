import connect from "@/lib/db";
import { OtherSection } from "@/lib/models/OtherSection";
import { Projects } from "@/lib/models/Project";
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
      // Check cache for single otherSection
      const cachedData = await safeRedisGetCache(`otherSection:${id}`);
      if (cachedData) {
        const cacheValue = JSON.parse(cachedData);
        return NextResponse.json({ data: cacheValue }, { status: 200 });
      }

      data = await OtherSection.findById(id);

      // Cache the otherSection with 24-hour expiration
      if (data) {
        await safeRedisSetCache(`otherSection:${id}`, JSON.stringify(data), 'EX', 86400);
      }
    } else {
      // Check cache for all otherSections
      const cachedData = await safeRedisGetCache(`otherSection:all`);
      if (cachedData) {
        const cacheValue = JSON.parse(cachedData);
        return NextResponse.json({ data: cacheValue }, { status: 200 });
      }

      data = await OtherSection.find();

      // Cache all otherSections with 24-hour expiration
      await safeRedisSetCache(`otherSection:all`, JSON.stringify(data), 'EX', 86400);
    }

    if (!data) {
      return NextResponse.json(
        { message: "can't able to find OtherSection" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: unknown) {
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

    const newSection = new OtherSection(data);
    const savedData = await newSection.save();

    if (!savedData) {
      return NextResponse.json(
        { message: "can't able to add new OtherSection" },
        { status: 500 }
      );
    }

    // Push a string version of the sectionId to ensure consistent matching later
    const updatedProject = await Projects.findByIdAndUpdate(
      String(savedData.projectId),
      {
        $push: {
          section: {
            sectionId: String(savedData._id),
            name: savedData.name,
            type: "other",
          },
        },
      },
      { new: true }
    );

    // If project update fails, remove the created section to avoid orphaned documents
    if (!updatedProject) {
      await OtherSection.findByIdAndDelete(savedData._id);
      return NextResponse.json(
        { message: `Project not found :  ${savedData.name}` },
        { status: 404 }
      );
    }

    // Invalidate cache
    await safeRedisDelCache(`otherSection:all`);
    const projectKeys = await safeRedisKeysCache(`project:*`);
    if (projectKeys.length > 0) {
      await safeRedisDelCache(...projectKeys);
    }

    return NextResponse.json(
      { section: savedData, project: updatedProject },
      { status: 201 }
    );
  } catch (error: unknown) {
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

  console.log('🗑️ DELETE /api/otherSection - Request received');
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
    // Load project and remove matching sections by string comparison to be robust
    const project = await Projects.findById(projectId);
    if (!project) {
      console.error('❌ Project not found:', projectId);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    const originalLen = Array.isArray(project.section) ? project.section.length : 0;

    // Remove entries where either the stored sectionId matches OR the embedded subdoc _id matches
    project.section = (project.section || []).filter(
      (s: { sectionId?: unknown; _id?: unknown }) =>
        String(s.sectionId) !== String(sectionId) &&
        String(s._id) !== String(sectionId)
    );

    // If nothing was removed, try a looser comparison just in case
    if (project.section.length === originalLen) {
      project.section = (project.section || []).filter(
        (s: { sectionId?: unknown; _id?: unknown }) =>
          !(
            String(s.sectionId).includes(String(sectionId)) ||
            String(s._id).includes(String(sectionId))
          )
      );
    }

    await project.save();
    console.log('✅ Section removed from project');

    console.log('🔄 Deleting otherSection record...');
    // Load OtherSection and ensure it belongs to the same project (compare stringified ids)
    const other = await OtherSection.findById(sectionId);

    if (!other) {
      console.warn('⚠️ OtherSection record not found, but section was removed from project');
      // OtherSection document already missing, but project ref removed — return success
      
      // Invalidate cache
      await safeRedisDelCache(`otherSection:${sectionId}`);
      await safeRedisDelCache(`otherSection:all`);
      const projectKeys = await safeRedisKeysCache(`project:*`);
      if (projectKeys.length > 0) {
        await safeRedisDelCache(...projectKeys);
      }
      
      return NextResponse.json(
        {
          message: "OtherSection document not found; project reference removed",
          deletedOtherSection: { _id: sectionId },
          project,
        },
        { status: 200 }
      );
    }

    if (String(other.projectId) !== String(projectId)) {
      // The section exists but isn't linked to the provided projectId — don't delete
      console.error('❌ OtherSection does not belong to the specified project');
      return NextResponse.json(
        {
          message: "OtherSection does not belong to the specified project",
          otherProjectId: other.projectId,
        },
        { status: 403 }
      );
    }

    // Safe delete: it belongs to the project so delete by id
    const deleted = await OtherSection.findByIdAndDelete(sectionId);

    if (!deleted) {
      console.error('❌ Failed to delete OtherSection');
      return NextResponse.json(
        { message: "Failed to delete OtherSection" },
        { status: 500 }
      );
    }

    console.log('✅ OtherSection record deleted');

    // Invalidate cache
    await safeRedisDelCache(`otherSection:${sectionId}`);
    await safeRedisDelCache(`otherSection:all`);
    const projectKeys = await safeRedisKeysCache(`project:*`);
    if (projectKeys.length > 0) {
      await safeRedisDelCache(...projectKeys);
    }

    return NextResponse.json(
      { deletedOtherSection: deleted, project },
      { status: 200 }
    );
  } catch (error: unknown) {
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

  console.log('🔄 PUT /api/otherSection - Request received');
  console.log('   Project ID:', projectId);
  console.log('   Section ID:', sectionId);
  console.log('   Update data:', newData);

  try {
    await connect();

    if (!sectionId) {
      return NextResponse.json(
        { message: "section id is required" },
        { status: 400 }
      );
    }

    console.log('🔄 Updating otherSection...');
    const updatedSection = await OtherSection.findByIdAndUpdate(
      sectionId,
      { $set: newData },
      { new: true, runValidators: true }
    );

    if (!updatedSection) {
      console.error('❌ OtherSection not found:', sectionId);
      return NextResponse.json(
        { message: "can't able to update the other section" },
        { status: 404 }
      );
    }

    console.log('✅ OtherSection updated successfully');

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
    await safeRedisDelCache(`otherSection:${sectionId}`);
    await safeRedisDelCache(`otherSection:all`);
    if (projectId) {
      const projectKeys = await safeRedisKeysCache(`project:*`);
      if (projectKeys.length > 0) {
        await safeRedisDelCache(...projectKeys);
      }
    }

    return NextResponse.json(
      { newHouse: updatedSection },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('❌ Error updating otherSection:', error);
    return NextResponse.json(
      { message: "Something wen't wrong !", error: error },
      { status: 500 }
    );
  }
};

export const PATCH = async (req: NextRequest) => {
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
    const body = await req.json();
    const { id, isCompleted, clientId, staffId } = body;

    // Validation
    if (!id || typeof isCompleted !== 'boolean') {
      return NextResponse.json(
        { message: "Missing required fields: id, isCompleted" },
        { status: 400 }
      );
    }

    const updatedOtherSection = await OtherSection.findByIdAndUpdate(
      id,
      { isCompleted },
      { new: true }
    );

    if (!updatedOtherSection) {
      return NextResponse.json(
        { message: "Other section not found" },
        { status: 404 }
      );
    }

    // Also update the section in the project
    await Projects.updateOne(
      { "section.sectionId": id },
      { $set: { "section.$.isCompleted": isCompleted } }
    );

    // Invalidate cache
    await safeRedisDelCache(`otherSection:${id}`);
    await safeRedisDelCache(`otherSection:all`);

    return NextResponse.json(
      {
        data: updatedOtherSection,
        message: "Other section completion status updated successfully"
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating other section completion status:', error);
    return NextResponse.json(
      { message: "Failed to update other section completion status", error: error },
      { status: 500 }
    );
  }
};
