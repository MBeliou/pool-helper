// hifi-parts.jsx — hi-fi gauges, line icons, shared bits for Home directions
const HFReact = window.React;

// ── line icon set (24x24, stroke=currentColor) ──────────────────────
const ICON_PATHS = {
	home: 'M3 11.5 12 4l9 7.5M5 10v9h5v-6h4v6h5v-9',
	drop: 'M12 3.5c3.5 4 6 6.8 6 10a6 6 0 0 1-12 0c0-3.2 2.5-6 6-10Z',
	wave: 'M3 13c2.2 0 2.2-3 4.4-3s2.2 3 4.4 3 2.2-3 4.4-3 2.2 3 4.4 3M3 17c2.2 0 2.2-3 4.4-3s2.2 3 4.4 3 2.2-3 4.4-3 2.2 3 4.4 3',
	shield: 'M12 3.5 5 6v5.5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-2.5ZM9.2 11.8l2 2 3.6-3.8',
	grid: 'M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z',
	plus: 'M12 5v14M5 12h14',
	alert:
		'M12 8v5M12 16.5v.5M10.3 4.3 3 17a1.5 1.5 0 0 0 1.3 2.3h15.4A1.5 1.5 0 0 0 21 17L13.7 4.3a2 2 0 0 0-3.4 0Z',
	arrowUp: 'M12 19V6M6 11l6-6 6 6',
	arrowDn: 'M12 5v13M6 13l6 6 6-6',
	chevron: 'M9 5l7 7-7 7',
	thermo: 'M14 13.5V6a2 2 0 0 0-4 0v7.5a4 4 0 1 0 4 0Z',
	beaker: 'M9 4h6M10 4v6L5.5 18A2 2 0 0 0 7.3 21h9.4a2 2 0 0 0 1.8-3L14 10V4',
	spark:
		'M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8',
	close: 'M6 6l12 12M18 6 6 18',
	trend: 'M3 17l5-5 4 4 8-8M21 8v5h-5'
};
function Icon({ name, size = 22, c = 'currentColor', sw = 1.7, fill = 'none', style }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill={fill}
			stroke={c}
			strokeWidth={sw}
			strokeLinecap="round"
			strokeLinejoin="round"
			style={{ display: 'block', ...style }}
		>
			<path d={ICON_PATHS[name]} />
		</svg>
	);
}

// ── water-chemistry reading data (shared across directions) ─────────
// frac = position of value on its scale; lo/hi = ideal band on that scale
const READINGS = [
	{
		key: 'ph',
		label: 'pH',
		value: '7.8',
		unit: '',
		status: 'high',
		frac: 0.71,
		lo: 0.29,
		hi: 0.57,
		icon: 'drop'
	},
	{
		key: 'fc',
		label: 'Free Cl',
		value: '0.8',
		unit: 'ppm',
		status: 'low',
		frac: 0.13,
		lo: 0.33,
		hi: 0.67,
		icon: 'beaker'
	},
	{
		key: 'ta',
		label: 'Alkalinity',
		value: '90',
		unit: 'ppm',
		status: 'ok',
		frac: 0.45,
		lo: 0.4,
		hi: 0.6,
		icon: 'wave'
	},
	{
		key: 'ch',
		label: 'Hardness',
		value: '240',
		unit: 'ppm',
		status: 'ok',
		frac: 0.4,
		lo: 0.33,
		hi: 0.67,
		icon: 'spark'
	},
	{
		key: 'cya',
		label: 'CYA',
		value: '45',
		unit: 'ppm',
		status: 'ok',
		frac: 0.45,
		lo: 0.3,
		hi: 0.5,
		icon: 'shield'
	},
	{
		key: 'temp',
		label: 'Temp',
		value: '26',
		unit: '°C',
		status: 'info',
		frac: 0.53,
		lo: 0,
		hi: 0,
		icon: 'thermo'
	}
];

// ── geometry helpers ────────────────────────────────────────────────
function ptOnArc(cx, cy, r, frac) {
	// semicircle: frac 0 = left, 0.5 = top, 1 = right
	const theta = ((180 - 180 * frac) * Math.PI) / 180;
	return [cx + r * Math.cos(theta), cy - r * Math.sin(theta)];
}

// ── 1 · CLEAR — semicircle gauge with ideal band + ticks + marker ───
function SemiGauge({ r, value, unit, frac, lo, hi, statusColor, track, P, ticks }) {
	const w = r * 2 + 16,
		cx = w / 2,
		cy = r + 8,
		sw = 9;
	const L = Math.PI * r;
	const [mx, my] = ptOnArc(cx, cy, r, frac);
	const N = 10;
	return (
		<svg
			width={w}
			height={cy + 10}
			viewBox={`0 0 ${w} ${cy + 10}`}
			style={{ display: 'block', overflow: 'visible' }}
		>
			<path
				d={`M8 ${cy} A ${r} ${r} 0 0 1 ${w - 8} ${cy}`}
				fill="none"
				stroke={track}
				strokeWidth={sw}
				strokeLinecap="round"
			/>
			{hi > lo && (
				<path
					d={`M8 ${cy} A ${r} ${r} 0 0 1 ${w - 8} ${cy}`}
					fill="none"
					stroke={P.idealBand}
					strokeWidth={sw}
					strokeDasharray={`0 ${L * lo} ${L * (hi - lo)} ${L * 2}`}
					strokeLinecap="butt"
				/>
			)}
			{ticks &&
				Array.from({ length: N + 1 }).map((_, i) => {
					const f = i / N,
						major = i % 5 === 0;
					const ro = r - sw / 2 - 2.5,
						ri = ro - (major ? 7 : 4);
					const [ox, oy] = ptOnArc(cx, cy, ro, f),
						[ix, iy] = ptOnArc(cx, cy, ri, f);
					return (
						<line
							key={i}
							x1={ox}
							y1={oy}
							x2={ix}
							y2={iy}
							stroke={P.ink2}
							strokeWidth={major ? 1.8 : 1.2}
							opacity={major ? 0.55 : 0.35}
							strokeLinecap="round"
						/>
					);
				})}
			<path
				d={`M8 ${cy} A ${r} ${r} 0 0 1 ${w - 8} ${cy}`}
				fill="none"
				stroke={statusColor}
				strokeWidth={sw}
				strokeDasharray={`${L * frac} ${L * 2}`}
				strokeLinecap="round"
			/>
			<text
				x={cx}
				y={cy - r * 0.14}
				textAnchor="middle"
				fontFamily="'Space Grotesk', sans-serif"
				fontWeight="600"
				fontSize={r * 0.46}
				fill={P.ink}
			>
				{value}
			</text>
			{unit && (
				<text
					x={cx}
					y={cy - r * 0.14 + r * 0.3}
					textAnchor="middle"
					fontFamily="'Manrope', sans-serif"
					fontSize={r * 0.2}
					fill={P.ink2}
				>
					{unit}
				</text>
			)}
		</svg>
	);
}

// ── 2 · LAGOON — full ring (dasharray) with ideal tick marks ────────
function RingGauge({ r, value, unit, frac, lo, hi, statusColor, track, P }) {
	const size = r * 2 + 18,
		c = size / 2,
		sw = 8,
		R = r;
	const C = 2 * Math.PI * R;
	const tick = (f) => {
		const a = ((-90 + 360 * f) * Math.PI) / 180;
		return [
			c + (R - 7) * Math.cos(a),
			c + (R - 7) * Math.sin(a),
			c + (R + 7) * Math.cos(a),
			c + (R + 7) * Math.sin(a)
		];
	};
	return (
		<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
			<circle cx={c} cy={c} r={R} fill="none" stroke={track} strokeWidth={sw} />
			<g transform={`rotate(-90 ${c} ${c})`}>
				<circle
					cx={c}
					cy={c}
					r={R}
					fill="none"
					stroke={statusColor}
					strokeWidth={sw}
					strokeDasharray={`${C * frac} ${C}`}
					strokeLinecap="round"
				/>
			</g>
			{hi > lo &&
				[lo, hi].map((f, i) => {
					const [x1, y1, x2, y2] = tick(f);
					return (
						<line
							key={i}
							x1={x1}
							y1={y1}
							x2={x2}
							y2={y2}
							stroke={P.ink2}
							strokeWidth={2}
							strokeLinecap="round"
							opacity={0.5}
						/>
					);
				})}
			<text
				x={c}
				y={c - 1}
				textAnchor="middle"
				dominantBaseline="middle"
				fontFamily="'Space Grotesk', sans-serif"
				fontWeight="600"
				fontSize={R * 0.5}
				fill={P.ink}
			>
				{value}
			</text>
			{unit && (
				<text
					x={c}
					y={c + R * 0.34}
					textAnchor="middle"
					fontFamily="'Manrope', sans-serif"
					fontSize={R * 0.21}
					fill={P.ink2}
				>
					{unit}
				</text>
			)}
		</svg>
	);
}

// ── 3 · INSTRUMENT — 270° arc with tick marks + glow ────────────────
function TickGauge({ r, value, unit, frac, lo, hi, statusColor, track, P }) {
	const size = r * 2 + 20,
		c = size / 2,
		sw = 7,
		R = r;
	const sweep = 270,
		start = 135; // degrees, gap at bottom
	const C = 2 * Math.PI * R;
	const arcLen = C * (sweep / 360);
	const ticks = Array.from({ length: 19 });
	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			style={{ display: 'block', overflow: 'visible' }}
		>
			<g transform={`rotate(${start} ${c} ${c})`}>
				<circle
					cx={c}
					cy={c}
					r={R}
					fill="none"
					stroke={track}
					strokeWidth={sw}
					strokeDasharray={`${arcLen} ${C}`}
					strokeLinecap="round"
				/>
				{hi > lo && (
					<circle
						cx={c}
						cy={c}
						r={R}
						fill="none"
						stroke={P.idealBand}
						strokeWidth={sw}
						strokeDasharray={`0 ${arcLen * lo} ${arcLen * (hi - lo)} ${C}`}
						strokeLinecap="butt"
					/>
				)}
				<circle
					cx={c}
					cy={c}
					r={R}
					fill="none"
					stroke={statusColor}
					strokeWidth={sw}
					strokeDasharray={`${arcLen * frac} ${C}`}
					strokeLinecap="round"
					style={{ filter: `drop-shadow(0 0 4px ${statusColor})` }}
				/>
			</g>
			{ticks.map((_, i) => {
				const f = i / 18,
					a = ((start + sweep * f) * Math.PI) / 180;
				const x1 = c + (R - 11) * Math.cos(a),
					y1 = c + (R - 11) * Math.sin(a);
				const x2 = c + (R - 7) * Math.cos(a),
					y2 = c + (R - 7) * Math.sin(a);
				return (
					<line
						key={i}
						x1={x1}
						y1={y1}
						x2={x2}
						y2={y2}
						stroke={P.ink2}
						strokeWidth={1.3}
						opacity={0.45}
					/>
				);
			})}
			<text
				x={c}
				y={c}
				textAnchor="middle"
				dominantBaseline="middle"
				fontFamily="'Space Grotesk', sans-serif"
				fontWeight="600"
				fontSize={R * 0.52}
				fill={P.ink}
			>
				{value}
			</text>
			{unit && (
				<text
					x={c}
					y={c + R * 0.36}
					textAnchor="middle"
					fontFamily="'Space Grotesk', sans-serif"
					fontSize={R * 0.2}
					fill={P.ink2}
				>
					{unit}
				</text>
			)}
		</svg>
	);
}

Object.assign(window, { Icon, READINGS, SemiGauge, RingGauge, TickGauge, ptOnArc });
