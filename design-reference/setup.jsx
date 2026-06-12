// hifi-setup.jsx — hi-fi onboarding flow (welcome → shape → size → details → units → done)
const { Icon, REF_L, REF_D } = window;

// ── shared onboarding chrome ─────────────────────────────────────────
function Progress({ P, step, of = 4 }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: of }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i < step ? P.accent : P.line }} />
      ))}
    </div>
  );
}
function OnbTop({ P, step, label }) {
  return (
    <div style={{ flexShrink: 0, padding: "0 22px" }}>
      <div style={{ height: 60 }} />
      <Progress P={P} step={step} />
      <div style={{ fontSize: 12.5, color: P.ink2, marginTop: 8, fontWeight: 600 }}>{label}</div>
    </div>
  );
}
function OnbFooter({ P, next, back = true }) {
  return (
    <div style={{ flexShrink: 0, display: "flex", gap: 12, padding: "12px 22px 34px" }}>
      {back && <div onClick={() => window.__nav && window.__nav("__back")} style={{ padding: "15px 22px", borderRadius: 15, fontWeight: 700, fontSize: 16, color: P.ink2, background: P.card, boxShadow: P.shadow, cursor: "pointer" }}>Back</div>}
      <div onClick={() => window.__nav && window.__nav("__onbnext")} style={{ flex: 1, textAlign: "center", padding: "15px", borderRadius: 15, fontWeight: 700, fontSize: 16, color: "#fff", background: P.accent, cursor: "pointer" }}>{next}</div>
    </div>
  );
}
function Title({ P, children, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 27, color: P.ink, letterSpacing: -0.5, lineHeight: 1.1 }}>{children}</div>
      {sub && <div style={{ fontSize: 13.5, color: P.ink2, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}
function Pill({ P, on, children }) {
  return (
    <div style={{
      padding: "9px 15px", borderRadius: 999, fontSize: 14, fontWeight: on ? 700 : 500,
      background: on ? `${P.accent}15` : P.card, color: on ? P.accent : P.ink,
      border: on ? `1.5px solid ${P.accent}` : `1.5px solid ${P.line}`, boxShadow: on ? "none" : P.shadow, whiteSpace: "nowrap",
    }}>{children}</div>
  );
}
const Body = ({ children }) => <div style={{ flex: 1, overflow: "hidden", padding: "20px 22px 0" }}>{children}</div>;

// ── 0 · WELCOME ──────────────────────────────────────────────────────
function Welcome({ P }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: P.grad, color: "#fff", fontFamily: "'Manrope',sans-serif", position: "relative", overflow: "hidden" }}>
      {/* faint concentric water rings */}
      <svg viewBox="0 0 402 402" style={{ position: "absolute", top: -60, right: -120, width: 420, opacity: 0.13 }}>
        {[180, 140, 100, 60].map((r) => <circle key={r} cx="201" cy="201" r={r} fill="none" stroke="#fff" strokeWidth="2" />)}
      </svg>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 30px", position: "relative" }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.3)", display: "grid", placeItems: "center", marginBottom: 26 }}>
          <Icon name="drop" size={32} c="#fff" sw={1.8} />
        </div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 38, letterSpacing: -1, lineHeight: 1.0 }}>Pool<br />Handler</div>
        <div style={{ fontSize: 17, opacity: 0.9, marginTop: 16, lineHeight: 1.4, maxWidth: 280 }}>Test, know, and fix your water in minutes — no guesswork, no pool-store trips.</div>
      </div>
      <div style={{ flexShrink: 0, padding: "0 22px 40px", position: "relative" }}>
        <div onClick={() => window.__nav && window.__nav("__onbnext")} style={{ background: "#fff", color: P.accent, textAlign: "center", padding: "16px", borderRadius: 15, fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Set up my pool →</div>
        <div onClick={() => window.__nav && window.__nav("home")} style={{ textAlign: "center", marginTop: 16, fontSize: 14, opacity: 0.85, fontWeight: 600, cursor: "pointer" }}>I'll do it later</div>
      </div>
    </div>
  );
}

// ── 1 · SHAPE ────────────────────────────────────────────────────────
function ShapeGlyph({ kind, color }) {
  const base = { width: 50, height: 34, border: `2.5px solid ${color}`, background: "transparent" };
  if (kind === "round") return <div style={{ ...base, width: 34, height: 34, borderRadius: "50%" }} />;
  if (kind === "oval") return <div style={{ ...base, borderRadius: "50%" }} />;
  if (kind === "kidney") return <div style={{ ...base, borderRadius: "45% 45% 55% 55% / 60% 60% 40% 40%" }} />;
  if (kind === "free") return <div style={{ ...base, borderRadius: "62% 38% 50% 55% / 55% 48% 60% 50%" }} />;
  if (kind === "L") return <div style={{ width: 38, height: 38, border: `2.5px solid ${color}`, clipPath: "polygon(0 0,60% 0,60% 55%,100% 55%,100% 100%,0 100%)" }} />;
  return <div style={{ ...base, borderRadius: 6 }} />;
}
function Shape({ P }) {
  const shapes = [["rect", "Rectangle"], ["oval", "Oval", true], ["round", "Round"], ["kidney", "Kidney"], ["L", "L-shape"], ["free", "Freeform"]];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: P.page, fontFamily: "'Manrope',sans-serif" }}>
      <OnbTop P={P} step={1} label="Step 1 of 4 · Shape" />
      <Body>
        <Title P={P} sub="Closest match — it drives the volume math">What shape is<br />your pool?</Title>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 11 }}>
          {shapes.map(([k, lb, on]) => (
            <div key={k} style={{ background: on ? `${P.accent}10` : P.card, borderRadius: 18, padding: "16px 6px 11px", boxShadow: on ? "none" : P.shadow, border: on ? `2px solid ${P.accent}` : "2px solid transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ height: 40, display: "grid", placeItems: "center" }}><ShapeGlyph kind={k} color={on ? P.accent : P.ink2} /></div>
              <span style={{ fontSize: 12.5, fontWeight: on ? 700 : 600, color: on ? P.accent : P.ink }}>{lb}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: P.ink2, marginTop: 16, textAlign: "center" }}>Freeform or odd shape? You'll just type the volume next.</div>
      </Body>
      <OnbFooter P={P} next="Next →" />
    </div>
  );
}

// ── 2 · SIZE ─────────────────────────────────────────────────────────
function Size({ P }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: P.page, fontFamily: "'Manrope',sans-serif" }}>
      <OnbTop P={P} step={2} label="Step 2 of 4 · Size" />
      <Body>
        <Title P={P}>How much<br />water?</Title>
        {/* segmented */}
        <div style={{ display: "flex", background: P.card, borderRadius: 14, padding: 4, boxShadow: P.shadow, marginBottom: 20 }}>
          <div style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 10, background: P.accent, color: "#fff", fontWeight: 700, fontSize: 14 }}>I know my volume</div>
          <div style={{ flex: 1, textAlign: "center", padding: "10px", color: P.ink2, fontWeight: 600, fontSize: 14 }}>Calculate it</div>
        </div>
        <div style={{ fontSize: 13, color: P.ink2, marginBottom: 7, fontWeight: 600 }}>Total volume</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: P.card, border: `2px solid ${P.accent}`, borderRadius: 15, padding: "14px 16px", boxShadow: P.shadow }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 30, color: P.ink }}>50,000</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 700, color: P.ink2, background: P.page, border: `1px solid ${P.line}`, padding: "7px 11px", borderRadius: 10 }}>litres<Icon name="chevron" size={13} c={P.ink2} sw={2.2} style={{ transform: "rotate(90deg)" }} /></span>
        </div>
        <div style={{ display: "flex", gap: 11, alignItems: "flex-start", background: P.card, border: `1px dashed ${P.ink2}55`, borderRadius: 14, padding: "13px 14px", marginTop: 16 }}>
          <div style={{ color: P.accent, flexShrink: 0, marginTop: 1 }}><Icon name="alert" size={18} sw={1.8} /></div>
          <div style={{ fontSize: 12.5, color: P.ink2, lineHeight: 1.35 }}>Don't know it? Switch to <b style={{ color: P.ink }}>Calculate it</b> and we'll work it out from length × width × depth.</div>
        </div>
      </Body>
      <OnbFooter P={P} next="Next →" />
    </div>
  );
}

// ── 3 · DETAILS ──────────────────────────────────────────────────────
function Details({ P }) {
  const groups = [
    ["Surface", [["Plaster", true], ["Vinyl"], ["Fibreglass"], ["Tile"]]],
    ["Sanitiser", [["Chlorine", true], ["Salt (SWG)"], ["Bromine"]]],
    ["Filter media", [["Sand", true], ["Glass"], ["Cartridge"], ["D.E."], ["Cotton balls"]]],
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: P.page, fontFamily: "'Manrope',sans-serif" }}>
      <OnbTop P={P} step={3} label="Step 3 of 4 · Pool details" />
      <Body>
        <Title P={P} sub="These change the chemistry advice">A few<br />specifics</Title>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {groups.map(([g, opts]) => (
            <div key={g}>
              <div style={{ fontSize: 13, color: P.ink2, fontWeight: 700, marginBottom: 9 }}>{g}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {opts.map(([o, on]) => <Pill key={o} P={P} on={on}>{o}</Pill>)}
              </div>
            </div>
          ))}
        </div>
      </Body>
      <OnbFooter P={P} next="Next →" />
    </div>
  );
}

// ── 4 · UNITS ────────────────────────────────────────────────────────
function Units({ P }) {
  const rows = [["Volume", "Litres · gal · m³", "Litres"], ["Hardness / Alk", "ppm · °fH · °dH", "°fH"], ["Temperature", "°C · °F", "°C"]];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: P.page, fontFamily: "'Manrope',sans-serif" }}>
      <OnbTop P={P} step={4} label="Step 4 of 4 · Units" />
      <Body>
        <Title P={P} sub="So readings & doses match your kit">Units &<br />region</Title>
        <div style={{ fontSize: 13, color: P.ink2, fontWeight: 700, marginBottom: 9 }}>Quick preset</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          <Pill P={P}>US</Pill><Pill P={P}>UK / Imperial</Pill><Pill P={P} on>Metric (most of world)</Pill>
        </div>
        <div style={{ background: P.card, borderRadius: 16, boxShadow: P.shadow, overflow: "hidden" }}>
          {rows.map(([l, opts, v], i) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 15px", borderTop: i ? `1px solid ${P.line}` : "none" }}>
              <div><div style={{ fontSize: 15, color: P.ink, fontWeight: 600 }}>{l}</div><div style={{ fontSize: 11.5, color: P.ink2 }}>{opts}</div></div>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13.5, fontWeight: 700, color: P.ink, background: P.page, border: `1px solid ${P.line}`, padding: "7px 11px", borderRadius: 10 }}>{v}<Icon name="chevron" size={12} c={P.ink2} sw={2.2} style={{ transform: "rotate(90deg)" }} /></span>
            </div>
          ))}
        </div>
      </Body>
      <OnbFooter P={P} next="Finish setup ✓" />
    </div>
  );
}

// ── 5 · DONE ─────────────────────────────────────────────────────────
function Done({ P }) {
  const facts = [["Shape", "Oval"], ["Volume", "50,000 L"], ["Sanitiser", "Chlorine"], ["Filter", "Sand"]];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: P.page, fontFamily: "'Manrope',sans-serif" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 30px", textAlign: "center" }}>
        <div style={{ width: 76, height: 76, borderRadius: 999, background: `${P.st.ok}1a`, display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
          <div style={{ width: 52, height: 52, borderRadius: 999, background: P.st.ok, display: "grid", placeItems: "center", color: "#fff", fontSize: 28, fontWeight: 800 }}>✓</div>
        </div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 28, color: P.ink, letterSpacing: -0.5 }}>You're all set!</div>
        <div style={{ fontSize: 14, color: P.ink2, marginTop: 8, marginBottom: 24 }}>Here's your pool. Log your first test whenever you're ready.</div>
        <div style={{ background: P.card, borderRadius: 18, boxShadow: P.shadow, overflow: "hidden", textAlign: "left" }}>
          {facts.map(([k, v], i) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "13px 16px", borderTop: i ? `1px solid ${P.line}` : "none" }}>
              <span style={{ fontSize: 14, color: P.ink2 }}>{k}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: P.ink, fontFamily: "'Space Grotesk',sans-serif" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flexShrink: 0, padding: "0 22px 40px" }}>
        <div onClick={() => window.__nav && window.__nav("home")} style={{ background: P.accent, color: "#fff", textAlign: "center", padding: "16px", borderRadius: 15, fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Go to my pool →</div>
      </div>
    </div>
  );
}

Object.assign(window, { Welcome, Shape, Size, Details, Units, Done });
