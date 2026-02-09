import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Flame, Trophy, Zap } from 'lucide-react';

interface CelebrationProps {
  show: boolean;
  streak: number;
  onDone: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  speed: number;
}

export function CelebrationOverlay({ show, streak, onDone }: CelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (show) {
      const colors = ['#f59e0b', '#06b6d4', '#22c55e', '#f43f5e', '#8b5cf6', '#ec4899', '#fbbf24'];
      const newParticles: Particle[] = [];
      for (let i = 0; i < 60; i++) {
        newParticles.push({
          id: i,
          x: 50 + (Math.random() - 0.5) * 10,
          y: 50 + (Math.random() - 0.5) * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 10 + 4,
          angle: Math.random() * 360,
          speed: Math.random() * 300 + 100,
        });
      }
      setParticles(newParticles);
      const timer = setTimeout(onDone, 3500);
      return () => clearTimeout(timer);
    }
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(2, 6, 23, 0.85)' }}
          onClick={onDone}
        >
          {/* Confetti particles */}
          {particles.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const endX = Math.cos(rad) * p.speed;
            const endY = Math.sin(rad) * p.speed;
            return (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: endX,
                  y: endY,
                  opacity: 0,
                  scale: 0.2,
                  rotate: Math.random() * 720,
                }}
                transition={{ duration: 2.5, ease: 'easeOut' }}
                className="absolute rounded-sm"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                }}
              />
            );
          })}

          {/* Center content */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            className="text-center z-10 relative"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex justify-center mb-6"
            >
              <div className="relative">
                <Trophy className="w-20 h-20 text-amber-400" />
                <Flame className="w-8 h-8 text-orange-500 absolute -top-2 -right-2" />
                <Zap className="w-6 h-6 text-cyan-400 absolute -bottom-1 -left-2" />
              </div>
            </motion.div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-7xl font-black bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-4"
            >
              UNSTOPPABLE!
            </motion.h1>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-3"
            >
              <Flame className="w-8 h-8 text-orange-500" />
              <span className="text-4xl md:text-5xl font-mono font-bold text-white">
                {streak} STREAK!
              </span>
              <Flame className="w-8 h-8 text-orange-500" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-white/50 mt-4 text-sm"
            >
              Tap anywhere to continue
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
