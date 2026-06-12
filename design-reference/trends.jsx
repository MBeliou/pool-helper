// hifi-trends.jsx — hi-fi Trends: overview index → per-parameter detail with tips
const { Icon, REF_L, REF_D, NavHeader, TabBar } = window;
const tc = (P, s) => P.st[s] || P.accent;

// ── hi-fi area/line chart ────────────────────────────────────────────
function HChart({ P, series, color, h = 150, band, dots, lastLabel, gid }) {
  const W = 320, padX = 6, padY = 14;
  const n = series.length;
  const x = (i) => padX + (i / (n - 1)) * (W - padX * 2);
  const y = (v) => padY + (1 - v) * (h - padY * 2);
  const pts = series.map((v, i) => ({ x: x(i), y: y(v) }));
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < n; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2, my = (pts[i - 1].y + pts[i].y) / 2;
    d += ` Q ${pts[i - 1].x},${pts[i - 1].y} ${mx},${my}`;
  }
  d += ` L ${pts[n - 1].x},${pts[n - 1].y}`;
  const fill = `${d} L ${pts[n - 1].x},${h} L ${pts[0].x},${h} Z`;
  const last = pts[n - 1];
  const bandTop = y(0.62), bandBot = y(0.32);
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.22" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      {band && <rect x="0" y={bandTop} width={W} height={bandBot - bandTop} fill={P.st.ok} opacity="0.10" />}
      {band && [bandTop, bandBot].map((yy, i) => <line key={i} x1="0" y1={yy} x2={W} y2={yy} stroke={P.st.ok} strokeWidth="1" strokeDasharray="2 4" opacity="0.5" vectorEffect="non-scaling-stroke" />)}
      <path d={fill} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {dots && <circle cx={last.x} cy={last.y} r="4.5" fill={color} stroke={P.card} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

const SERIES = [
  { key: "ph", label: "pH", value: "7.8", status: "high", note: "creeping up", dir: "up", s: [0.50, 0.50, 0.55, 0.58, 0.62, 0.66, 0.72, 0.74, 0.78, 0.82] },
  { key: "fc", label: "Free Cl", value: "0.8", status: "low", note: "dropping", dir: "down", s: [0.70, 0.62, 0.55, 0.50, 0.45, 0.40, 0.36, 0.33, 0.31, 0.28] },
  { key: "ta", label: "Alkalinity", value: "90", status: "ok", note: "steady", dir: "flat", s: [0.50, 0.52, 0.48, 0.50, 0.51, 0.49, 0.50, 0.50, 0.49, 0.50] },
  { key: "cya", label: "CYA", value: "45", status: "ok", note: "steady", dir: "flat", s: [0.55, 0.55, 0.58, 0.57, 0.60, 0.59, 0.60, 0.60, 0.59, 0.60] },
];

// ════════════════ TRENDS INDEX ════════════════
function TrendsIndex({ P }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: P.page, fontFamily: "'Manrope',sans-serif" }}>
      <div style={{ flexShrink: 0, padding: "0 18px" }}>
        <div style={{ height: 54 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0 14px" }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 28, color: P.ink, letterSpacing: -0.5 }}>Trends</div>
            <div style={{ fontSize: 13.5, color: P.ink2, marginTop: 1 }}>Tap a reading to dig in</div>
          </div>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color: P.ink, background: P.card, boxShadow: P.shadow, padding: "9px 13px", borderRadius: 999 }}>30 days<Icon name="chevron" size={13} c={P.ink2} sw={2.2} style={{ transform: "rotate(90deg)" }} /></span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden", padding: "0 18px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {SERIES.map((r) => (
            <div key={r.key} onClick={() => window.__nav && window.__nav("trenddetail")} style={{ display: "flex", alignItems: "center", gap: 12, background: P.card, borderRadius: 16, padding: "13px 15px", boxShadow: P.shadow, cursor: "pointer" }}>
              <div style={{ width: 86, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: tc(P, r.status) }} />
                  <span style={{ fontWeight: 700, fontSize: 14.5, color: P.ink }}>{r.label}</span>
                </div>
                <div style={{ fontSize: 11.5, color: P.ink2, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                  {r.dir !== "flat" && <Icon name={r.dir === "up" ? "arrowUp" : "arrowDn"} size={12} c={tc(P, r.status)} sw={2.4} />}{r.note}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0, height: 38 }}><HChart P={P} series={r.s} color={tc(P, r.status)} h={38} gid={`spk-${r.key}`} /></div>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 18, color: P.ink, width: 38, textAlign: "right", flexShrink: 0 }}>{r.value}</span>
              <Icon name="chevron" size={15} c={P.ink2} sw={2} />
            </div>
          ))}
        </div>
      </div>
      <TabBar P={P} active="wave" />
    </div>
  );
}

// ════════════════ TRENDS DETAIL ════════════════
function TrendsDetail({ P }) {
  const ph = SERIES[0];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: P.page, fontFamily: "'Manrope',sans-serif" }}>
      <NavHeader P={P} title="pH" sub="Avg 7.5 · trending up ↗"
        right={<span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: P.ink, background: P.card, boxShadow: P.shadow, padding: "7px 11px", borderRadius: 999 }}>30d<Icon name="chevron" size={12} c={P.ink2} sw={2.2} style={{ transform: "rotate(90deg)" }} /></span>} />
      <div style={{ flex: 1, overflow: "hidden", padding: "14px 16px 0" }}>
        {/* range segmented */}
        <div style={{ display: "flex", gap: 6, background: P.card, borderRadius: 12, padding: 4, boxShadow: P.shadow, marginBottom: 14 }}>
          {["7d", "30d", "90d", "1y"].map((r, i) => (
            <div key={r} style={{ flex: 1, textAlign: "center", padding: "8px", borderRadius: 9, fontSize: 13, fontWeight: i === 1 ? 700 : 600, background: i === 1 ? P.accent : "transparent", color: i === 1 ? "#fff" : P.ink2 }}>{r}</div>
          ))}
        </div>
        {/* chart */}
        <div style={{ background: P.card, borderRadius: 18, padding: "14px 14px 10px", boxShadow: P.shadow, marginBottom: 13 }}>
          <HChart P={P} series={ph.s} color={P.st.high} h={132} band dots gid="detail-ph" />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: P.ink2, marginTop: 6 }}>
            <span>May 9</span><span>May 24</span><span>Jun 8</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11.5, color: P.ink2 }}>
            <span style={{ width: 14, height: 8, borderRadius: 3, background: `${P.st.ok}33`, border: `1px dashed ${P.st.ok}` }} />Ideal range 7.2–7.6
          </div>
        </div>
        {/* stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 13 }}>
          {[["Low", "7.2", P.ink], ["High", "7.9", P.st.high], ["Now", "7.8", P.ink]].map(([k, v, c]) => (
            <div key={k} style={{ flex: 1, background: P.card, borderRadius: 14, padding: "11px 8px", boxShadow: P.shadow, textAlign: "center" }}>
              <div style={{ fontSize: 11.5, color: P.ink2 }}>{k}</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 22, color: c, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
        {/* tip card */}
        <div style={{ background: `${P.accent}0d`, border: `1px solid ${P.accent}26`, borderRadius: 16, padding: "14px 15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: `${P.accent}1f`, display: "grid", placeItems: "center", color: P.accent }}><Icon name="spark" size={16} sw={1.9} /></div>
            <span style={{ fontWeight: 800, fontSize: 14.5, color: P.ink }}>Why this happens</span>
          </div>
          <div style={{ fontSize: 13, color: P.ink2, lineHeight: 1.4 }}>Fresh plaster leaches lime for ~12 months, nudging pH up about 0.1 a week. Expect frequent small acid doses early on — it settles.</div>
        </div>
      </div>
      <TabBar P={P} active="wave" />
    </div>
  );
}

Object.assign(window, { TrendsIndex, TrendsDetail });
