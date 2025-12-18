"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DisplayIcon } from "../homepage/editable-cards/AmenitiesSelector"
import { RowHouseProps } from "@/app/(forms)/rowHouse-form/types"
import { getSingleRowHouse } from "@/functions/rowHouse/crud"

const RowHouse: React.FC<{ sectionId: string }> = ({ sectionId }) => {
    const [sectionData, setSectionData] = useState<RowHouseProps | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchSectionData = async () => {
        setIsLoading(true);
        const res = await getSingleRowHouse(sectionId);
        setSectionData(res.data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchSectionData();
    }, [sectionId]);

    if (isLoading || !sectionData) {
        return <p className="text-gray-500">Loading...</p>;
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold">{sectionData?.name}</h1>
                <p className="text-xl text-muted-foreground mt-2">{sectionData?.description}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Row House Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="grid grid-cols-2 gap-4">
                            <div>
                                <dt className="font-medium">Total Area</dt>
                                <dd>{sectionData?.area} sq ft</dd>
                            </div>
                            <div>
                                <dt className="font-medium">Total Houses</dt>
                                <dd>{sectionData?.totalHouse}</dd>
                            </div>
                            <div>
                                <dt className="font-medium">Booked Houses</dt>
                                <dd>{sectionData?.bookedHouse}</dd>
                            </div>
                        </dl>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Amenities</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {sectionData?.amenities?.map((item, index) => (
                                <div key={index} className="bg-gray-100 px-3 py-2 rounded-lg flex items-center gap-2 text-gray-700">
                                    <DisplayIcon iconName={item.icon} size={20} color="black" /> {item.name}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Row House Images</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {sectionData?.images?.map((image, index) => (
                            <Image
                                key={index}
                                src={image || "/placeholder.svg"}
                                alt={`Row House image ${index + 1}`}
                                width={300}
                                height={200}
                                className="rounded-lg object-cover"
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Availability</CardTitle>
                </CardHeader>
                <CardContent>
                    <div>
                        {sectionData?.totalHouse > 0 ? (
                            <Progress value={(sectionData.bookedHouse / sectionData.totalHouse) * 100} className="mt-2" />
                        ) : (
                            <p className="text-gray-500">No data available</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default RowHouse;
