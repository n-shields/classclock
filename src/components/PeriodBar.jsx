import { useState, useRef, useEffect } from "react";
import LZString from "lz-string";
import ScheduleEditor from "./ScheduleEditor";
import { THEMES, THEME_KEYS } from "../data/themes";
import "./PeriodBar.css";

function collectData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith("classclock_")) continue;
    const v = localStorage.getItem(k);
    if (v !== null) try { data[k] = JSON.parse(v); } catch (_) { data[k] = v; }
  }
  return data;
}

function doExport() {
  const data = collectData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `classclock-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function encodeData(data) {
  return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}

export default function PeriodBar({
  schedules, onSchedulesChange,
  scheduleType, onScheduleTypeChange,
  scheduleDays, onScheduleDaysChange,
  currentPeriodIndex, nextPeriodIndex, onPeriodSelect,
  autoMode, onAutoModeChange,
  currentTheme, onThemeChange,
  onImport,
}) {
  const [editorOpen,   setEditorOpen]   = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [linkCopied,   setLinkCopied]   = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileRef  = useRef(null);
  const menuRef  = useRef(null);
  const btnRef   = useRef(null);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  };

  const doShareLink = () => {
    try {
      const encoded = encodeData(collectData());
      const url = new URL(window.location.href);
      url.searchParams.set("s", encoded);
      navigator.clipboard.writeText(url.toString()).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
      });
    } catch (e) {
      alert("Could not copy link: " + e.message);
    }
  };

  const periods       = schedules[scheduleType] || [];
  const scheduleNames = Object.keys(schedules);

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        Object.entries(data).forEach(([k, v]) => {
          if (!k.startsWith("classclock_") || v == null) return;
          localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
        });
        onImport?.();
      } catch (err) {
        alert("Could not read file: " + err.message);
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <>
      {/* Floating menu button */}
      <button
        ref={btnRef}
        className={`pb-menu-btn ${menuOpen ? "pb-menu-btn--open" : ""}`}
        onClick={() => setMenuOpen(o => !o)}
        title="Menu"
      >☰</button>

      {/* Popup panel */}
      {menuOpen && (
        <div className="pb-menu" ref={menuRef}>

          <div className="pb-section">
            <div className="pb-section-label">Schedule</div>
            <div className="pb-row">
              <select
                className="tb-select"
                value={scheduleType}
                onChange={e => onScheduleTypeChange(e.target.value)}
              >
                {scheduleNames.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                className={`btn btn-sm ${autoMode ? "btn-primary" : "btn-ghost"}`}
                onClick={() => onAutoModeChange(!autoMode)}
                title="Auto-detect period from time"
              >Auto</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditorOpen(true)}>Edit</button>
            </div>
          </div>

          <div className="pb-section">
            <div className="pb-section-label">Period</div>
            <div className="pb-periods">
              {periods.map((p, i) => {
                const isActive = i === currentPeriodIndex;
                const isNext   = !isActive && autoMode && currentPeriodIndex === -1 && i === nextPeriodIndex;
                return (
                  <button
                    key={p.id}
                    className={`btn btn-sm period-btn ${isActive ? "period-btn-active" : isNext ? "period-btn-next" : "btn-ghost"}`}
                    onClick={() => { onPeriodSelect(i); setMenuOpen(false); }}
                    title={`${p.start}–${p.end}`}
                  >{p.label}</button>
                );
              })}
            </div>
          </div>

          <div className="pb-section">
            <div className="pb-section-label">Theme</div>
            <div className="pb-themes">
              {THEME_KEYS.map(key => (
                <button
                  key={key}
                  className={`tb-theme-dot ${currentTheme === key ? "tb-theme-dot--active" : ""}`}
                  style={{ background: THEMES[key]?.swatch }}
                  onClick={() => onThemeChange(key)}
                  title={THEMES[key]?.name}
                />
              ))}
            </div>
          </div>

          <div className="pb-section pb-actions">
            <button className="btn btn-ghost btn-sm" onClick={doExport} title="Export data">↓ Export</button>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()} title="Import data">↑ Import</button>
            <button
              className={`btn btn-sm ${linkCopied ? "btn-primary" : "btn-ghost"}`}
              onClick={doShareLink}
            >{linkCopied ? "✓ Copied" : "↗ Share"}</button>
            <button
              className={`btn btn-sm ${isFullscreen ? "btn-primary" : "btn-ghost"}`}
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >⛶</button>
          </div>

        </div>
      )}

      <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImportFile} />

      {editorOpen && (
        <ScheduleEditor
          schedules={schedules}
          onChange={onSchedulesChange}
          scheduleDays={scheduleDays}
          onScheduleDaysChange={onScheduleDaysChange}
          scheduleType={scheduleType}
          onScheduleTypeChange={onScheduleTypeChange}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </>
  );
}
