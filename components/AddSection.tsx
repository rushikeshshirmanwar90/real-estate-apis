import React from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { TableOfContents, Plus } from "lucide-react"
import Link from 'next/link'

const AddSection = () => {
  return (
    <div>
      <Card className="w-full overflow-hidden bg-gradient-to-br from-[#446B6B] to-[#2D4848] text-white shadow-xl">
        <CardHeader className="border-b border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-3 ">
              <div className="border border-[#073B3A] bg-[#517675] p-2 rounded-full"  >
                <TableOfContents size={20} color='#073B3A' />
              </div>
              Add Section
            </h2>

            <Link href={'/add-building'}  >
              <Button className="bg-white/10 hover:bg-white/20 text-white">
                <Plus size={25} />
                Add Section
              </Button>
            </Link>

          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">

          <div>

          </div>

        </CardContent>
      </Card>
    </div>
  )
}

export default AddSection
