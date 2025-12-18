import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const ProjectCarousel: React.FC<{
    images: string[] | undefined
}> = ({ images }) => {

    // console.log("Images");
    // console.log(images);

    return (
        <Carousel className="w-full max-w-4xl mx-auto" opts={{ loop: true }}>
            <CarouselContent>
                {images?.map((image, index) => (
                    <CarouselItem key={index}>
                        <div className="relative aspect-video">
                            <Image
                                src={image}
                                alt={`Project image ${index + 1}`}
                                fill
                                className="object-cover rounded-lg"
                            />
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
        </Carousel>
    );
}

export default ProjectCarousel;