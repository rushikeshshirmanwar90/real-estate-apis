"use client";
import React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/utils/animation-counter";

interface cardProps {
  title: string;
  value: number;
  description: string;
  isGreen: boolean;
}

export const DashboardCards: React.FC<cardProps> = ({
  title,
  value,
  description,
  isGreen,
}) => {
  return (
    <Card className="w-full h-fit pb-3 max-w-xs bg-black text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-zinc-400">{title}</CardTitle>
        <div className="text-2xl font-bold">
          <AnimatedCounter value={value} />
        </div>
        <p className={`text-sm ${isGreen ? ' text-emerald-500' : 'text-red-500'} `}>
          {description}
        </p>
      </CardHeader>
    </Card >
  );
};
