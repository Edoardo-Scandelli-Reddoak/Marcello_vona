'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

/**
 * Input password con toggle "mostra/nascondi" tramite icona occhio.
 * Usato nei form di registrazione e login per ridurre gli errori
 * di battitura senza compromettere la privacy (default nascosta).
 */
export default function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${props.className ?? ''} pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Nascondi password' : 'Mostra password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#1A1A1A]/50 transition-colors hover:bg-[#1A1A1A]/[0.04] hover:text-[#1A1A1A]/80"
        tabIndex={-1}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
