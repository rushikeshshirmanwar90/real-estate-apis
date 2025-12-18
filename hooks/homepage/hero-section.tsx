"use client";
import { getHeroSection } from "@/functions/home-page/hero";
import { HeroSectionDetails } from "@/types/HomePage";
import { useEffect, useState } from "react";

export function useHeroSectionData(clientId: string | null) {
    const [heroData, setHeroData] = useState<HeroSectionDetails[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [existingData, setExistingData] = useState(false);
    const [dataError, setDataError] = useState<string | null>(null);

    useEffect(() => {
        // Skip fetching if we don't have a client ID yet
        if (!clientId) {
            setDataLoading(false);
            return;
        }

        // Fetch hero section data
        const fetchData = async () => {
            try {
                // Use the API function to get hero section data
                const response = await getHeroSection(clientId);

                if (response && response.details) {
                    setHeroData(response.details);
                    setExistingData(true);
                } else {
                    setHeroData([]);
                }

                setDataError(null);
            } catch (error) {
                console.error("Error fetching hero section data:", error);
                setDataError("Failed to load hero section data");
            } finally {
                setDataLoading(false);
            }
        };

        fetchData();
    }, [clientId]);

    return { heroData, dataLoading, existingData, dataError };
}