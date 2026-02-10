import { cn } from '@/utils/cn';

type CardVariant = 'default' | 'outlined' | 'list-item';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-[#0A0A0A] border border-transparent rounded-sm',
  outlined: 'bg-transparent border border-zinc-800 rounded-sm',
  'list-item': 'bg-transparent border-b border-zinc-900 rounded-none',
};

const hoverStyles: Record<CardVariant, string> = {
  default: 'hover:border-zinc-800',
  outlined: 'hover:border-zinc-700',
  'list-item': 'hover:bg-white/[0.02]',
};

export function Card({ children, className, onClick, variant = 'default' }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'transition-all duration-150 ease-out overflow-hidden',
        variantStyles[variant],
        hoverStyles[variant],
        onClick && 'cursor-pointer active:scale-[0.995]',
        className
      )}
    >
      {children}
    </div>
  );
}