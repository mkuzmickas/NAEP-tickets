'use client';

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Search, Check, Square, CheckSquare, Calendar as CalIcon, List, X } from "lucide-react";
import SCHEDULE from "./ewpScheduleData.json";

const TYPE_COLORS = {
  IFC: "#D04E00",
  IFA: "#E8862E",
  IFx: "#B8560E",
  Procurement: "#1F4E79",
  Logistics: "#2E7D8A",
  Testing: "#6B4C9A",
  "Walk-down": "#5B8C3E",
  Milestone: "#6B7280",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// deterministic hue per EWP for the sidebar swatch
function ewpColor(id) {
  const n = parseInt(id, 10) || 0;
  const hue = (n * 47) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function EwpSchedule() {
  const allEwpIds = SCHEDULE.ewps.map((e) => e.id);
  const [selected, setSelected] = useState(() => new Set(allEwpIds));
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(() => new Set(Object.keys(TYPE_COLORS)));
  const [view, setView] = useState("calendar"); // calendar | list

  // find first month that has events for default position
  const firstEventDate = useMemo(() => {
    const ds = SCHEDULE.events.map((e) => e.date).sort();
    return ds.length ? parseDate(ds[0]) : new Date();
  }, []);
  const [cursor, setCursor] = useState(() => {
    // default to Nov 2026 (near project peak) if in range, else first event
    const d = new Date(2026, 10, 1);
    return d;
  });

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SCHEDULE.events.filter((e) => {
      if (!selected.has(e.ewp)) return false;
      if (!typeFilter.has(e.type)) return false;
      if (q && !(e.name.toLowerCase().includes(q) || e.ewpName.toLowerCase().includes(q) || ("ewp " + e.ewp).includes(q))) return false;
      return true;
    });
  }, [selected, typeFilter, search]);

  const eventsByDay = useMemo(() => {
    const map = {};
    for (const e of filteredEvents) {
      (map[e.date] = map[e.date] || []).push(e);
    }
    return map;
  }, [filteredEvents]);

  const ewpFilteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SCHEDULE.ewps;
    return SCHEDULE.ewps.filter((e) => e.name.toLowerCase().includes(q) || ("ewp " + e.id).includes(q));
  }, [search]);

  function toggleEwp(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function selectAll() { setSelected(new Set(allEwpIds)); }
  function selectNone() { setSelected(new Set()); }
  function soloEwp(id) { setSelected(new Set([id])); }

  function toggleType(t) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  // Build calendar grid for cursor month
  const grid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, iso, events: eventsByDay[iso] || [] });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor, eventsByDay]);

  const monthEventCount = grid.reduce((a, c) => a + (c ? c.events.length : 0), 0);

  const ewpName = (id) => (SCHEDULE.ewps.find((e) => e.id === id) || {}).name || id;

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 640, fontFamily: "system-ui, -apple-system, sans-serif", color: "#1a1a1a", background: "#fff" }}>
      {/* Sidebar */}
      <aside style={{ width: 300, flexShrink: 0, borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", background: "#fafafa" }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "#1F4E79", marginBottom: 10 }}>
            Engineering Work Plans
          </div>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 9, top: 9, color: "#9ca3af" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter EWPs & deliverables"
              style={{ width: "100%", boxSizing: "border-box", padding: "7px 8px 7px 30px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6, outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={selectAll} style={btnStyle(true)}>Select all</button>
            <button onClick={selectNone} style={btnStyle(false)}>Select none</button>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>
            {selected.size} of {allEwpIds.length} shown &middot; {filteredEvents.length} deliverables
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "6px 8px" }}>
          {ewpFilteredList.map((ewp) => {
            const on = selected.has(ewp.id);
            return (
              <div key={ewp.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderRadius: 6, cursor: "pointer", background: on ? "#fff" : "transparent" }}
                onClick={() => toggleEwp(ewp.id)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.background = on ? "#fff" : "transparent")}
              >
                {on ? <CheckSquare size={16} color="#D04E00" /> : <Square size={16} color="#c4c4c4" />}
                <span style={{ width: 10, height: 10, borderRadius: 3, background: ewpColor(ewp.id), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: on ? 600 : 400 }}>
                    <span style={{ color: "#9ca3af", fontWeight: 600, marginRight: 5 }}>{ewp.id}</span>
                    {ewp.name}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); soloEwp(ewp.id); }}
                  title="Show only this EWP"
                  style={{ fontSize: 10, color: "#1F4E79", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontWeight: 600, opacity: 0.7 }}
                >only</button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: "1px solid #e5e7eb", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} style={navBtn}><ChevronLeft size={18} /></button>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1F4E79", minWidth: 168, textAlign: "center" }}>
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </div>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} style={navBtn}><ChevronRight size={18} /></button>
            <button onClick={() => setCursor(new Date())} style={{ ...btnStyle(false), marginLeft: 6 }}>Today</button>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#6b7280", marginRight: 4 }}>{view === "calendar" ? `${monthEventCount} this month` : `${filteredEvents.length} total`}</span>
            <button onClick={() => setView("calendar")} style={toggleBtn(view === "calendar")}><CalIcon size={14} /> Calendar</button>
            <button onClick={() => setView("list")} style={toggleBtn(view === "list")}><List size={14} /> List</button>
          </div>

          {/* Type legend / filter */}
          <div style={{ width: "100%", display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
            {Object.keys(TYPE_COLORS).map((t) => {
              const on = typeFilter.has(t);
              return (
                <button key={t} onClick={() => toggleType(t)}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, padding: "3px 8px", borderRadius: 20, border: `1px solid ${on ? TYPE_COLORS[t] : "#d1d5db"}`, background: on ? TYPE_COLORS[t] + "18" : "#fff", color: on ? TYPE_COLORS[t] : "#9ca3af", cursor: "pointer", fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? TYPE_COLORS[t] : "#d1d5db" }} />
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        {view === "calendar" ? (
          <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "#e5e7eb", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
              {DOW.map((d) => (
                <div key={d} style={{ background: "#1F4E79", color: "#fff", fontSize: 11, fontWeight: 700, textAlign: "center", padding: "7px 0", letterSpacing: 0.5 }}>{d}</div>
              ))}
              {grid.map((cell, i) => (
                <div key={i} style={{ background: cell ? "#fff" : "#f9fafb", minHeight: 96, padding: cell ? 5 : 0, verticalAlign: "top" }}>
                  {cell && (
                    <>
                      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 3 }}>{cell.day}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {cell.events.slice(0, 5).map((e, j) => (
                          <div key={j} title={`EWP ${e.ewp} · ${e.ewpName}\n${e.name} (${e.type})`}
                            style={{ fontSize: 10, lineHeight: 1.2, padding: "2px 4px", borderRadius: 3, background: TYPE_COLORS[e.type] + "1a", borderLeft: `3px solid ${TYPE_COLORS[e.type]}`, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "default" }}>
                            <span style={{ color: "#9ca3af", fontWeight: 700 }}>{e.ewp}</span> {e.name}
                          </div>
                        ))}
                        {cell.events.length > 5 && (
                          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, paddingLeft: 4 }}>+{cell.events.length - 5} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: "auto", padding: "0 0 20px" }}>
            <ListView events={filteredEvents} ewpName={ewpName} />
          </div>
        )}
      </main>
    </div>
  );
}

function ListView({ events }) {
  const sorted = useMemo(() => [...events].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)), [events]);
  const byMonth = useMemo(() => {
    const map = {};
    for (const e of sorted) {
      const key = e.date.slice(0, 7);
      (map[key] = map[key] || []).push(e);
    }
    return map;
  }, [sorted]);
  const keys = Object.keys(byMonth).sort();
  if (!keys.length) return <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>No deliverables match the current filters. Turn on an EWP or clear the search.</div>;
  return (
    <div>
      {keys.map((k) => {
        const [y, m] = k.split("-").map(Number);
        return (
          <div key={k}>
            <div style={{ position: "sticky", top: 0, background: "#1F4E79", color: "#fff", fontSize: 12, fontWeight: 700, padding: "6px 18px", letterSpacing: 0.5, zIndex: 1 }}>
              {MONTHS[m - 1]} {y} <span style={{ opacity: 0.7, fontWeight: 500 }}>&middot; {byMonth[k].length}</span>
            </div>
            {byMonth[k].map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 18px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", width: 78, flexShrink: 0 }}>{e.date}</div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: TYPE_COLORS[e.type], padding: "2px 7px", borderRadius: 4, flexShrink: 0, minWidth: 44, textAlign: "center" }}>{e.type}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}><span style={{ color: ewpColor(e.ewp), fontWeight: 700 }}>EWP {e.ewp}</span> &middot; {e.ewpName}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function btnStyle(primary) {
  return {
    fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 6, cursor: "pointer",
    border: primary ? "none" : "1px solid #d1d5db",
    background: primary ? "#D04E00" : "#fff",
    color: primary ? "#fff" : "#374151",
  };
}
const navBtn = { display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", color: "#1F4E79" };
function toggleBtn(active) {
  return { display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "6px 11px", borderRadius: 6, cursor: "pointer", border: "1px solid " + (active ? "#1F4E79" : "#d1d5db"), background: active ? "#1F4E79" : "#fff", color: active ? "#fff" : "#374151" };
}
