import React from 'react'

const Tag: React.FC<{ title: string }> = ({ title }) => {
    return (
        <div className='bg-[#073b3a4b] py-1 px-1.5 rounded-lg' >
            <p className='text-[#073b3aec] font-semibold text-sm' >{title}</p>
        </div>
    )
}

export default Tag
