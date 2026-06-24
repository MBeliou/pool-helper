// hifi-home-v2.jsx — refined Home (Direction A): water header + ticked gauges + clean fix cards
const { Icon, READINGS, SemiGauge } = window;

const REF_L = {
	page: '#F1F3F4',
	card: '#FFFFFF',
	ink: '#0F2A36',
	ink2: '#5E7A86',
	accent: '#0E6BA8',
	idealBand: '#DCEAF3',
	track: '#E7EDF0',
	line: '#E9EFF2',
	st: { ok: '#1E9E6A', high: '#E0962B', low: '#D9534F', info: '#0E6BA8' },
	shadow: '0 1px 2px rgba(15,42,54,.04), 0 6px 18px rgba(15,42,54,.06)',
	grad: 'linear-gradient(158deg,#1f86c4,#0b5a92)',
	onGrad: '#fff'
};
const REF_D = {
	dark: true,
	page: '#0C1A22',
	card: '#15262F',
	ink: '#EAF4F8',
	ink2: '#7193A0',
	accent: '#39A7DD',
	idealBand: 'rgba(57,167,221,.16)',
	track: '#21343D',
	line: '#20333c',
	st: { ok: '#35C98C', high: '#F0B23E', low: '#FF6F66', info: '#39A7DD' },
	shadow: '0 2px 14px rgba(0,0,0,.4)',
	grad: 'linear-gradient(158deg,#11506f,#0a3550)',
	onGrad: '#EAF4F8'
};
const scR = (P, s) => P.st[s] || P.accent;

function RTabBar({ P }) {
	const tabs = [
		['home', 'Home', true],
		['plus', 'Log'],
		['wave', 'Trends'],
		['shield', 'Care'],
		['grid', 'More']
	];
	const map = { home: 'home', plus: 'log', wave: 'trends', shield: 'care', grid: 'more' };
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-around',
				alignItems: 'center',
				padding: '10px 8px 30px',
				background: P.card,
				borderTop: `1px solid ${P.line}`,
				flexShrink: 0
			}}
		>
			{tabs.map(([ic, lb, on]) => (
				<div
					key={lb}
					onClick={() => window.__nav && window.__nav(map[ic])}
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 4,
						color: on ? P.accent : P.ink2,
						cursor: 'pointer'
					}}
				>
					<Icon name={ic} size={23} sw={on ? 2.1 : 1.7} />
					<span
						style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, fontWeight: on ? 700 : 500 }}
					>
						{lb}
					</span>
				</div>
			))}
		</div>
	);
}

function FixCard({ P, color, icon, title, sub, dose }) {
	return (
		<div
			onClick={() => window.__nav && window.__nav('results')}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 13,
				background: P.card,
				borderRadius: 18,
				padding: '13px 14px',
				boxShadow: P.shadow,
				cursor: 'pointer'
			}}
		>
			<div
				style={{
					width: 40,
					height: 40,
					borderRadius: 12,
					background: `${color}1f`,
					display: 'grid',
					placeItems: 'center',
					flexShrink: 0,
					color
				}}
			>
				<Icon name={icon} size={21} sw={1.8} />
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						fontFamily: "'Manrope',sans-serif",
						fontWeight: 700,
						fontSize: 15.5,
						color: P.ink
					}}
				>
					{title}
				</div>
				<div
					style={{
						fontFamily: "'Manrope',sans-serif",
						fontSize: 12.5,
						color: P.ink2,
						marginTop: 1
					}}
				>
					{sub}
				</div>
			</div>
			<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
				<span
					style={{
						fontFamily: "'Space Grotesk',sans-serif",
						fontWeight: 600,
						fontSize: 13,
						color: P.ink,
						background: P.page,
						border: `1px solid ${P.line}`,
						padding: '5px 9px',
						borderRadius: 9,
						whiteSpace: 'nowrap'
					}}
				>
					{dose}
				</span>
				<Icon name="chevron" size={16} c={P.ink2} sw={2} />
			</div>
		</div>
	);
}

function HomeRefined({ P }) {
	return (
		<div
			style={{
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				background: P.page,
				fontFamily: "'Manrope',sans-serif"
			}}
		>
			<div style={{ flex: 1, overflow: 'hidden' }}>
				{/* azure water header */}
				<div
					style={{
						background: P.grad,
						padding: '0 20px 32px',
						position: 'relative',
						color: P.onGrad
					}}
				>
					<div style={{ height: 54 }} />
					<div
						style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
					>
						<div>
							<div
								style={{
									fontFamily: "'Space Grotesk',sans-serif",
									fontWeight: 600,
									fontSize: 28,
									letterSpacing: -0.5
								}}
							>
								My Pool
							</div>
							<div style={{ fontSize: 13.5, opacity: 0.85, marginTop: 2 }}>
								Tested today · 8:30am
							</div>
						</div>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 7,
								background: 'rgba(255,255,255,.16)',
								border: '1px solid rgba(255,255,255,.25)',
								color: '#fff',
								padding: '7px 12px',
								borderRadius: 999,
								fontWeight: 700,
								fontSize: 12.5,
								whiteSpace: 'nowrap'
							}}
						>
							<span style={{ width: 8, height: 8, borderRadius: 999, background: '#fff' }} />
							Action needed
						</div>
					</div>
					<svg
						viewBox="0 0 400 26"
						preserveAspectRatio="none"
						style={{
							position: 'absolute',
							bottom: -1,
							left: 0,
							width: '100%',
							height: 26,
							display: 'block'
						}}
					>
						<path
							d="M0 14 C 60 2 120 24 200 14 C 280 4 340 24 400 12 L400 26 L0 26 Z"
							fill={P.page}
						/>
					</svg>
				</div>

				<div style={{ padding: '16px 18px 0' }}>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr 1fr',
							gap: 10,
							marginBottom: 20
						}}
					>
						{READINGS.map((d) => (
							<div
								key={d.key}
								style={{
									background: P.card,
									borderRadius: 18,
									padding: '11px 8px 8px',
									boxShadow: P.shadow
								}}
							>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										padding: '0 4px 2px'
									}}
								>
									<span style={{ fontSize: 11.5, fontWeight: 700, color: P.ink2 }}>{d.label}</span>
									<span
										style={{ width: 7, height: 7, borderRadius: 999, background: scR(P, d.status) }}
									/>
								</div>
								<SemiGauge
									r={42}
									value={d.value}
									unit={d.unit}
									frac={d.frac}
									lo={d.lo}
									hi={d.hi}
									statusColor={scR(P, d.status)}
									track={P.track}
									P={P}
									ticks
								/>
							</div>
						))}
					</div>
					<div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 11 }}>
						<span
							style={{
								fontFamily: "'Space Grotesk',sans-serif",
								fontWeight: 600,
								fontSize: 17,
								color: P.ink
							}}
						>
							What to fix
						</span>
						<span style={{ fontSize: 13, color: P.ink2 }}>2 things</span>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
						<FixCard
							P={P}
							color={P.st.low}
							icon="beaker"
							title="Raise free chlorine"
							sub="0.8 → 3.0 ppm"
							dose="Add 1.4 kg"
						/>
						<FixCard
							P={P}
							color={P.st.high}
							icon="drop"
							title="Lower pH"
							sub="7.8 → 7.4"
							dose="Add 680 g"
						/>
					</div>
				</div>
			</div>
			<RTabBar P={P} />
		</div>
	);
}

Object.assign(window, { HomeRefined, REF_L, REF_D });
