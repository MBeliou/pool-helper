// hifi-log.jsx — hi-fi Log a Test flow (pick tester → manual entry + keypad)
const { Icon, REF_L, REF_D } = window;
const lc = (P, s) => P.st[s] || P.accent;

// ── nav header for sub-screens ───────────────────────────────────────
function NavHeader({ P, title, sub, right, back = true }) {
	return (
		<div style={{ flexShrink: 0 }}>
			<div style={{ height: 54 }} />
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 12,
					padding: '4px 16px 14px',
					borderBottom: `1px solid ${P.line}`
				}}
			>
				{back && (
					<div
						onClick={() => window.__nav && window.__nav('__back')}
						style={{
							width: 38,
							height: 38,
							borderRadius: 999,
							background: P.card,
							boxShadow: P.shadow,
							display: 'grid',
							placeItems: 'center',
							flexShrink: 0,
							cursor: 'pointer'
						}}
					>
						<Icon
							name="chevron"
							size={18}
							c={P.ink}
							sw={2.2}
							style={{ transform: 'rotate(180deg)' }}
						/>
					</div>
				)}
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							fontFamily: "'Space Grotesk',sans-serif",
							fontWeight: 600,
							fontSize: 21,
							color: P.ink,
							letterSpacing: -0.3
						}}
					>
						{title}
					</div>
					{sub && (
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
					)}
				</div>
				{right}
			</div>
		</div>
	);
}

function LTabBar({ P }) {
	const tabs = [
		['home', 'Home'],
		['plus', 'Log', true],
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

// ════════════════ SCREEN 1 · PICK YOUR TESTER ════════════════
const TESTERS = [
	{ n: 'AquaChek 7-in-1', s: 'Strips · 7 reads', icon: 'beaker', on: true, last: true },
	{ n: 'Taylor K-2006', s: 'Liquid drops', icon: 'drop' },
	{ n: 'Salt meter', s: 'Digital · NaCl', icon: 'spark' }
];

function LogPick({ P }) {
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
			<NavHeader P={P} title="Log a test" sub="Which tester did you use?" />
			<div style={{ flex: 1, overflow: 'hidden', padding: '16px 16px 0' }}>
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
					{TESTERS.map((t) => (
						<div
							key={t.n}
							onClick={() => window.__nav && window.__nav('logentry')}
							style={{
								background: P.card,
								borderRadius: 18,
								padding: '14px 13px 15px',
								boxShadow: P.shadow,
								border: t.on ? `2px solid ${P.accent}` : `2px solid transparent`,
								position: 'relative',
								cursor: 'pointer'
							}}
						>
							{t.last && (
								<span
									style={{
										position: 'absolute',
										top: 11,
										right: 11,
										fontSize: 10,
										fontWeight: 700,
										color: P.accent,
										background: `${P.accent}1a`,
										padding: '3px 7px',
										borderRadius: 999
									}}
								>
									LAST USED
								</span>
							)}
							<div
								style={{
									width: 42,
									height: 42,
									borderRadius: 13,
									background: `${P.accent}17`,
									display: 'grid',
									placeItems: 'center',
									color: P.accent,
									marginBottom: 12
								}}
							>
								<Icon name={t.icon} size={22} sw={1.8} />
							</div>
							<div
								style={{
									fontFamily: "'Manrope',sans-serif",
									fontWeight: 700,
									fontSize: 15,
									color: P.ink,
									lineHeight: 1.15
								}}
							>
								{t.n}
							</div>
							<div style={{ fontSize: 12, color: P.ink2, marginTop: 2 }}>{t.s}</div>
						</div>
					))}
					{/* add a tester */}
					<div
						onClick={() => window.__nav && window.__nav('logentry')}
						style={{
							borderRadius: 18,
							border: `2px dashed ${P.ink2}66`,
							padding: '14px 13px',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							alignItems: 'center',
							gap: 8,
							color: P.ink2,
							minHeight: 116,
							cursor: 'pointer'
						}}
					>
						<div
							style={{
								width: 38,
								height: 38,
								borderRadius: 999,
								border: `2px solid ${P.ink2}66`,
								display: 'grid',
								placeItems: 'center'
							}}
						>
							<Icon name="plus" size={20} sw={2} />
						</div>
						<span style={{ fontSize: 13, fontWeight: 600 }}>Add a tester</span>
					</div>
				</div>
			</div>
			<div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
				<div
					onClick={() => window.__nav && window.__nav('logentry')}
					style={{
						background: P.accent,
						color: '#fff',
						textAlign: 'center',
						padding: '15px',
						borderRadius: 15,
						fontFamily: "'Manrope',sans-serif",
						fontWeight: 700,
						fontSize: 16,
						cursor: 'pointer'
					}}
				>
					Use AquaChek 7-in-1 →
				</div>
			</div>
			<LTabBar P={P} />
		</div>
	);
}

// ════════════════ SCREEN 2 · MANUAL ENTRY + KEYPAD ════════════════
const LOG_ROWS = [
	{ l: 'pH', a: '', v: '7.8', u: '', focus: true },
	{ l: 'Free chlorine', a: 'FC', v: '0.8', u: 'ppm' },
	{ l: 'Total alkalinity', a: 'TA', v: '90', u: 'ppm' },
	{ l: 'Calcium hardness', a: 'CH', v: '24', u: '°fH' },
	{ l: 'Cyanuric acid', a: 'CYA', v: '', u: 'ppm' }
];

function NumPad({ P, cta }) {
	const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
	// authentic iOS number-pad colours — this is the OS keyboard, not brandable
	const padBg = P.dark ? '#1c1c1e' : '#d1d4db';
	const keyBg = P.dark ? '#6a6a6c' : '#fff';
	const keyInk = P.dark ? '#fff' : '#0b0b0c';
	return (
		<div style={{ flexShrink: 0, background: padBg, paddingBottom: 28 }}>
			{/* accessory CTA bar (this part IS ours — sits above the system keypad) */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					padding: '8px 14px',
					background: P.card,
					borderTop: `1px solid ${P.line}`,
					borderBottom: `1px solid ${P.line}`
				}}
			>
				<span style={{ fontSize: 13, color: P.ink2, fontFamily: "'Manrope',sans-serif" }}>
					Blanks are fine
				</span>
				<div
					onClick={() => window.__nav && window.__nav('results')}
					style={{
						background: P.accent,
						color: '#fff',
						padding: '9px 16px',
						borderRadius: 11,
						fontWeight: 700,
						fontSize: 14,
						fontFamily: "'Manrope',sans-serif",
						whiteSpace: 'nowrap',
						cursor: 'pointer'
					}}
				>
					{cta}
				</div>
			</div>
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr 1fr',
					gap: 8,
					padding: '10px 6px 4px'
				}}
			>
				{keys.map((k) => (
					<div
						key={k}
						style={{
							height: 46,
							borderRadius: 9,
							background: k === 'del' ? 'transparent' : keyBg,
							boxShadow: k === 'del' ? 'none' : '0 1px 0 rgba(0,0,0,.18)',
							display: 'grid',
							placeItems: 'center',
							fontFamily: "'Space Grotesk',sans-serif",
							fontWeight: 500,
							fontSize: 24,
							color: keyInk
						}}
					>
						{k === 'del' ? (
							<Icon
								name="chevron"
								size={22}
								c={keyInk}
								sw={2}
								style={{ transform: 'rotate(180deg)' }}
							/>
						) : (
							k
						)}
					</div>
				))}
			</div>
		</div>
	);
}

function LogEntry({ P }) {
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
			<NavHeader
				P={P}
				title="AquaChek 7-in-1"
				sub="Tap a value to type it"
				right={
					<span
						onClick={() => window.__nav && window.__nav('log')}
						style={{ fontSize: 14, fontWeight: 700, color: P.accent, cursor: 'pointer' }}
					>
						Change
					</span>
				}
			/>
			<div style={{ flex: 1, overflow: 'hidden', padding: '13px 16px 0' }}>
				{/* too-soon warning */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 11,
						background: `${P.st.high}16`,
						border: `1px solid ${P.st.high}40`,
						borderRadius: 13,
						padding: '11px 13px',
						marginBottom: 14
					}}
				>
					<div style={{ color: P.st.high, flexShrink: 0 }}>
						<Icon name="alert" size={20} sw={1.9} />
					</div>
					<div style={{ fontSize: 12.5, color: P.ink, lineHeight: 1.3 }}>
						Last test was <b>3h ago</b> — readings may not have settled. Test anyway?
					</div>
				</div>
				{/* rows */}
				<div style={{ display: 'flex', flexDirection: 'column' }}>
					{LOG_ROWS.map((r, i) => (
						<div
							key={i}
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								padding: '12px 2px',
								borderBottom: i < LOG_ROWS.length - 1 ? `1px solid ${P.line}` : 'none'
							}}
						>
							<div style={{ minWidth: 0 }}>
								<div style={{ fontSize: 15.5, color: P.ink, fontWeight: 500 }}>{r.l}</div>
								{r.a && <div style={{ fontSize: 11.5, color: P.ink2 }}>{r.a}</div>}
							</div>
							<div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
								<div
									style={{
										minWidth: 70,
										textAlign: 'right',
										padding: '8px 12px',
										borderRadius: 11,
										border: r.focus ? `2px solid ${P.accent}` : `1.5px solid ${P.line}`,
										background: r.focus ? `${P.accent}0d` : P.card,
										fontFamily: "'Space Grotesk',sans-serif",
										fontWeight: 600,
										fontSize: 19,
										color: r.v ? P.ink : P.ink2,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'flex-end',
										gap: 1
									}}
								>
									{r.v || (r.focus ? '' : '—')}
									{r.focus && (
										<span
											style={{
												width: 2,
												height: 22,
												background: P.accent,
												display: 'inline-block',
												borderRadius: 1
											}}
										/>
									)}
								</div>
								<span style={{ fontSize: 12.5, color: P.ink2, width: 30 }}>{r.u}</span>
							</div>
						</div>
					))}
				</div>
			</div>
			<NumPad P={P} cta="Save & get advice →" />
		</div>
	);
}

Object.assign(window, { LogPick, LogEntry, NavHeader });

// generic tab bar (active = id) for reuse across hi-fi screens
function TabBar({ P, active }) {
	const tabs = [
		['home', 'Home'],
		['plus', 'Log'],
		['wave', 'Trends'],
		['shield', 'Care'],
		['grid', 'More']
	];
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
			{tabs.map(([ic, lb]) => {
				const on = ic === active;
				const map = { home: 'home', plus: 'log', wave: 'trends', shield: 'care', grid: 'more' };
				return (
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
							style={{
								fontFamily: "'Manrope',sans-serif",
								fontSize: 11,
								fontWeight: on ? 700 : 500
							}}
						>
							{lb}
						</span>
					</div>
				);
			})}
		</div>
	);
}
Object.assign(window, { TabBar });
