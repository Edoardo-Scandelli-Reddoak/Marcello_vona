'use client';

import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-6 w-6' };

export default function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={readonly ? 'cursor-default' : 'cursor-pointer'}
          aria-label={`${star} stelle`}
        >
          <Star
            className={`${sizes[size]} ${
              star <= value ? 'fill-[#E91E8C] text-[#E91E8C]' : 'text-[#1A1A1A]/20'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
