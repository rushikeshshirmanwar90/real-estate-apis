import { Projects } from "@/lib/models/Project";
import { MiniSection } from "@/lib/models/Xsite/mini-section";
import { OtherSection } from "@/lib/models/OtherSection";
import { Building } from "@/lib/models/Building";
import connect from "@/lib/db";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";

interface BodyType {
  updateType: 'minisection' | 'project' | 'project-section';
  id: string;
  projectId?: string; // Optional: needed for project-section updates
  isCompleted?: boolean; // Optional: if not provided, will toggle current state
}

export const PATCH = async (req: NextRequest) => {
  try {
    await connect();
    const body = await req.json();
    const { updateType, id, projectId, isCompleted }: BodyType = body;

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid ID format", 400);
    }

    let updatedDocument;

    switch (updateType) {
      case 'project-section':
        // Update isCompleted for a specific section within a project
        if (!projectId || !isValidObjectId(projectId)) {
          return errorResponse("Valid project ID is required for project-section update", 400);
        }

        console.log('🔍 API PATCH: Updating project-section completion...');
        console.log('🔍 API PATCH: Project ID:', projectId);
        console.log('🔍 API PATCH: Section ID:', id);

        // First, find the project and check if the section exists
        const project = await Projects.findById(projectId);
        if (!project) {
          console.log('❌ API PATCH: Project not found');
          return errorResponse("Project not found", 404);
        }

        console.log('🔍 API PATCH: Project found, checking sections...');
        console.log('🔍 API PATCH: Project has', project.section?.length || 0, 'sections');

        // Find the section in the project
        const sectionIndex = project.section?.findIndex((s: any) => 
          s._id?.toString() === id || s.sectionId === id
        );

        if (sectionIndex === -1 || sectionIndex === undefined) {
          console.log('❌ API PATCH: Section not found in project');
          console.log('🔍 API PATCH: Looking for section ID:', id);
          console.log('🔍 API PATCH: Available sections:', project.section?.map((s: any) => ({
            _id: s._id?.toString(),
            sectionId: s.sectionId,
            name: s.name
          })));
          return errorResponse("Section not found in project", 404);
        }

        console.log('🔍 API PATCH: Section found at index:', sectionIndex);
        const currentSection = project.section[sectionIndex];
        console.log('🔍 API PATCH: Current section:', {
          _id: currentSection._id?.toString(),
          sectionId: currentSection.sectionId,
          name: currentSection.name,
          isCompleted: currentSection.isCompleted
        });

        // Get current state if isCompleted is not provided
        let newCompletionState = isCompleted;
        if (typeof isCompleted === 'undefined') {
          newCompletionState = !(currentSection.isCompleted || false);
          console.log('🔍 API PATCH: Toggling from', currentSection.isCompleted, 'to', newCompletionState);
        }

        // Update the specific section using array index
        const updateQuery: { [key: string]: any } = {};
        updateQuery[`section.${sectionIndex}.isCompleted`] = newCompletionState;

        console.log('🔍 API PATCH: Update query:', updateQuery);

        updatedDocument = await Projects.findByIdAndUpdate(
          projectId,
          { $set: updateQuery },
          { new: true }
        );

        console.log('🔍 API PATCH: Update result:', updatedDocument ? 'Success' : 'Failed');

        if (!updatedDocument) {
          return errorResponse("Failed to update section completion", 500);
        }

        return successResponse(
          { isCompleted: newCompletionState },
          `Section ${newCompletionState ? 'completed' : 'reopened'} successfully`
        );

      case 'project':
        // Get current state if isCompleted is not provided
        let projectCompletionState = isCompleted;
        if (typeof isCompleted === 'undefined') {
          // Try to find in Projects first, then Building, then OtherSection
          let currentProject = await Projects.findById(id);
          if (!currentProject) {
            currentProject = await Building.findById(id);
          }
          if (!currentProject) {
            currentProject = await OtherSection.findById(id);
          }
          projectCompletionState = !(currentProject?.isCompleted || false);
        }

        // Try to update in Projects first, then Building, then OtherSection
        updatedDocument = await Projects.findByIdAndUpdate(
          id,
          { isCompleted: projectCompletionState },
          { new: true }
        );

        // If not found in Projects, try Building
        if (!updatedDocument) {
          updatedDocument = await Building.findByIdAndUpdate(
            id,
            { isCompleted: projectCompletionState },
            { new: true }
          );
        }

        // If not found in Building, try OtherSection
        if (!updatedDocument) {
          updatedDocument = await OtherSection.findByIdAndUpdate(
            id,
            { isCompleted: projectCompletionState },
            { new: true }
          );
        }

        if (!updatedDocument) {
          return errorResponse("Project not found", 404);
        }

        return successResponse(
          { isCompleted: projectCompletionState },
          `Project ${projectCompletionState ? 'completed' : 'reopened'} successfully`
        );

      case 'minisection':
        // Get current state if isCompleted is not provided
        let miniSectionCompletionState = isCompleted;
        if (typeof isCompleted === 'undefined') {
          console.log('🔍 API PATCH: Getting current state for mini-section:', id);
          
          // Try to find in MiniSection first, then OtherSection
          let currentSection = await MiniSection.findById(id);
          console.log('🔍 API PATCH: MiniSection current state:', currentSection?.isCompleted);
          
          if (!currentSection) {
            console.log('🔍 API PATCH: Not found in MiniSection, trying OtherSection...');
            currentSection = await OtherSection.findById(id);
            console.log('🔍 API PATCH: OtherSection current state:', currentSection?.isCompleted);
          }
          
          miniSectionCompletionState = !(currentSection?.isCompleted || false);
          console.log('🔍 API PATCH: Toggling from', currentSection?.isCompleted, 'to', miniSectionCompletionState);
        }

        console.log('🔍 API PATCH: Updating mini-section with isCompleted:', miniSectionCompletionState);

        // Try to update in MiniSection first, then OtherSection
        updatedDocument = await MiniSection.findByIdAndUpdate(
          id,
          { isCompleted: miniSectionCompletionState },
          { new: true }
        );
        
        console.log('🔍 API PATCH: MiniSection update result:', updatedDocument);

        // If not found in MiniSection, try OtherSection
        if (!updatedDocument) {
          console.log('🔍 API PATCH: Not found in MiniSection, trying OtherSection...');
          updatedDocument = await OtherSection.findByIdAndUpdate(
            id,
            { isCompleted: miniSectionCompletionState },
            { new: true }
          );
          console.log('🔍 API PATCH: OtherSection update result:', updatedDocument);
        }

        if (!updatedDocument) {
          return errorResponse("Mini section not found", 404);
        }

        return successResponse(
          { isCompleted: miniSectionCompletionState },
          `Mini section ${miniSectionCompletionState ? 'completed' : 'reopened'} successfully`
        );

      default:
        return errorResponse("Invalid update type", 400);
    }

  } catch (error: any) {
    console.error('❌ API PATCH: Error updating completion status:', error);
    console.error('❌ API PATCH: Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      codeName: error?.codeName
    });
    
    // Provide more specific error messages
    if (error?.code === 2) {
      return errorResponse("Database query error: The section could not be found or updated. Please check if the section exists in the project.", 400);
    } else if (error?.name === 'MongoServerError') {
      return errorResponse(`Database error: ${error.message}`, 500);
    } else {
      return errorResponse("Failed to update completion status", 500);
    }
  }
};
 
export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const updateType = searchParams.get("updateType");
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");

    if (!id || !updateType) {
      return errorResponse("Missing required parameters: id, updateType", 400);
    }

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid ID format", 400);
    }

    let document;

    switch (updateType) {
      case 'project-section':
        if (!projectId || !isValidObjectId(projectId)) {
          return errorResponse("Valid project ID is required for project-section query", 400);
        }

        console.log('🔍 API GET: Fetching project-section completion...');
        console.log('🔍 API GET: Project ID:', projectId);
        console.log('🔍 API GET: Section ID:', id);

        const projectForGet = await Projects.findById(projectId);
        if (!projectForGet) {
          console.log('❌ API GET: Project not found');
          return errorResponse("Project not found", 404);
        }

        console.log('🔍 API GET: Project found, checking sections...');
        console.log('🔍 API GET: Project has', projectForGet.section?.length || 0, 'sections');

        const sectionForGet = projectForGet.section?.find((s: any) => 
          s._id?.toString() === id || s.sectionId === id
        );

        if (!sectionForGet) {
          console.log('❌ API GET: Section not found in project');
          console.log('🔍 API GET: Looking for section ID:', id);
          console.log('🔍 API GET: Available sections:', projectForGet.section?.map((s: any) => ({
            _id: s._id?.toString(),
            sectionId: s.sectionId,
            name: s.name
          })));
          return errorResponse("Section not found in project", 404);
        }

        console.log('🔍 API GET: Section found:', {
          _id: sectionForGet._id?.toString(),
          sectionId: sectionForGet.sectionId,
          name: sectionForGet.name,
          isCompleted: sectionForGet.isCompleted
        });

        document = {
          isCompleted: sectionForGet.isCompleted || false,
          section: sectionForGet
        };
        break;

      case 'project':
        // Try to find in Projects first, then Building, then OtherSection
        document = await Projects.findById(id).select('isCompleted');
        if (!document) {
          document = await Building.findById(id).select('isCompleted');
        }
        if (!document) {
          document = await OtherSection.findById(id).select('isCompleted');
        }
        break;

      case 'minisection':
        // Try to find in MiniSection first, then OtherSection
        console.log('🔍 API: Looking for mini-section with ID:', id);
        
        document = await MiniSection.findById(id).select('isCompleted name');
        console.log('🔍 API: MiniSection query result:', document);
        
        if (!document) {
          console.log('🔍 API: Not found in MiniSection, trying OtherSection...');
          document = await OtherSection.findById(id).select('isCompleted name');
          console.log('🔍 API: OtherSection query result:', document);
        }
        
        if (document) {
          console.log('🔍 API: Found document:', {
            id: document._id,
            name: document.name,
            isCompleted: document.isCompleted,
            isCompletedType: typeof document.isCompleted
          });
        }
        break;

      default:
        return errorResponse("Invalid update type", 400);
    }

    if (!document) {
      return errorResponse(`${updateType} not found`, 404);
    }

    return successResponse(document, `${updateType} completion status retrieved successfully`);

  } catch (error: any) {
    console.error('❌ API GET: Error fetching completion status:', error);
    console.error('❌ API GET: Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      codeName: error?.codeName
    });
    
    return errorResponse("Failed to fetch completion status", 500);
  }
};