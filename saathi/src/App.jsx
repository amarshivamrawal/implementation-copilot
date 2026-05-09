import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#07091a",
  surface: "#0d1225",
  card: "#111827",
  border: "#1e2d4a",
  accent: "#4d8eff",
  accentDim: "rgba(77,142,255,0.15)",
  accentBorder: "rgba(77,142,255,0.3)",
  purple: "#9b6dff",
  purpleDim: "rgba(155,109,255,0.15)",
  teal: "#00d4b4",
  tealDim: "rgba(0,212,180,0.12)",
  text: "#e8eeff",
  textMid: "#8899bb",
  textDim: "#3d4f6e",
  rec: "#ff4060",
  recDim: "rgba(255,64,96,0.2)",
  success: "#00c87a",
  successDim: "rgba(0,200,122,0.15)",
  amber: "#ffaa00",
  amberDim: "rgba(255,170,0,0.15)",
  danger: "#ff4444",
  dangerDim: "rgba(255,68,68,0.12)",
};

const emotionConfig = {
  positive: { color: C.success, bg: C.successDim, label: "Positive" },
  excited: { color: C.teal, bg: C.tealDim, label: "Excited" },
  focused: { color: C.accent, bg: C.accentDim, label: "Focused" },
  neutral: { color: C.amber, bg: C.amberDim, label: "Neutral" },
  concerned: { color: "#ff8c00", bg: "rgba(255,140,0,0.15)", label: "Concerned" },
  negative: { color: C.danger, bg: C.dangerDim, label: "Negative" },
};

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const Tag = ({ label, color, bg }) => (
  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: bg, color, letterSpacing: 0.3 }}>
    {label}
  </span>
);

const Spinner = ({ color }) => (
  <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${color || C.accent}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
);

const Pulse = ({ active }) => (
  <div style={{ position: "relative", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
    {active && [1, 2, 3].map((i) => (
      <div key={i} style={{
        position: "absolute", width: "100%", height: "100%", borderRadius: "50%",
        border: `2px solid ${C.rec}`,
        animation: `pulsering ${1 + i * 0.4}s ease-out infinite`,
        animationDelay: `${i * 0.3}s`, opacity: 0,
      }} />
    ))}
    <div style={{
      width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
      background: active ? C.recDim : C.accentDim,
      border: `2px solid ${active ? C.rec : C.accent}`,
      fontSize: 30, cursor: "pointer", transition: "all 0.3s ease",
    }}>
      🎙️
    </div>
  </div>
);

/* ─── API Key Setup Screen ─── */
function SetupScreen({ onSave }) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const save = () => {
    if (!key.trim().startsWith("sk-ant-")) {
      setErr("Key should start with sk-ant-…");
      return;
    }
    localStorage.setItem("saathi_api_key", key.trim());
    onSave(key.trim());
  };

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: C.bg, color: C.text, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🤝</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>Saathi</div>
      <div style={{ fontSize: 14, color: C.textMid, marginBottom: 36, textAlign: "center" }}>Your AI companion, always there</div>

      <div style={{ width: "100%", maxWidth: 380, background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Enter your Anthropic API Key</div>
        <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20, lineHeight: 1.6 }}>
          Saathi uses Claude AI to analyze your conversations. Get your free key at{" "}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: C.accent }}>console.anthropic.com</a>
        </div>

        <div style={{ position: "relative", marginBottom: 12 }}>
          <input
            type={show ? "text" : "password"}
            value={key}
            onChange={e => { setKey(e.target.value); setErr(""); }}
            placeholder="sk-ant-api03-..."
            onKeyDown={e => e.key === "Enter" && save()}
            style={{
              width: "100%", padding: "12px 44px 12px 14px", borderRadius: 10,
              border: `1px solid ${err ? C.danger : C.border}`,
              background: C.surface, color: C.text, fontSize: 14, outline: "none",
              fontFamily: "'JetBrains Mono', monospace",
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={() => setShow(s => !s)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.textMid, cursor: "pointer", fontSize: 16, padding: 4 }}
          >{show ? "🙈" : "👁️"}</button>
        </div>

        {err && <div style={{ fontSize: 12, color: C.danger, marginBottom: 12 }}>{err}</div>}

        <button
          onClick={save}
          disabled={!key.trim()}
          style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
            background: key.trim() ? C.accent : C.accentDim,
            color: key.trim() ? "#fff" : C.textDim,
            fontSize: 15, fontWeight: 700, cursor: key.trim() ? "pointer" : "default",
          }}
        >Start using Saathi →</button>

        <div style={{ fontSize: 11, color: C.textDim, marginTop: 14, textAlign: "center" }}>
          Your key is stored locally only. Never shared.
        </div>
      </div>
    </div>
  );
}

/* ─── Main App ─── */
export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("saathi_api_key") || "");
  const [tab, setTab] = useState("record");
  const [recording, setRecording] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [liveText, setLiveText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [timer, setTimer] = useState(0);
  const [memories, setMemories] = useState(() => {
    try { return JSON.parse(localStorage.getItem("saathi_memories") || "[]"); } catch { return []; }
  });
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [askMsgs, setAskMsgs] = useState([{ role: "ai", text: "Hey! I'm Saathi 🤝 Your AI companion, always here. Ask me anything about your past conversations and I'll help you recall, track action items, and surface what matters." }]);
  const [askInput, setAskInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [toast, setToast] = useState(null);

  const recogRef = useRef(null);
  const timerRef = useRef(null);
  const finalRef = useRef("");
  const timerValRef = useRef(0);
  const askEndRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      body { margin: 0; padding: 0; }
      @keyframes pulsering { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.8);opacity:0} }
      @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      @keyframes spin { to{transform:rotate(360deg)} }
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
      input, textarea, button { font-family: inherit; }
      input::placeholder { color: ${C.textDim}; }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    localStorage.setItem("saathi_memories", JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    askEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [askMsgs]);

  if (!apiKey) return <SetupScreen onSave={setApiKey} />;

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const callClaude = async (messages, system) => {
    const body = { model: "claude-sonnet-4-6", max_tokens: 1000, messages };
    if (system) body.system = system;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error?.message || "API error");
    }
    const d = await res.json();
    return d.content[0].text;
  };

  const startRec = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast("Use Chrome or Edge for speech support", "error"); return; }
    finalRef.current = ""; timerValRef.current = 0;
    setFinalText(""); setLiveText(""); setTimer(0);
    const r = new SR();
    r.continuous = true; r.interimResults = true;
    r.lang = navigator.language?.startsWith("en") ? navigator.language : "en-US";
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let interim = "", fin = finalRef.current;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript + " ";
        else interim = e.results[i][0].transcript;
      }
      finalRef.current = fin; setFinalText(fin); setLiveText(interim);
    };
    r.onerror = (e) => { if (e.error !== "no-speech" && e.error !== "aborted") showToast("Mic error: " + e.error, "error"); };
    r.onend = () => { if (recogRef.current === r) { try { r.start(); } catch(_) {} } };
    r.start();
    recogRef.current = r; setRecording(true);
    timerRef.current = setInterval(() => { timerValRef.current += 1; setTimer(t => t + 1); }, 1000);
  };

  const stopRec = () => {
    const r = recogRef.current;
    recogRef.current = null;
    r?.stop();
    clearInterval(timerRef.current);
    setRecording(false); setLiveText("");
  };

  const analyze = async () => {
    const text = finalRef.current.trim();
    if (!text) { showToast("Nothing to analyze yet!", "error"); return; }
    setAnalyzing(true);
    try {
      const raw = await callClaude([{
        role: "user",
        content: `Analyze this transcript. Reply ONLY with valid JSON, zero markdown:\n{"title":"concise title max 6 words","summary":"2-3 sentence summary","emotion":"one of: positive,excited,focused,neutral,concerned,negative","keyTopics":["topic1","topic2","topic3"],"actionItems":["action1","action2"],"sentiment":75}\n\nTranscript:\n${text}`
      }]);
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/,"").trim();
      const a = JSON.parse(cleaned);
      const mem = { id: Date.now(), ts: new Date().toISOString(), dur: timerValRef.current, transcript: text, ...a };
      setMemories(prev => [mem, ...prev]);
      finalRef.current = ""; setFinalText(""); setTimer(0);
      showToast("Saved to memory! 🧠", "success");
      setTab("memories");
    } catch (e) {
      showToast(e.message || "Analysis failed", "error");
    } finally { setAnalyzing(false); }
  };

  const deleteMemory = (id) => {
    setMemories(prev => prev.filter(m => m.id !== id));
    if (selected?.id === id) setSelected(null);
    showToast("Deleted", "info");
  };

  const ask = async () => {
    if (!askInput.trim() || asking) return;
    const q = askInput.trim();
    setAskInput("");
    const newMsgs = [...askMsgs, { role: "user", text: q }];
    setAskMsgs(newMsgs); setAsking(true);
    try {
      const ctx = memories.slice(0, 15).map(m =>
        `[${new Date(m.ts).toLocaleDateString("en-IN")}] "${m.title}" (${fmt(m.dur)})\nSummary: ${m.summary}\nTopics: ${m.keyTopics?.join(", ")}\nActions: ${m.actionItems?.join(", ")}`
      ).join("\n\n");
      const response = await callClaude(
        newMsgs.filter(m => m.role !== "ai" || newMsgs[0] !== m).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
        `You are Saathi, a warm and friendly AI companion always available to help. You have access to the user's conversation memories. Answer like a trusted friend who remembers everything. Be concise, warm, and direct.\n\nMemories:\n${ctx || "No memories stored yet."}`
      );
      setAskMsgs([...newMsgs, { role: "ai", text: response }]);
    } catch (e) {
      setAskMsgs([...newMsgs, { role: "ai", text: "Connection error. Check your API key and try again." }]);
    }
    setAsking(false);
  };

  const filtered = memories.filter(m =>
    !search ||
    m.title?.toLowerCase().includes(search.toLowerCase()) ||
    m.summary?.toLowerCase().includes(search.toLowerCase()) ||
    m.keyTopics?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const ec = (e) => emotionConfig[e] || emotionConfig.neutral;

  const TABS = [
    { id: "record", icon: "🎙️", label: "Record" },
    { id: "memories", icon: "🧠", label: "Memories" },
    { id: "ask", icon: "💬", label: "Ask" },
  ];

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: C.bg, color: C.text, height: "100vh", display: "flex", flexDirection: "column", maxWidth: 430, margin: "0 auto", position: "relative", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "14px 20px 10px", background: C.surface, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>🤝 Saathi</div>
            <div style={{ fontSize: 11, color: C.textMid, fontWeight: 500, marginTop: 1 }}>Your AI companion, always there</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ background: C.accentDim, color: C.accent, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20, border: `1px solid ${C.accentBorder}` }}>
              {memories.length} {memories.length === 1 ? "memory" : "memories"}
            </div>
            <button
              onClick={() => { if (confirm("Reset API key?")) { localStorage.removeItem("saathi_api_key"); setApiKey(""); } }}
              title="Reset API Key"
              style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 16, padding: 4 }}
            >⚙️</button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "absolute", top: 70, left: 16, right: 16, zIndex: 99,
          padding: "11px 16px", borderRadius: 12, fontSize: 13, fontWeight: 500,
          background: toast.type === "success" ? C.successDim : toast.type === "error" ? C.dangerDim : C.accentDim,
          color: toast.type === "success" ? C.success : toast.type === "error" ? C.danger : C.accent,
          border: `1px solid ${toast.type === "success" ? C.success : toast.type === "error" ? C.danger : C.accent}30`,
          animation: "fadeIn 0.2s ease", pointerEvents: "none",
        }}>{toast.msg}</div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

        {/* ─── RECORD TAB ─── */}
        {tab === "record" && (
          <div style={{ padding: "28px 20px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginTop: 12 }}>
              <div onClick={recording ? stopRec : startRec}>
                <Pulse active={recording} />
              </div>
              {recording && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.rec }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 500, color: C.rec, letterSpacing: 2 }}>{fmt(timer)}</span>
                </div>
              )}
              <div style={{ fontSize: 14, color: C.textMid, fontWeight: 500 }}>
                {recording ? "Tap to stop recording" : "Tap to start recording"}
              </div>
            </div>

            {(finalText || liveText || recording) && (
              <div style={{ width: "100%", background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, animation: "fadeIn 0.3s ease" }}>
                <div style={{ fontSize: 11, color: C.textMid, fontWeight: 600, marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>Live Transcript</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.7, color: C.text, maxHeight: 180, overflowY: "auto" }}>
                  {finalText}
                  {liveText && <span style={{ color: C.textMid }}>{liveText}</span>}
                  {!finalText && !liveText && recording && <span style={{ color: C.textDim }}>Listening...</span>}
                </div>
              </div>
            )}

            {finalText && !recording && (
              <button
                onClick={analyze}
                disabled={analyzing}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
                  background: analyzing ? C.accentDim : C.accent,
                  color: analyzing ? C.accent : "#fff",
                  fontSize: 15, fontWeight: 700, cursor: analyzing ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  animation: "fadeIn 0.3s ease",
                }}
              >
                {analyzing ? <><Spinner color={C.accent} /> Analyzing...</> : "✨ Analyze & Save to Memory"}
              </button>
            )}

            {!recording && !finalText && (
              <div style={{ width: "100%", padding: 20, background: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>How Saathi works</div>
                {["🎙️  Tap record and speak naturally", "🤖  Saathi transcribes in real-time", "🧠  AI analyses emotions, topics & actions", "💬  Ask Saathi anything about your past"].map((s, i) => (
                  <div key={i} style={{ fontSize: 13, color: C.textMid, padding: "6px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none" }}>{s}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── MEMORIES TAB ─── */}
        {tab === "memories" && !selected && (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search memories..."
                style={{ width: "100%", padding: "11px 16px 11px 40px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 14, outline: "none" }}
              />
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.textMid }}>🔍</span>
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: C.textMid }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{search ? "No matches found" : "No memories yet"}</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>{search ? "Try a different keyword" : "Record your first conversation to get started"}</div>
              </div>
            )}

            {filtered.map(m => {
              const cfg = ec(m.emotion);
              return (
                <div key={m.id} onClick={() => setSelected(m)} style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "14px 16px", cursor: "pointer", animation: "fadeIn 0.3s ease" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text, flex: 1, paddingRight: 8 }}>{m.title || "Untitled"}</div>
                    <Tag label={cfg.label} color={cfg.color} bg={cfg.bg} />
                  </div>
                  <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, marginBottom: 10 }}>{m.summary}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {m.keyTopics?.slice(0, 3).map((t, i) => (
                      <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: C.accentDim, color: C.accent, fontWeight: 500 }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 11, color: C.textDim }}>
                      {new Date(m.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {fmt(m.dur)}
                    </div>
                    {m.actionItems?.length > 0 && <span style={{ fontSize: 11, color: C.amber, fontWeight: 600 }}>📋 {m.actionItems.length} actions</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── MEMORY DETAIL ─── */}
        {tab === "memories" && selected && (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn 0.25s ease" }}>
            <button onClick={() => setSelected(null)} style={{ alignSelf: "flex-start", background: C.card, border: `1px solid ${C.border}`, color: C.textMid, padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer" }}>← Back</button>

            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{selected.title}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <Tag label={ec(selected.emotion).label} color={ec(selected.emotion).color} bg={ec(selected.emotion).bg} />
                <span style={{ fontSize: 12, color: C.textDim }}>{new Date(selected.ts).toLocaleString("en-IN")} · {fmt(selected.dur)}</span>
              </div>
              <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.7 }}>{selected.summary}</div>
            </div>

            {selected.actionItems?.length > 0 && (
              <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.amber, letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase" }}>📋 Action Items</div>
                {selected.actionItems.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", borderBottom: i < selected.actionItems.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <span style={{ color: C.accent, marginTop: 1 }}>→</span>
                    <span style={{ fontSize: 14, color: C.text, lineHeight: 1.5 }}>{a}</span>
                  </div>
                ))}
              </div>
            )}

            {selected.keyTopics?.length > 0 && (
              <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.textMid, letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase" }}>Key Topics</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {selected.keyTopics.map((t, i) => (
                    <span key={i} style={{ fontSize: 13, padding: "4px 12px", borderRadius: 20, background: C.accentDim, color: C.accent, fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textMid, letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase" }}>Full Transcript</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.8, color: C.textMid, maxHeight: 200, overflowY: "auto" }}>{selected.transcript}</div>
            </div>

            <button onClick={() => deleteMemory(selected.id)} style={{ padding: 12, borderRadius: 12, border: `1px solid ${C.danger}30`, background: C.dangerDim, color: C.danger, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              🗑️ Delete Memory
            </button>
          </div>
        )}

        {/* ─── ASK TAB ─── */}
        {tab === "ask" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
              {askMsgs.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12, animation: "fadeIn 0.3s ease" }}>
                  <div style={{
                    maxWidth: "82%", padding: "12px 16px",
                    borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: m.role === "user" ? C.accent : C.card,
                    border: m.role === "user" ? "none" : `1px solid ${C.border}`,
                    color: m.role === "user" ? "#fff" : C.text,
                    fontSize: 14, lineHeight: 1.6,
                  }}>{m.text}</div>
                </div>
              ))}
              {asking && (
                <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
                  <div style={{ padding: "14px 18px", borderRadius: "18px 18px 18px 4px", background: C.card, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent, animation: `pulsering ${0.8 + i * 0.2}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={askEndRef} />
            </div>

            <div style={{ padding: "12px 16px 16px", background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", gap: 10 }}>
              <input
                value={askInput}
                onChange={e => setAskInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && ask()}
                placeholder="Ask Saathi anything..."
                style={{ flex: 1, padding: "12px 16px", borderRadius: 24, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 14, outline: "none" }}
              />
              <button
                onClick={ask}
                disabled={asking || !askInput.trim()}
                style={{
                  width: 44, height: 44, borderRadius: "50%", border: "none",
                  background: asking || !askInput.trim() ? C.card : C.accent,
                  color: asking || !askInput.trim() ? C.textDim : "#fff",
                  fontSize: 20, cursor: asking ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >↑</button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ display: "flex", background: C.surface, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); if (t.id === "memories") setSelected(null); }}
            style={{
              flex: 1, padding: "10px 0 12px", background: "none", border: "none",
              color: tab === t.id ? C.accent : C.textMid,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 400 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
