import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  accentColor?: string;
}

export function GlassCard({ children, className, onClick, hover = false, accentColor }: GlassCardProps) {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        'glass-panel rounded-2xl p-5 transition-all duration-300',
        hover && 'cursor-pointer',
        accentColor && `hover:border-${accentColor}/30`,
        className
      )}
      style={accentColor ? {
        boxShadow: hover ? `0 0 20px ${accentColor}15` : undefined,
      } : undefined}
    >
      {children}
    </motion.div>
  );
}
