"use client";

import { cn } from "@/lib/utils";

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function StepCard({ number, title, description, icon: Icon }: StepCardProps) {
  return (
    <div className="relative p-6 rounded-xl bg-card border border-border">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-lg">
        {number}
      </div>
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}