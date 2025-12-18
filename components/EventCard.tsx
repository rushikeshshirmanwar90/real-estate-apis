import Link from "next/link"
import { CalendarDays, MapPin } from "lucide-react"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EventProps } from "@/types/Events"

interface EventCardProps {
    event: EventProps
}

export function EventCard({ event }: EventCardProps) {
    return (
        <Card className="overflow-hidden group hover:shadow-lg transition-shadow duration-300">
            <div className="relative h-48 overflow-hidden">
                <Image
                    src={event.images[0] || "/placeholder.svg"}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    width={500}
                    height={300}
                />
            </div>
            <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <CalendarDays className="h-4 w-4" />
                    <time dateTime={event.date}>
                        {new Date(event.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </time>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                <p className="text-muted-foreground line-clamp-2">{event.description}</p>
            </CardContent>
            <CardFooter>
                <Link href={`/events/${event.id}`} className="w-full">
                    <Button variant="default" className="w-full">
                        View Details
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    )
}
