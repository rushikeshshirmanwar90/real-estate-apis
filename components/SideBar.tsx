"use client"
import { ChevronFirst, MoreVertical } from 'lucide-react'
import Image from 'next/image'
import React from 'react'

const SideBar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <aside className='h-screen w-[20vw]'>
            <nav className='h-full flex flex-col bg-white border-r shadow-sm'>
                <div className='p-4 pb-2 flex justify-between items-center bg-[#517675]'>
                    <Image src={`/assets/logo.png`} alt='Logo' width={200} height={10} />
                    <button className='p-1.5 rounded-lg bg-[#073b3adb] hover:bg-[#073b3a]' >
                        <ChevronFirst color='#517675' />
                    </button>
                </div>

                <ul className='flex px-3 bg-[#517675] border-t-2 border-t-[#073B3A] h-full  w-full'>  {children}</ul>

                <div className='mt-auto bg-[#517675] border-t-2 border-t-[#073B3A] ' >
                    <div className='flex p-3' >
                        <Image alt='avatar' src={'/assets/man.png'} width={45} height={20} />
                        <div className='flex justify-between items-center w-full ml-3 pr-2'  >
                            <div>
                                <h4 className='font-semibold'>Rushi Shrimanwar</h4>
                                <span className='text-xs'>rushikeshshrimanwar@gmail.com</span>
                            </div>
                            <MoreVertical size={20} />
                        </div>
                    </div>
                </div>

            </nav>
        </aside>
    )
}

export default SideBar
