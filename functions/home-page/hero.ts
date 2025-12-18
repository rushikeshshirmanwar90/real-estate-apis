import domain from "@/components/utils/domain";
import { HeroSectionProps } from "@/types/HomePage";
import axios from "axios";

/**
 * Add a new hero section
 * @param data Hero section data
 * @returns Response data or null
 */
export const addHeroSection = async (data: HeroSectionProps | undefined) => {
  try {
    const response = await axios.post(`${domain}/api/hero-section`, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 201) {
      console.log("Hero section added successfully:", response.data);
      return response.data;
    } else {
      console.error(
        "Failed to add hero section:",
        response.status,
        response.data
      );
      return null;
    }
  } catch (error) {
    console.error("Error adding hero section:", error);
    throw error;
  }
};

/**
 * Update an existing hero section
 * @param data Hero section data
 * @returns Response data or null
 */
export const updateHeroSection = async (data: HeroSectionProps) => {
  try {
    const response = await axios.put(`${domain}/api/hero-section`, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 200) {
      console.log("Hero section updated successfully:", response.data);
      return response.data;
    } else {
      console.error(
        "Failed to update hero section:",
        response.status,
        response.data
      );
      return null;
    }
  } catch (error) {
    console.error("Error updating hero section:", error);
    throw error;
  }
};

/**
 * Get hero section by client ID
 * @param clientId Client ID
 * @returns Hero section data or null
 */
export const getHeroSection = async (clientId: string) => {
  try {
    const response = await axios.get(
      `${domain}/api/hero-section?clientId=${clientId}`
    );

    if (response.status === 200) {
      return response.data.data;
    } else {
      console.error(
        "Failed to fetch hero section:",
        response.status,
        response.data
      );
      return null;
    }
  } catch (error) {
    console.error("Error fetching hero section:", error);
    return null;
  }
};

/**
 * Delete hero section by client ID
 * @param clientId Client ID
 * @returns Success status
 */
export const deleteHeroSection = async (clientId: string) => {
  try {
    const response = await axios.delete(
      `${domain}/api/hero-section?clientId=${clientId}`
    );

    if (response.status === 200) {
      console.log("Hero section deleted successfully");
      return true;
    } else {
      console.error(
        "Failed to delete hero section:",
        response.status,
        response.data
      );
      return false;
    }
  } catch (error) {
    console.error("Error deleting hero section:", error);
    return false;
  }
};
