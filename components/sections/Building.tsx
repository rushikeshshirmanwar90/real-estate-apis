import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getSingleBuilding } from "@/functions/building/crud"
import { useEffect, useState } from "react"
import { BuildingFormProps } from "@/app/(forms)/building-form/types"
import { AmenityItem, DisplayIcon } from "../homepage/editable-cards/AmenitiesSelector"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const Building: React.FC<{ buildingId: string | null | undefined }> = ({ buildingId }) => {

    const [buildingData, setBuildingData] = useState<BuildingFormProps>();

    const fetchBuildingData = async () => {
        const res = await getSingleBuilding(buildingId)
        setBuildingData(res);
    }

    useEffect(() => {
        fetchBuildingData();
    }, [])

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold">{buildingData?.name}</h1>
                <p className="text-xl text-muted-foreground mt-2">{buildingData?.description}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Building Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="grid grid-cols-2 gap-4">
                            <div>
                                <dt className="font-medium">Total Area</dt>
                                <dd>{buildingData?.area} sq ft</dd>
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

                            {
                                buildingData?.amenities?.map((item: AmenityItem, index: number) => (
                                    <div key={index} className="bg-gray-100 px-3 py-2 rounded-lg flex items-center gap-2 text-gray-700">
                                        <DisplayIcon iconName={item.icon} size={20} color="black" /> {item.name}
                                    </div>
                                ))
                            }
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Building Images</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {buildingData?.images?.map((image, index) => (
                            <Image
                                key={index}
                                src={image || "/placeholder.svg"}
                                alt={`Building image ${index + 1}`}
                                width={300}
                                height={200}
                                className="rounded-lg object-cover"
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="sections">
                <TabsList>
                    <TabsTrigger value="sections">Sections</TabsTrigger>
                    <TabsTrigger value="flats">Flat Information</TabsTrigger>
                </TabsList>
                <TabsContent value="sections">
                    <div className="grid gap-6 mt-6">
                        {buildingData?.section?.map((section, index) => (
                            <Card key={index}>
                                <CardHeader>
                                    <CardTitle>{section.name}</CardTitle>
                                    <CardDescription>{section.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {section?.images?.map((image, imgIndex) => (
                                            <Image
                                                key={imgIndex}
                                                src={image || "/placeholder.svg"}
                                                alt={`${section.name} image ${imgIndex + 1}`}
                                                width={300}
                                                height={200}
                                                className="rounded-lg object-cover"
                                            />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="flats">
                    <div className="grid gap-6 mt-6">
                        {buildingData?.flatInfo?.map((flat, index) => (
                            <Card key={index}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>{flat.title}</CardTitle>
                                            <CardDescription>{flat.description}</CardDescription>
                                        </div>
                                        <div>
                                            <Link href={`/room-form?projectId=${buildingData?.projectId}&buildingId=${buildingData?._id}&flatId=${flat._id}`}>
                                                <Button>
                                                    Rooms
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {flat.images.map((image, imgIndex) => (
                                                <Image
                                                    key={imgIndex}
                                                    src={image || "/placeholder.svg"}
                                                    alt={`${flat.title} image ${imgIndex + 1}`}
                                                    width={300}
                                                    height={200}
                                                    className="rounded-lg object-cover"
                                                />
                                            ))}
                                        </div>
                                        <dl className="grid grid-cols-2 gap-4">
                                            <div>
                                                <dt className="font-medium">Total Flats</dt>
                                                <dd>{flat.totalFlats}</dd>
                                            </div>
                                            <div>
                                                <dt className="font-medium">Booked Flats</dt>
                                                <dd>{flat.totalBookedFlats}</dd>
                                            </div>
                                            <div>
                                                <dt className="font-medium">Total Area</dt>
                                                <dd>{flat.totalArea} sq ft</dd>
                                            </div>
                                            <div>
                                                <dt className="font-medium">BHK</dt>
                                                <dd>{flat.bhk}</dd>
                                            </div>
                                            <div>
                                                <dt className="font-medium">Availability</dt>
                                                <dd>
                                                    <Progress value={(flat.totalBookedFlats / flat.totalFlats) * 100} className="mt-2" />
                                                </dd>
                                            </div>
                                        </dl>
                                        {flat.video && (
                                            <div>
                                                <h4 className="font-medium mb-2">Video Tour</h4>
                                                <video controls className="w-full rounded-lg">
                                                    <source src={flat.video} type="video/mp4" />
                                                    Your browser does not support the video tag.
                                                </video>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default Building;