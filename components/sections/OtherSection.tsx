"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OtherSectionProps } from "@/app/(forms)/otherSection-form/types"
import { getSingleOtherSection } from "@/functions/otherSection/crud"

const OtherSection: React.FC<{ sectionId: string }> = ({ sectionId }) => {

    const [sectionData, setSectionData] = useState<OtherSectionProps>()

    const fetchSectionData = async () => {
        const res = await getSingleOtherSection(sectionId);
        console.log(res);
        setSectionData(res.data);
    }

    useEffect(() => {
        fetchSectionData();
    }, [sectionId])

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold">{sectionData?.name}</h1>
                <p className="text-xl text-muted-foreground mt-2">{sectionData?.description}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Section Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="grid grid-cols-2 gap-4">
                            <div>
                                <dt className="font-medium">Area</dt>
                                <dd>{sectionData?.area} sq ft</dd>
                            </div>
                        </dl>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Section Images</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {sectionData?.images?.map((image, index) => (
                            <Image
                                key={index}
                                src={image || "/placeholder.svg"}
                                alt={`Section image ${index + 1}`}
                                width={300}
                                height={200}
                                className="rounded-lg object-cover"
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default OtherSection;
