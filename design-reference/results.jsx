// hifi-results.jsx — hi-fi Results & Dosing (fix plan + math + product picker + what you'll need)
const { Icon, REF_L, REF_D, NavHeader, TabBar } = window;
const rc = (P, s) => P.st[s] || P.accent;

// ── one action in the fix plan ───────────────────────────────────────
function ActionCard({ P, color, icon, title, range, dose, product, expanded, done }) {
	return (
		<div
			style={{
				background: P.card,
				borderRadius: 18,
				boxShadow: P.shadow,
				border: expanded ? `1.5px solid ${color}55` : '1.5px solid transparent',
				overflow: 'hidden'
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px' }}>
				<div
					style={{
						width: 24,
						height: 24,
						borderRadius: 999,
						border: done ? 'none' : `2px solid ${P.ink2}66`,
						background: done ? P.st.ok : 'transparent',
						display: 'grid',
						placeItems: 'center',
						flexShrink: 0
					}}
				>
					{done && <Icon name="shield" size={0} />}
					{done && (
						<span style={{ color: '#fff', fontSize: 13, fontWeight: 800, lineHeight: 1 }}>✓</span>
					)}
				</div>
				<div
					style={{
						width: 38,
						height: 38,
						borderRadius: 11,
						background: `${color}1f`,
						display: 'grid',
						placeItems: 'center',
						color,
						flexShrink: 0
					}}
				>
					<Icon name={icon} size={20} sw={1.8} />
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							fontFamily: "'Manrope',sans-serif",
							fontWeight: 700,
							fontSize: 15.5,
							color: done ? P.ink2 : P.ink,
							textDecoration: done ? 'line-through' : 'none'
						}}
					>
						{title}
					</div>
					<div style={{ fontSize: 12.5, color: P.ink2, marginTop: 1 }}>{range}</div>
				</div>
				{dose ? (
					<span
						style={{
							fontFamily: "'Space Grotesk',sans-serif",
							fontWeight: 600,
							fontSize: 13.5,
							color: '#fff',
							background: color,
							padding: '6px 11px',
							borderRadius: 10,
							whiteSpace: 'nowrap'
						}}
					>
						{dose}
					</span>
				) : (
					<span style={{ fontSize: 12.5, color: P.st.ok, fontWeight: 700 }}>OK</span>
				)}
				{!done && (
					<Icon
						name="chevron"
						size={16}
						c={P.ink2}
						sw={2}
						style={{ transform: expanded ? 'rotate(90deg)' : 'none', flexShrink: 0 }}
					/>
				)}
			</div>
			{expanded && (
				<div style={{ padding: '2px 14px 15px', borderTop: `1px solid ${P.line}` }}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							padding: '12px 0 11px'
						}}
					>
						<span style={{ fontSize: 13, color: P.ink2 }}>Using product</span>
						<span
							onClick={() => window.__nav && window.__nav('productpicker')}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 5,
								fontFamily: "'Manrope',sans-serif",
								fontWeight: 700,
								fontSize: 13.5,
								color: P.ink,
								background: P.page,
								border: `1px solid ${P.line}`,
								padding: '6px 10px',
								borderRadius: 9,
								cursor: 'pointer'
							}}
						>
							{product}
							<Icon
								name="chevron"
								size={13}
								c={P.ink2}
								sw={2.2}
								style={{ transform: 'rotate(90deg)' }}
							/>
						</span>
					</div>
					<div
						style={{
							background: `${P.accent}10`,
							borderRadius: 12,
							padding: '11px 13px',
							marginBottom: 11
						}}
					>
						<div
							style={{
								fontSize: 11.5,
								color: P.ink2,
								textTransform: 'uppercase',
								letterSpacing: 0.5,
								fontWeight: 700
							}}
						>
							Add
						</div>
						<div
							style={{
								fontFamily: "'Space Grotesk',sans-serif",
								fontWeight: 600,
								fontSize: 26,
								color: P.accent
							}}
						>
							1.4 kg
						</div>
					</div>
					{[
						['Pool volume', '50,000 L'],
						['Raise FC by', '2.2 ppm'],
						['Cal-Hypo @ 65%', '×0.6 g/m³']
					].map(([k, v]) => (
						<div
							key={k}
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								fontSize: 13,
								padding: '4px 0',
								color: P.ink2
							}}
						>
							<span>{k}</span>
							<span style={{ color: P.ink, fontFamily: "'Space Grotesk',sans-serif" }}>{v}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function FixPlan({ P }) {
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
			<NavHeader P={P} title="Fix plan" sub="2 actions · ~10 min" />
			<div style={{ flex: 1, overflow: 'hidden', padding: '14px 16px 0' }}>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						background: `${P.accent}12`,
						borderRadius: 13,
						padding: '11px 13px',
						marginBottom: 14
					}}
				>
					<div style={{ color: P.accent, flexShrink: 0 }}>
						<Icon name="wave" size={20} sw={1.8} />
					</div>
					<div style={{ fontSize: 13, color: P.ink, lineHeight: 1.3 }}>
						Do both and your water's <b>balanced</b>. Grab everything in one trip.
					</div>
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
					<ActionCard
						P={P}
						color={P.st.low}
						icon="beaker"
						title="Raise free chlorine"
						range="0.8 → 3.0 ppm"
						dose="Add 1.4 kg"
						product="Cal-Hypo 65%"
						expanded
					/>
					<ActionCard
						P={P}
						color={P.st.high}
						icon="drop"
						title="Lower pH"
						range="7.8 → 7.4"
						dose="Add 680 g"
						product="Dry acid"
					/>
					<ActionCard
						P={P}
						color={P.st.ok}
						icon="wave"
						title="Alkalinity"
						range="90 ppm · in range"
						done
					/>
				</div>
				<div
					onClick={() => window.__nav && window.__nav('whatyoullneed')}
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 7,
						marginTop: 16,
						color: P.accent,
						fontWeight: 700,
						fontSize: 14,
						cursor: 'pointer'
					}}
				>
					<Icon name="beaker" size={17} sw={1.8} />
					What you'll need to buy
					<Icon name="chevron" size={14} c={P.accent} sw={2.2} />
				</div>
			</div>
			<div style={{ padding: '10px 16px 12px', flexShrink: 0 }}>
				<div
					onClick={() => window.__nav && window.__nav('home')}
					style={{
						background: P.accent,
						color: '#fff',
						textAlign: 'center',
						padding: '15px',
						borderRadius: 15,
						fontWeight: 700,
						fontSize: 16,
						cursor: 'pointer'
					}}
				>
					Mark all done
				</div>
			</div>
			<TabBar P={P} active="home" />
		</div>
	);
}

// ── product picker bottom sheet ──────────────────────────────────────
function ProductPicker({ P }) {
	const opts = [
		['Cal-Hypo 65%', '1.4 kg', true],
		['Liquid chlorine 12.5%', '8.2 L', false],
		['Dichlor 56%', '1.6 kg', false],
		['Trichlor tabs', 'not for shock', false, true]
	];
	return (
		<div
			style={{
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				background: P.page,
				fontFamily: "'Manrope',sans-serif",
				position: 'relative'
			}}
		>
			<NavHeader P={P} title="Fix plan" sub="2 actions · ~10 min" />
			<div style={{ flex: 1, overflow: 'hidden', padding: '14px 16px 0', opacity: 0.5 }}>
				<div
					style={{
						height: 60,
						background: P.card,
						borderRadius: 18,
						boxShadow: P.shadow,
						marginBottom: 11
					}}
				/>
				<div style={{ height: 60, background: P.card, borderRadius: 18, boxShadow: P.shadow }} />
			</div>
			{/* scrim */}
			<div
				onClick={() => window.__nav && window.__nav('__back')}
				style={{
					position: 'absolute',
					inset: 0,
					background: 'rgba(8,20,28,.35)',
					cursor: 'pointer'
				}}
			/>
			{/* sheet */}
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					bottom: 0,
					background: P.card,
					borderRadius: '26px 26px 0 0',
					padding: '10px 18px 34px',
					boxShadow: '0 -8px 30px rgba(0,0,0,.18)'
				}}
			>
				<div
					style={{
						width: 40,
						height: 5,
						borderRadius: 999,
						background: P.line,
						margin: '0 auto 14px'
					}}
				/>
				<div
					style={{
						fontFamily: "'Space Grotesk',sans-serif",
						fontWeight: 600,
						fontSize: 19,
						color: P.ink,
						marginBottom: 3
					}}
				>
					Chlorine product
				</div>
				<div style={{ fontSize: 12.5, color: P.ink2, marginBottom: 12 }}>
					Amount updates to match what you use
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					{opts.map(([n, amt, on, dis]) => (
						<div
							key={n}
							onClick={() => !dis && window.__nav && window.__nav('__back')}
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								padding: '13px 14px',
								borderRadius: 14,
								background: on ? `${P.accent}12` : P.page,
								border: on ? `1.5px solid ${P.accent}` : `1.5px solid ${P.line}`,
								opacity: dis ? 0.5 : 1,
								cursor: dis ? 'default' : 'pointer'
							}}
						>
							<div>
								<div style={{ fontWeight: 700, fontSize: 15, color: P.ink }}>{n}</div>
								<div
									style={{
										fontSize: 12.5,
										color: on ? P.accent : P.ink2,
										marginTop: 1,
										fontFamily: dis ? "'Manrope',sans-serif" : "'Space Grotesk',sans-serif",
										fontWeight: on ? 700 : 500
									}}
								>
									{dis ? amt : `Add ${amt}`}
								</div>
							</div>
							{on && (
								<div
									style={{
										width: 24,
										height: 24,
										borderRadius: 999,
										background: P.accent,
										display: 'grid',
										placeItems: 'center',
										color: '#fff',
										fontWeight: 800,
										fontSize: 13
									}}
								>
									✓
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

// ── what you'll need (totals, no inventory) ──────────────────────────
function WhatYoullNeed({ P }) {
	const items = [
		['Cal-Hypo 65% shock', '1.4 kg', 'beaker'],
		['Dry acid (pH Down)', '680 g', 'drop'],
		['Clarifier', '120 mL', 'wave']
	];
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
			<NavHeader P={P} title="What you'll need" sub="For today's fix" />
			<div style={{ flex: 1, overflow: 'hidden', padding: '16px 16px 0' }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
					{items.map(([n, amt, ic], i) => (
						<div
							key={i}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 13,
								background: P.card,
								borderRadius: 16,
								padding: '14px 15px',
								boxShadow: P.shadow
							}}
						>
							<div
								style={{
									width: 40,
									height: 40,
									borderRadius: 11,
									background: `${P.accent}15`,
									display: 'grid',
									placeItems: 'center',
									color: P.accent,
									flexShrink: 0
								}}
							>
								<Icon name={ic} size={20} sw={1.8} />
							</div>
							<div style={{ flex: 1, fontWeight: 700, fontSize: 15.5, color: P.ink }}>
								{n}
								{i === 2 && (
									<span style={{ fontSize: 12, color: P.ink2, fontWeight: 500 }}> optional</span>
								)}
							</div>
							<span
								style={{
									fontFamily: "'Space Grotesk',sans-serif",
									fontWeight: 600,
									fontSize: 19,
									color: P.ink
								}}
							>
								{amt}
							</span>
						</div>
					))}
				</div>
				<div
					style={{
						display: 'flex',
						gap: 10,
						alignItems: 'flex-start',
						background: P.card,
						border: `1px dashed ${P.ink2}55`,
						borderRadius: 14,
						padding: '13px 14px',
						marginTop: 14
					}}
				>
					<div style={{ color: P.ink2, flexShrink: 0, marginTop: 1 }}>
						<Icon name="alert" size={18} sw={1.8} />
					</div>
					<div style={{ fontSize: 12.5, color: P.ink2, lineHeight: 1.35 }}>
						Amounts assume the products in your plan. We don't track your shelf — tap any dose to
						switch brand or strength.
					</div>
				</div>
			</div>
			<div style={{ padding: '10px 16px 12px', flexShrink: 0 }}>
				<div
					onClick={() => window.__nav && window.__nav('__back')}
					style={{
						background: P.accent,
						color: '#fff',
						textAlign: 'center',
						padding: '15px',
						borderRadius: 15,
						fontWeight: 700,
						fontSize: 16,
						cursor: 'pointer'
					}}
				>
					Back to fix plan
				</div>
			</div>
			<TabBar P={P} active="home" />
		</div>
	);
}

Object.assign(window, { FixPlan, ProductPicker, WhatYoullNeed });
