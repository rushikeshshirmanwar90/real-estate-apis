import React from 'react'
import Tag from './Tag'
import { Button } from './ui/button'
import Link from 'next/link'

interface TopHeaderProps {
    tagTitle: string,
    title: string,
    buttonText: string,
    TagIcon?: React.ElementType
    buttonDisable?: boolean
    link?: string
}

const TopHeader: React.FC<TopHeaderProps> = ({
    buttonText,
    tagTitle, title,
    TagIcon, link, buttonDisable = false
}) => {
    return (
        <div>
            <div className='flex items-center justify-between mt-2 p-2' >
                <div className='flex flex-col  gap-2'>
                    <div className='w-fit'>
                        <Tag title={tagTitle} />
                    </div>
                    <p className='text-3xl font-semibold'>
                        {title}
                    </p>
                </div>
                <div>

                    {
                        !link ? (
                            <Button variant={'ghost'} className='bg-[#FCC608] hover:bg-[#fcc708de]' disabled={buttonDisable}>
                                <p className='text-lg font-medium px-4' >
                                    {buttonText}
                                </p>
                                {TagIcon && <TagIcon />}
                            </Button>
                        ) : (
                            <Link href={link} >
                                <Button variant={'ghost'} className='bg-[#FCC608] hover:bg-[#fcc708de]' disabled={buttonDisable}>
                                    <p className='text-lg font-medium px-4' >
                                        {buttonText}
                                    </p>    {TagIcon && <TagIcon />}
                                </Button>
                            </Link>
                        )
                    }
                </div>
            </div>
        </div>
    )
}

export default TopHeader
