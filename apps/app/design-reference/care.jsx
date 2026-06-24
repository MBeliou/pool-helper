// hifi-care.jsx — hi-fi Care route: home (issues) + diagnose wizard + issue timeline
const { Icon, REF_L, REF_D, NavHeader, TabBar } = window;
const cc = (P, s) => P.st[s] || P.accent;

// symptom line-icons (inline so we can draw what the icon set lacks)
function SymptomGlyph({ kind, c }) {
	const p = {
		fill: 'none',
		stroke: c,
		strokeWidth: 1.7,
		strokeLinecap: 'round',
		strokeLinejoin: 'round'
	};
	const S = (children) => (
		<svg width="26" height="26" viewBox="0 0 24 24">
			{children}
		</svg>
	);
	switch (kind) {
		case 'cloudy':
			return S(
				<path
					{...p}
					d="M7 17.5h9a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 5.6 11 3.2 3.2 0 0 0 6.5 17.5Z"
				/>
			);
		case 'green':
			return S(
				<path
					{...p}
					d="M12 3.5c3.2 3.7 5.5 6.3 5.5 9.2A5.5 5.5 0 0 1 6.5 12.7c0-2.9 2.3-5.5 5.5-9.2Z"
				/>
			);
		case 'algae':
			return S(
				<g {...p}>
					<path d="M5 19c0-7.5 5.5-12 13-12 0 7.5-4.7 13-13 12Z" />
					<path d="M5.5 18.5c2.7-3.6 5.5-5.6 8.5-6.5" />
				</g>
			);
		case 'eye':
			return S(
				<g {...p}>
					<path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" />
					<circle cx="12" cy="12" r="2.7" />
				</g>
			);
		case 'smell':
			return S(
				<g {...p}>
					<path d="M7 16c2-1 2-3 0-4s-2-3 0-4" />
					<path d="M12 16c2-1 2-3 0-4s-2-3 0-4" />
					<path d="M17 16c2-1 2-3 0-4s-2-3 0-4" />
				</g>
			);
		case 'foam':
			return S(
				<g {...p}>
					<circle cx="8" cy="15" r="3.2" />
					<circle cx="16" cy="13" r="2.3" />
					<circle cx="13" cy="17.5" r="1.6" />
				</g>
			);
		default:
			return null;
	}
}

// ════════════════ CARE HOME ════════════════
function CareHome({ P }) {
	const probs = [
		{ t: 'Cloudy water', age: 'Day 2 of ~3', prog: 0.4, c: 'high', sub: 'Next: run pump 24h' },
		{ t: 'Rising pH', age: '3 weeks', prog: 0.2, c: 'high', sub: 'Recurring · new plaster' },
		{ t: 'Algae bloom', age: 'May 28', prog: 1, c: 'ok', sub: 'Resolved · took 4 days', done: true }
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
			<div style={{ flexShrink: 0, padding: '0 18px' }}>
				<div style={{ height: 54 }} />
				<div style={{ padding: '4px 0 14px' }}>
					<div
						style={{
							fontFamily: "'Space Grotesk',sans-serif",
							fontWeight: 600,
							fontSize: 28,
							color: P.ink,
							letterSpacing: -0.5
						}}
					>
						Pool care
					</div>
					<div style={{ fontSize: 13.5, color: P.ink2, marginTop: 1 }}>
						Issues you're working through
					</div>
				</div>
			</div>
			<div style={{ flex: 1, overflow: 'hidden', padding: '0 18px' }}>
				{/* diagnose CTA */}
				<div
					onClick={() => window.__nav && window.__nav('diag1')}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 13,
						background: P.accent,
						borderRadius: 18,
						padding: '15px 16px',
						marginBottom: 20,
						cursor: 'pointer'
					}}
				>
					<div
						style={{
							width: 40,
							height: 40,
							borderRadius: 12,
							background: 'rgba(255,255,255,.2)',
							display: 'grid',
							placeItems: 'center',
							color: '#fff',
							flexShrink: 0
						}}
					>
						<Icon name="shield" size={22} sw={1.8} />
					</div>
					<div style={{ flex: 1 }}>
						<div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>Diagnose an issue</div>
						<div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.85)' }}>
							Cloudy, green, irritation…
						</div>
					</div>
					<Icon name="plus" size={22} c="#fff" sw={2.2} />
				</div>
				<div
					style={{
						fontFamily: "'Space Grotesk',sans-serif",
						fontWeight: 600,
						fontSize: 16,
						color: P.ink,
						marginBottom: 11
					}}
				>
					Active · 2
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
					{probs.map((p, i) => (
						<div
							key={i}
							onClick={() => window.__nav && window.__nav('timeline')}
							style={{
								background: P.card,
								borderRadius: 16,
								padding: '13px 15px',
								boxShadow: P.shadow,
								opacity: p.done ? 0.7 : 1,
								cursor: 'pointer'
							}}
						>
							<div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
								<div
									style={{
										width: 11,
										height: 11,
										borderRadius: 999,
										background: cc(P, p.c),
										marginTop: 4,
										flexShrink: 0
									}}
								/>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'baseline',
											gap: 8
										}}
									>
										<span
											style={{ fontWeight: 700, fontSize: 15.5, color: p.done ? P.ink2 : P.ink }}
										>
											{p.t}
										</span>
										<span
											style={{ fontSize: 11.5, color: P.ink2, whiteSpace: 'nowrap', flexShrink: 0 }}
										>
											{p.age}
										</span>
									</div>
									<div style={{ fontSize: 12.5, color: P.ink2, marginTop: 1 }}>{p.sub}</div>
									{!p.done && (
										<div
											style={{ height: 5, background: P.line, borderRadius: 999, marginTop: 10 }}
										>
											<div
												style={{
													width: `${p.prog * 100}%`,
													height: '100%',
													background: cc(P, p.c),
													borderRadius: 999
												}}
											/>
										</div>
									)}
								</div>
								{p.done && (
									<div style={{ color: P.st.ok, flexShrink: 0 }}>
										<Icon name="shield" size={18} sw={1.9} />
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
			<TabBar P={P} active="shield" />
		</div>
	);
}

// ── diagnose wizard chrome ───────────────────────────────────────────
function WizHeader({ P, step, title, sub }) {
	return (
		<div style={{ flexShrink: 0, padding: '0 18px' }}>
			<div style={{ height: 54 }} />
			<div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '2px 0 14px' }}>
				<div
					onClick={() => window.__nav && window.__nav('care')}
					style={{
						width: 34,
						height: 34,
						borderRadius: 999,
						background: P.card,
						boxShadow: P.shadow,
						display: 'grid',
						placeItems: 'center',
						flexShrink: 0,
						cursor: 'pointer'
					}}
				>
					<Icon name="close" size={17} c={P.ink} sw={2} />
				</div>
				<div style={{ flex: 1, display: 'flex', gap: 5 }}>
					{[1, 2, 3, 4].map((s) => (
						<div
							key={s}
							style={{
								flex: 1,
								height: 5,
								borderRadius: 999,
								background: s <= step ? P.accent : P.line
							}}
						/>
					))}
				</div>
			</div>
			<div style={{ paddingBottom: 4 }}>
				<div
					style={{
						fontFamily: "'Space Grotesk',sans-serif",
						fontWeight: 600,
						fontSize: 25,
						color: P.ink,
						letterSpacing: -0.4
					}}
				>
					{title}
				</div>
				{sub && <div style={{ fontSize: 13, color: P.ink2, marginTop: 4 }}>{sub}</div>}
			</div>
		</div>
	);
}
function WizFooter({ P, next, back = true, primary = true, to }) {
	return (
		<div style={{ flexShrink: 0, display: 'flex', gap: 12, padding: '12px 18px 36px' }}>
			{back && (
				<div
					onClick={() => window.__nav && window.__nav('__back')}
					style={{
						padding: '15px 22px',
						borderRadius: 15,
						fontWeight: 700,
						fontSize: 16,
						color: P.ink2,
						background: P.card,
						boxShadow: P.shadow,
						cursor: 'pointer'
					}}
				>
					Back
				</div>
			)}
			<div
				onClick={() => to && window.__nav && window.__nav(to)}
				style={{
					flex: 1,
					textAlign: 'center',
					padding: '15px',
					borderRadius: 15,
					fontWeight: 700,
					fontSize: 16,
					color: primary ? '#fff' : P.ink,
					background: primary ? P.accent : P.card,
					boxShadow: primary ? 'none' : P.shadow,
					cursor: 'pointer'
				}}
			>
				{next}
			</div>
		</div>
	);
}

// ════════════════ DIAGNOSE 1 · SYMPTOMS ════════════════
function DiagSymptoms({ P }) {
	const sym = [
		['cloudy', 'Cloudy', true],
		['green', 'Green tint'],
		['algae', 'Algae'],
		['eye', 'Eye sting'],
		['smell', 'Strong smell'],
		['foam', 'Foamy']
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
			<WizHeader P={P} step={1} title="What do you notice?" sub="Pick all that apply" />
			<div style={{ flex: 1, overflow: 'hidden', padding: '16px 18px 0' }}>
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
					{sym.map(([k, lb, on]) => (
						<div
							key={k}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 12,
								background: on ? `${P.accent}10` : P.card,
								borderRadius: 16,
								padding: '16px 15px',
								boxShadow: on ? 'none' : P.shadow,
								border: on ? `2px solid ${P.accent}` : '2px solid transparent',
								position: 'relative'
							}}
						>
							<div style={{ color: on ? P.accent : P.ink2 }}>
								<SymptomGlyph kind={k} c={on ? P.accent : P.ink2} />
							</div>
							<span style={{ fontWeight: 700, fontSize: 15, color: on ? P.accent : P.ink }}>
								{lb}
							</span>
							{on && (
								<div
									style={{
										position: 'absolute',
										top: 9,
										right: 9,
										width: 19,
										height: 19,
										borderRadius: 999,
										background: P.accent,
										color: '#fff',
										display: 'grid',
										placeItems: 'center',
										fontSize: 11,
										fontWeight: 800
									}}
								>
									✓
								</div>
							)}
						</div>
					))}
				</div>
			</div>
			<WizFooter P={P} next="Next →" back={false} to="diag2" />
		</div>
	);
}

// ════════════════ DIAGNOSE 2 · CLARIFY ════════════════
function DiagClarify({ P }) {
	const qs = [
		['Milky-white or hazy-blue?', ['Milky white', 'Hazy blue'], 0],
		['Shocked in the last 48h?', ['Yes', 'No', 'Not sure'], 1],
		['How long like this?', ['<1 day', '2–4 days', 'A week+'], 1]
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
			<WizHeader P={P} step={2} title="A few details" sub="Cloudy water" />
			<div style={{ flex: 1, overflow: 'hidden', padding: '18px 18px 0' }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
					{qs.map(([q, opts, sel]) => (
						<div key={q}>
							<div style={{ fontSize: 15.5, fontWeight: 700, color: P.ink, marginBottom: 10 }}>
								{q}
							</div>
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
								{opts.map((o, i) => (
									<div
										key={o}
										style={{
											padding: '10px 16px',
											borderRadius: 999,
											fontSize: 14,
											fontWeight: i === sel ? 700 : 500,
											background: i === sel ? `${P.accent}15` : P.card,
											color: i === sel ? P.accent : P.ink,
											border: i === sel ? `1.5px solid ${P.accent}` : `1.5px solid ${P.line}`,
											boxShadow: i === sel ? 'none' : P.shadow
										}}
									>
										{o}
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
			<WizFooter P={P} next="Next →" to="diag3" />
		</div>
	);
}

// ════════════════ DIAGNOSE 3 · FRESH TEST GATE ════════════════
function DiagTest({ P }) {
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
			<WizHeader P={P} step={3} title="Test first?" sub="Cloudy water" />
			<div style={{ flex: 1, overflow: 'hidden', padding: '18px 18px 0' }}>
				<div
					style={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: 12,
						background: `${P.st.high}16`,
						border: `1px solid ${P.st.high}40`,
						borderRadius: 15,
						padding: '14px 15px',
						marginBottom: 22
					}}
				>
					<div style={{ color: P.st.high, flexShrink: 0, marginTop: 1 }}>
						<Icon name="alert" size={20} sw={1.9} />
					</div>
					<div style={{ fontSize: 13.5, color: P.ink, lineHeight: 1.35 }}>
						Your last test is <b>3 days old</b>. Diagnosing on stale numbers can point us the wrong
						way.
					</div>
				</div>
				<div
					style={{
						fontSize: 12.5,
						fontWeight: 700,
						color: P.ink2,
						textTransform: 'uppercase',
						letterSpacing: 0.5,
						marginBottom: 10
					}}
				>
					Recommended
				</div>
				<div
					onClick={() => window.__nav && window.__nav('diag4')}
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 9,
						background: P.accent,
						color: '#fff',
						padding: '16px',
						borderRadius: 15,
						fontWeight: 700,
						fontSize: 16,
						marginBottom: 18,
						cursor: 'pointer'
					}}
				>
					<Icon name="plus" size={20} c="#fff" sw={2.2} />
					Log a fresh test
				</div>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 12,
						color: P.ink2,
						fontSize: 12.5,
						marginBottom: 18
					}}
				>
					<div style={{ flex: 1, height: 1, background: P.line }} />
					or
					<div style={{ flex: 1, height: 1, background: P.line }} />
				</div>
				<div
					onClick={() => window.__nav && window.__nav('diag4')}
					style={{
						textAlign: 'center',
						padding: '15px',
						borderRadius: 15,
						fontWeight: 700,
						fontSize: 15,
						color: P.ink,
						background: P.card,
						boxShadow: P.shadow,
						cursor: 'pointer'
					}}
				>
					Continue with test from Jun 6
				</div>
			</div>
			<WizFooter P={P} next="" back={true} primary={false} />
		</div>
	);
}

// ════════════════ DIAGNOSE 4 · RANKED CAUSES ════════════════
function DiagCauses({ P }) {
	const causes = [
		{ t: 'Low chlorine + high pH', p: 'Most likely', pct: 78, c: 'low', fix: 'Shock + lower pH' },
		{ t: 'Weak filtration', p: 'Possible', pct: 41, c: 'high', fix: 'Run pump 8h+' },
		{ t: 'High calcium hardness', p: 'Less likely', pct: 18, c: 'info', fix: 'Partial drain' }
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
			<WizHeader P={P} step={4} title="Likely causes" sub="Based on a fresh test · ranked" />
			<div style={{ flex: 1, overflow: 'hidden', padding: '16px 18px 0' }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
					{causes.map((c, i) => (
						<div
							key={i}
							style={{
								background: i === 0 ? `${P.accent}0d` : P.card,
								borderRadius: 16,
								padding: '14px 15px',
								boxShadow: i === 0 ? 'none' : P.shadow,
								border: i === 0 ? `1.5px solid ${P.accent}` : '1.5px solid transparent'
							}}
						>
							<div
								style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
							>
								<span
									style={{
										fontSize: 11.5,
										fontWeight: 800,
										color: cc(P, c.c),
										textTransform: 'uppercase',
										letterSpacing: 0.5
									}}
								>
									{c.p}
								</span>
								<span
									style={{
										fontFamily: "'Space Grotesk',sans-serif",
										fontWeight: 600,
										fontSize: 17,
										color: cc(P, c.c)
									}}
								>
									{c.pct}%
								</span>
							</div>
							<div style={{ fontWeight: 700, fontSize: 15.5, color: P.ink, margin: '4px 0 8px' }}>
								{c.t}
							</div>
							<div style={{ height: 6, background: P.line, borderRadius: 999 }}>
								<div
									style={{
										width: `${c.pct}%`,
										height: '100%',
										background: cc(P, c.c),
										borderRadius: 999
									}}
								/>
							</div>
							<div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
								<span style={{ fontSize: 12.5, color: P.ink2 }}>Fix:</span>
								<span style={{ fontSize: 12.5, fontWeight: 700, color: P.ink }}>{c.fix}</span>
							</div>
						</div>
					))}
				</div>
			</div>
			<WizFooter P={P} next="Start a fix plan →" to="timeline" />
		</div>
	);
}

// ════════════════ ISSUE TIMELINE ════════════════
function CareTimeline({ P }) {
	const log = [
		{ t: 'Shocked to 10 ppm FC', when: 'Mon · 9:00am', done: true },
		{ t: 'Re-tested · FC holding 6 ppm', when: 'Mon · 6:00pm', done: true },
		{ t: 'Pump running 24h', when: 'In progress', active: true },
		{ t: 'Add clarifier + vacuum', when: 'Day 3 · upcoming' }
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
			<NavHeader
				P={P}
				title="Cloudy water"
				sub="Started Mon · Day 2 of ~3"
				right={
					<span
						style={{
							fontFamily: "'Space Grotesk',sans-serif",
							fontWeight: 700,
							fontSize: 13,
							color: P.accent,
							background: `${P.accent}15`,
							padding: '6px 11px',
							borderRadius: 999
						}}
					>
						40%
					</span>
				}
			/>
			<div style={{ flex: 1, overflow: 'hidden', padding: '14px 18px 0' }}>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 11,
						background: `${P.st.ok}14`,
						border: `1px solid ${P.st.ok}33`,
						borderRadius: 14,
						padding: '12px 14px',
						marginBottom: 18
					}}
				>
					<div style={{ color: P.st.ok, flexShrink: 0 }}>
						<Icon name="trend" size={20} sw={1.9} />
					</div>
					<div style={{ fontSize: 13, color: P.ink, lineHeight: 1.3 }}>
						<b>Improving.</b> Clarity up since the shock — on track to clear by Wed.
					</div>
				</div>
				<div
					style={{
						fontFamily: "'Space Grotesk',sans-serif",
						fontWeight: 600,
						fontSize: 16,
						color: P.ink,
						marginBottom: 14
					}}
				>
					Timeline
				</div>
				<div style={{ display: 'flex', flexDirection: 'column' }}>
					{log.map((l, i) => (
						<div
							key={i}
							style={{
								display: 'flex',
								gap: 13,
								position: 'relative',
								paddingBottom: i < log.length - 1 ? 18 : 0
							}}
						>
							{i < log.length - 1 && (
								<div
									style={{
										position: 'absolute',
										left: 10,
										top: 22,
										bottom: 0,
										width: 2,
										background: P.line
									}}
								/>
							)}
							<div
								style={{
									width: 22,
									height: 22,
									borderRadius: 999,
									flexShrink: 0,
									zIndex: 1,
									display: 'grid',
									placeItems: 'center',
									background: l.done ? P.st.ok : l.active ? P.accent : P.card,
									border:
										l.active || (!l.done && !l.active)
											? `2px solid ${l.active ? P.accent : P.line}`
											: 'none',
									color: '#fff',
									fontSize: 12,
									fontWeight: 800,
									boxShadow: l.active ? `0 0 0 4px ${P.accent}22` : 'none'
								}}
							>
								{l.done ? '✓' : ''}
							</div>
							<div style={{ flex: 1, paddingTop: 1 }}>
								<div
									style={{
										fontSize: 14.5,
										fontWeight: l.active ? 700 : 500,
										color: l.done ? P.ink2 : P.ink
									}}
								>
									{l.t}
								</div>
								<div style={{ fontSize: 12, color: l.active ? P.accent : P.ink2, marginTop: 1 }}>
									{l.when}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
			<div style={{ flexShrink: 0, display: 'flex', gap: 12, padding: '10px 18px 12px' }}>
				<div
					onClick={() => window.__nav && window.__nav('care')}
					style={{
						flex: 1,
						textAlign: 'center',
						padding: '14px',
						borderRadius: 15,
						fontWeight: 700,
						fontSize: 15,
						color: P.ink,
						background: P.card,
						boxShadow: P.shadow,
						cursor: 'pointer'
					}}
				>
					Mark resolved
				</div>
				<div
					onClick={() => window.__nav && window.__nav('logpick')}
					style={{
						flex: 1,
						textAlign: 'center',
						padding: '14px',
						borderRadius: 15,
						fontWeight: 700,
						fontSize: 15,
						color: '#fff',
						background: P.accent,
						cursor: 'pointer'
					}}
				>
					Log re-test
				</div>
			</div>
			<TabBar P={P} active="shield" />
		</div>
	);
}

Object.assign(window, { CareHome, DiagSymptoms, DiagClarify, DiagTest, DiagCauses, CareTimeline });
