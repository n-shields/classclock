import { useState, useEffect, useCallback } from "react";
import DateWidget from "./components/DateWidget";
import ClockWidget from "./components/ClockWidget";
import PeriodBar from "./components/PeriodBar";
import TileLayout from "./components/TileLayout";
import { loadSchedules, saveSchedules, loadScheduleDays, saveScheduleDays, getScheduleForToday, detectCurrentPeriod, detectNextPeriod } from "./data/schedules";
import { loadLayout, saveLayout } from "./data/layout";
import { applyTheme } from "./data/themes";
import "./App.css";

const TILE_NAMES = { date: "Clock", clock: "Timer" };

function loadScheduleType() {
  return localStorage.getItem("classclock_schedule_type") || "Regular";
}
function loadGlobalTheme() {
  return localStorage.getItem("classclock_global_theme") || "midnight";
}

export default function App() {
  const [schedules, setSchedules]       = useState(loadSchedules);
  const [scheduleDays, setScheduleDays] = useState(loadScheduleDays);
  const [scheduleType, setScheduleType] = useState(() => {
    const loaded = loadSchedules();
    const days   = loadScheduleDays();
    const candidate = getScheduleForToday(days) || loadScheduleType();
    return (candidate && candidate in loaded) ? candidate : (Object.keys(loaded)[0] ?? "Regular");
  });
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(-1);
  const [nextPeriodIndex,    setNextPeriodIndex]    = useState(-1);
  const [autoMode, setAutoMode]         = useState(true);
  const [globalTheme, setGlobalTheme]   = useState(loadGlobalTheme);
  const [layout, setLayout]             = useState(loadLayout);

  const periods       = schedules[scheduleType] || [];
  const currentPeriod = currentPeriodIndex >= 0 ? periods[currentPeriodIndex] : null;
  const nextPeriod    = nextPeriodIndex    >= 0 ? periods[nextPeriodIndex]    : null;

  useEffect(() => { applyTheme(globalTheme); }, [globalTheme]);

  // Schedule auto-selection on day change
  useEffect(() => {
    let lastDay = new Date().getDay();
    const id = setInterval(() => {
      const today = new Date().getDay();
      if (today !== lastDay) {
        lastDay = today;
        const next = getScheduleForToday(scheduleDays);
        if (next) {
          setScheduleType(next);
          localStorage.setItem("classclock_schedule_type", next);
        }
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [scheduleDays]);

  // Period detection
  useEffect(() => {
    if (!autoMode) return;
    const detect = () => {
      setCurrentPeriodIndex(detectCurrentPeriod(periods));
      setNextPeriodIndex(detectNextPeriod(periods));
    };
    detect();
    const id = setInterval(detect, 30_000);
    return () => clearInterval(id);
  }, [autoMode, periods]);

  useEffect(() => {
    if (autoMode) {
      setCurrentPeriodIndex(detectCurrentPeriod(periods));
      setNextPeriodIndex(detectNextPeriod(periods));
    }
  }, [scheduleType]); // eslint-disable-line

  const handleLayoutChange = useCallback((updater) => {
    if (typeof updater === "function") {
      setLayout(prev => { const next = updater(prev); saveLayout(next); return next; });
    } else {
      setLayout(updater);
      saveLayout(updater);
    }
  }, []);

  const handleThemeChange = (theme) => {
    applyTheme(theme);
    setGlobalTheme(theme);
    localStorage.setItem("classclock_global_theme", theme);
  };

  const handleScheduleTypeChange = (type) => {
    if (type === scheduleType) return;
    setScheduleType(type);
    localStorage.setItem("classclock_schedule_type", type);
  };

  const tiles = {
    date:  <DateWidget />,
    clock: <ClockWidget currentPeriod={currentPeriod} nextPeriod={nextPeriod} collapsed={false} onToggle={() => {}} />,
  };

  return (
    <div className="app">
      <PeriodBar
        schedules={schedules}       onSchedulesChange={(s) => { setSchedules(s); saveSchedules(s); }}
        scheduleType={scheduleType} onScheduleTypeChange={handleScheduleTypeChange}
        scheduleDays={scheduleDays} onScheduleDaysChange={(d) => { setScheduleDays(d); saveScheduleDays(d); }}
        currentPeriodIndex={currentPeriodIndex}
        nextPeriodIndex={nextPeriodIndex}
        onPeriodSelect={(idx) => {
          setCurrentPeriodIndex(idx);
          setNextPeriodIndex(detectNextPeriod(periods));
          setAutoMode(false);
        }}
        autoMode={autoMode}         onAutoModeChange={setAutoMode}
        currentTheme={globalTheme}  onThemeChange={handleThemeChange}
        onImport={() => window.location.reload()}
      />
      <TileLayout
        layout={layout}
        onLayoutChange={handleLayoutChange}
        tiles={tiles}
        isCollapsed={() => false}
        onToggle={() => {}}
        tileNames={TILE_NAMES}
      />
    </div>
  );
}
