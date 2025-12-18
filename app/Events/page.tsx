'use client'
import { Plus } from 'lucide-react';
import TopHeader from '@/components/TopHeader';
import { EventCard } from '@/components/EventCard';

export default function Page() {

    const event = {
        title: "Tech Conference 2025",
        description: "Annual technology conference bringing together innovators, developers, and industry leaders to discuss emerging trends and technologies.",
        date: "2025-05-20",
        location: "Convention Center, San Francisco",
        images: [
            "https://res.cloudinary.com/dlcq8i2sc/image/upload/v1739822766/znuo23znw8lfbytz62tn.jpg",
        ]
    }

    return (
        <div>
            <TopHeader
                buttonText='Add Event'
                tagTitle='Events'
                title='Our Events'
                TagIcon={Plus}
                link="/event-form"
            />

            <div className='grid grid-cols-3 gap-3 px-3 mt-4'>
                <EventCard event={event} />
                <EventCard event={event} />
                <EventCard event={event} />
            </div>

        </div>
    );
}