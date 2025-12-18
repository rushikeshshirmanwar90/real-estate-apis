"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { RoomsEditableCard } from "@/components/homepage/editable-cards/roomEditCard"
import TopHeader from "@/components/TopHeader"
import axios from "axios"
import domain from "@/components/utils/domain"
import { successToast } from "@/components/toasts"
import { FlatInfo, Room } from "./type"
import { findRoomInfo } from "@/functions/rooms"

const RoomForm = () => {
    const searchParams = useSearchParams()
    const projectId = searchParams.get("projectId") || "";
    const buildingId = searchParams.get("buildingId") || "";
    const flatId = searchParams.get("flatId") || "";
    const router = useRouter();

    const [flatInfo, setFlatInfo] = useState<FlatInfo>({
        projectId: projectId,
        buildingId: buildingId,
        flatId: flatId,
        rooms: [],
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isUpdating, setIsUpdating] = useState(false)

    // Fetch existing room data when component mounts
    useEffect(() => {
        const fetchRoomData = async () => {
            try {
                setIsLoading(true)
                const res = await findRoomInfo(flatId)
                if (res) {
                    setFlatInfo({
                        projectId: res.projectId || projectId,
                        buildingId: res.buildingId || buildingId,
                        flatId: res.flatId || flatId,
                        rooms: res.rooms || [],
                    })
                    setIsUpdating(true)
                }
            } catch (error) {
                console.error("Error fetching room data:", error)
            } finally {
                setIsLoading(false)
            }
        }

        if (flatId) {
            fetchRoomData()
        } else {
            setIsLoading(false)
        }
    }, [flatId, projectId, buildingId])

    const handleRoomsChange = (rooms: Room[]) => {
        setFlatInfo((prev) => ({
            ...prev,
            rooms,
        }))
    }

    const isFormValid = () => {
        const hasRequiredIds =
            flatInfo.projectId.trim() !== "" &&
            flatInfo.buildingId.trim() !== "" &&
            flatInfo.flatId.trim() !== "";

        const hasRooms = flatInfo.rooms.length > 0;

        const hasValidRooms = flatInfo.rooms.length === 0 || flatInfo.rooms.every(room =>
            room.title.trim() !== "" &&
            room.type.trim() !== "" &&
            room.images.length > 0
        );

        return hasRequiredIds && hasRooms && hasValidRooms;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFormValid()) {
            console.log("Form is invalid")
            return;
        }

        try {
            let res;
            if (isUpdating) {
                res = await axios.put(`${domain}/api/room-info?flatId=${flatId}`, flatInfo);
            } else {
                res = await axios.post(`${domain}/api/room-info`, flatInfo);
            }

            const data = res.data;

            if (data) {
                successToast(`Flat Rooms are ${isUpdating ? 'updated' : 'added'} successfully`);
                router.push("/projects");
            }
        } catch (error: unknown) {
            console.log(`Something went wrong, can't ${isUpdating ? 'update' : 'add'} the rooms`);
            console.error(error)
        }
    }

    if (isLoading) {
        return <div>Loading...</div>
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <form onSubmit={handleSubmit}>
                <TopHeader
                    buttonText={isUpdating ? "Update Room Details" : "Add Room Details"}
                    tagTitle="Project"
                    title={`set up buildings`}
                    buttonDisable={!isFormValid()}
                />

                <div className="space-y-6">
                    <RoomsEditableCard
                        rooms={flatInfo.rooms}
                        onRoomsChange={handleRoomsChange}
                    />
                </div>
            </form>
        </div>
    )
}

export default RoomForm;