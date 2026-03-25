'use client';

import { useRef, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CarouselProps {
  children: ReactNode;
}

export default function Carousel({ children }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="group relative">
      <Button
        variant="outline"
        size="icon"
        className="absolute -left-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border-[#1A1A1A]/10 bg-white shadow-md group-hover:flex"
        onClick={() => scroll('left')}
        aria-label="Scorri a sinistra"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-4 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border-[#1A1A1A]/10 bg-white shadow-md group-hover:flex"
        onClick={() => scroll('right')}
        aria-label="Scorri a destra"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
