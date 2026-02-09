import { motion } from 'framer-motion';

interface DiagramProps {
  type: 'triangle' | 'rectangle' | 'block-force' | 'circle' | 'trapezoid' | 'none';
  data: Record<string, number>;
  accent: string;
}

export function DynamicDiagram({ type, data, accent }: DiagramProps) {
  if (type === 'none') return null;

  const accentColor = accent === 'amber' ? '#f59e0b' : accent === 'green' ? '#22c55e' : '#06b6d4';
  const accentLight = accent === 'amber' ? '#fbbf24' : accent === 'green' ? '#4ade80' : '#22d3ee';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex justify-center my-4"
    >
      <div className="glass-panel rounded-xl p-4 inline-block">
        <svg width="320" height="220" viewBox="0 0 320 220" className="max-w-full">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {type === 'triangle' && <TriangleDiagram data={data} color={accentColor} light={accentLight} />}
          {type === 'rectangle' && <RectangleDiagram data={data} color={accentColor} light={accentLight} />}
          {type === 'block-force' && <BlockForceDiagram data={data} color={accentColor} light={accentLight} />}
          {type === 'circle' && <CircleDiagram data={data} color={accentColor} light={accentLight} />}
          {type === 'trapezoid' && <TrapezoidDiagram data={data} color={accentColor} light={accentLight} />}
        </svg>
      </div>
    </motion.div>
  );
}

function Label({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  const w = text.length * 8 + 12;
  return (
    <g>
      <rect x={x - w / 2} y={y - 10} width={w} height={20} rx="4" fill="rgba(0,0,0,0.6)" stroke={color} strokeWidth="0.5" />
      <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="12" fontFamily="JetBrains Mono, monospace">{text}</text>
    </g>
  );
}

function TriangleDiagram({ data, color, light }: { data: Record<string, number>; color: string; light: string }) {
  const { base = 10, height = 8 } = data;
  const scale = Math.min(200 / base, 140 / height);
  const bPx = base * scale;
  const hPx = height * scale;
  const ox = (320 - bPx) / 2;
  const oy = 180;

  const points = `${ox},${oy} ${ox + bPx},${oy} ${ox + bPx / 2},${oy - hPx}`;

  return (
    <g filter="url(#glow)">
      <polygon points={points} fill="rgba(6,182,212,0.08)" stroke={color} strokeWidth="2" />
      {/* dashed height line */}
      <line x1={ox + bPx / 2} y1={oy} x2={ox + bPx / 2} y2={oy - hPx} stroke={light} strokeWidth="1" strokeDasharray="4 4" />
      <Label x={ox + bPx / 2} y={oy + 16} text={`${base} cm`} color={color} />
      <Label x={ox + bPx / 2 + bPx / 4 + 20} y={oy - hPx / 2} text={`${height} cm`} color={color} />
    </g>
  );
}

function RectangleDiagram({ data, color, light }: { data: Record<string, number>; color: string; light: string }) {
  void light;
  const { length = 10, width = 6 } = data;
  const scale = Math.min(220 / length, 140 / width);
  const lPx = length * scale;
  const wPx = width * scale;
  const ox = (320 - lPx) / 2;
  const oy = (220 - wPx) / 2;

  return (
    <g filter="url(#glow)">
      <rect x={ox} y={oy} width={lPx} height={wPx} fill="rgba(6,182,212,0.08)" stroke={color} strokeWidth="2" rx="2" />
      <Label x={ox + lPx / 2} y={oy + wPx + 18} text={`${length} cm`} color={color} />
      <Label x={ox - 30} y={oy + wPx / 2} text={`${width} cm`} color={color} />
    </g>
  );
}

function BlockForceDiagram({ data, color, light }: { data: Record<string, number>; color: string; light: string }) {
  const { mass = 5, force = 50 } = data;
  const blockW = 80;
  const blockH = 60;
  const bx = 120;
  const by = 120;

  return (
    <g filter="url(#glow)">
      {/* Floor */}
      <line x1="40" y1={by + blockH} x2="280" y2={by + blockH} stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <line x1="40" y1={by + blockH + 2} x2="280" y2={by + blockH + 2} stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="6 4" />
      {/* Block */}
      <rect x={bx} y={by} width={blockW} height={blockH} fill="rgba(6,182,212,0.15)" stroke={color} strokeWidth="2" rx="4" />
      <text x={bx + blockW / 2} y={by + blockH / 2 + 5} textAnchor="middle" fill="white" fontSize="14" fontFamily="JetBrains Mono, monospace">
        {mass} kg
      </text>
      {/* Force Arrow */}
      <line x1={bx + blockW} y1={by + blockH / 2} x2={bx + blockW + 70} y2={by + blockH / 2} stroke={light} strokeWidth="3" markerEnd="url(#arrowhead)" />
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={light} />
        </marker>
      </defs>
      <Label x={bx + blockW + 40} y={by + blockH / 2 - 18} text={`F=${force}N`} color={color} />
    </g>
  );
}

function CircleDiagram({ data, color, light }: { data: Record<string, number>; color: string; light: string }) {
  const { radius = 7 } = data;
  const scale = Math.min(80 / radius, 10);
  const rPx = radius * scale;
  const cx = 160;
  const cy = 110;

  return (
    <g filter="url(#glow)">
      <circle cx={cx} cy={cy} r={rPx} fill="rgba(6,182,212,0.08)" stroke={color} strokeWidth="2" />
      <line x1={cx} y1={cy} x2={cx + rPx} y2={cy} stroke={light} strokeWidth="1.5" strokeDasharray="4 3" />
      <Label x={cx + rPx / 2} y={cy - 12} text={`r=${radius}cm`} color={color} />
    </g>
  );
}

function TrapezoidDiagram({ data, color, light }: { data: Record<string, number>; color: string; light: string }) {
  void light;
  const { topSide = 6, bottomSide = 12, height = 8 } = data;
  const scale = Math.min(220 / bottomSide, 140 / height);
  const topPx = topSide * scale;
  const botPx = bottomSide * scale;
  const hPx = height * scale;
  const ox = (320 - botPx) / 2;
  const oy = 180;
  const topOx = (320 - topPx) / 2;

  const points = `${ox},${oy} ${ox + botPx},${oy} ${topOx + topPx},${oy - hPx} ${topOx},${oy - hPx}`;

  return (
    <g filter="url(#glow)">
      <polygon points={points} fill="rgba(6,182,212,0.08)" stroke={color} strokeWidth="2" />
      <Label x={160} y={oy + 16} text={`${bottomSide} cm`} color={color} />
      <Label x={160} y={oy - hPx - 12} text={`${topSide} cm`} color={color} />
      <Label x={ox - 30} y={oy - hPx / 2} text={`${height} cm`} color={color} />
    </g>
  );
}
