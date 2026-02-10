import { motion } from 'framer-motion';

interface DiagramProps {
  type: 'triangle' | 'rectangle' | 'block-force' | 'circle' | 'trapezoid' | 'none';
  data: Record<string, number>;
}

export function DynamicDiagram({ type, data }: DiagramProps) {
  if (type === 'none') return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex justify-center my-4"
    >
      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-sm p-4 inline-block">
        <svg width="320" height="220" viewBox="0 0 320 220" className="max-w-full">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#e4e4e7" />
            </marker>
          </defs>
          {type === 'triangle' && <TriangleDiagram data={data} />}
          {type === 'rectangle' && <RectangleDiagram data={data} />}
          {type === 'block-force' && <BlockForceDiagram data={data} />}
          {type === 'circle' && <CircleDiagram data={data} />}
          {type === 'trapezoid' && <TrapezoidDiagram data={data} />}
        </svg>
      </div>
    </motion.div>
  );
}

function Label({ x, y, text }: { x: number; y: number; text: string }) {
  const w = text.length * 7.5 + 16;
  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - 10}
        width={w}
        height={20}
        rx="0"
        fill="#000000"
        stroke="#333333"
        strokeWidth="1"
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fill="#FF4D00"
        fontSize="10"
        fontFamily="'JetBrains Mono', Consolas, monospace"
        fontWeight="500"
      >
        {text}
      </text>
    </g>
  );
}

function TriangleDiagram({ data }: { data: Record<string, number> }) {
  const { base = 10, height = 8 } = data;
  const scale = Math.min(200 / base, 140 / height);
  const bPx = base * scale;
  const hPx = height * scale;
  const ox = (320 - bPx) / 2;
  const oy = 180;

  const points = `${ox},${oy} ${ox + bPx},${oy} ${ox + bPx / 2},${oy - hPx}`;

  return (
    <g>
      <polygon points={points} fill="none" stroke="#e4e4e7" strokeWidth="1.5" />
      <line
        x1={ox + bPx / 2} y1={oy}
        x2={ox + bPx / 2} y2={oy - hPx}
        stroke="#52525B" strokeWidth="1" strokeDasharray="4 4"
      />
      <Label x={ox + bPx / 2} y={oy + 16} text={`${base} cm`} />
      <Label x={ox + bPx / 2 + bPx / 4 + 20} y={oy - hPx / 2} text={`${height} cm`} />
    </g>
  );
}

function RectangleDiagram({ data }: { data: Record<string, number> }) {
  const { length = 10, width = 6 } = data;
  const scale = Math.min(220 / length, 140 / width);
  const lPx = length * scale;
  const wPx = width * scale;
  const ox = (320 - lPx) / 2;
  const oy = (220 - wPx) / 2;

  return (
    <g>
      <rect x={ox} y={oy} width={lPx} height={wPx} fill="none" stroke="#e4e4e7" strokeWidth="1.5" />
      <Label x={ox + lPx / 2} y={oy + wPx + 18} text={`${length} cm`} />
      <Label x={ox - 30} y={oy + wPx / 2} text={`${width} cm`} />
    </g>
  );
}

function BlockForceDiagram({ data }: { data: Record<string, number> }) {
  const { mass = 5, force = 50 } = data;
  const blockW = 80;
  const blockH = 60;
  const bx = 120;
  const by = 120;

  return (
    <g>
      {/* Floor */}
      <line x1="40" y1={by + blockH} x2="280" y2={by + blockH} stroke="#333333" strokeWidth="1" />
      <line x1="40" y1={by + blockH + 2} x2="280" y2={by + blockH + 2} stroke="#27272A" strokeWidth="1" strokeDasharray="6 4" />
      {/* Block */}
      <rect x={bx} y={by} width={blockW} height={blockH} fill="none" stroke="#e4e4e7" strokeWidth="1.5" />
      <text
        x={bx + blockW / 2} y={by + blockH / 2 + 4}
        textAnchor="middle"
        fill="#FF4D00"
        fontSize="12"
        fontFamily="'JetBrains Mono', Consolas, monospace"
        fontWeight="600"
      >
        {mass} kg
      </text>
      {/* Force Arrow */}
      <line
        x1={bx + blockW} y1={by + blockH / 2}
        x2={bx + blockW + 70} y2={by + blockH / 2}
        stroke="#e4e4e7" strokeWidth="2"
        markerEnd="url(#arrowhead)"
      />
      <Label x={bx + blockW + 40} y={by + blockH / 2 - 18} text={`F=${force}N`} />
    </g>
  );
}

function CircleDiagram({ data }: { data: Record<string, number> }) {
  const { radius = 7 } = data;
  const scale = Math.min(80 / radius, 10);
  const rPx = radius * scale;
  const cx = 160;
  const cy = 110;

  return (
    <g>
      <circle cx={cx} cy={cy} r={rPx} fill="none" stroke="#e4e4e7" strokeWidth="1.5" />
      <line
        x1={cx} y1={cy}
        x2={cx + rPx} y2={cy}
        stroke="#52525B" strokeWidth="1" strokeDasharray="4 4"
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="2" fill="#52525B" />
      <Label x={cx + rPx / 2} y={cy - 14} text={`r=${radius}cm`} />
    </g>
  );
}

function TrapezoidDiagram({ data }: { data: Record<string, number> }) {
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
    <g>
      <polygon points={points} fill="none" stroke="#e4e4e7" strokeWidth="1.5" />
      {/* Height dimension line */}
      <line
        x1={ox - 8} y1={oy}
        x2={ox - 8} y2={oy - hPx}
        stroke="#52525B" strokeWidth="1" strokeDasharray="4 4"
      />
      <Label x={160} y={oy + 16} text={`${bottomSide} cm`} />
      <Label x={160} y={oy - hPx - 14} text={`${topSide} cm`} />
      <Label x={ox - 32} y={oy - hPx / 2} text={`${height} cm`} />
    </g>
  );
}