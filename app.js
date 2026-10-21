/* 2026. 중등 서논술형 평가 도움자료 개발 - 고등학교 통합사회1·2 */
(function () {
  "use strict";

  // ------------------------------------------------------------ 기본 데이터
  const PERSON_COLORS = ["#F9C4C4", "#FCD9B2", "#FBEFA5", "#C8EBC6", "#C0DCF6", "#DCCBF3"]; // 빨·주·노·초·파·보 (파스텔)
  const PERSON_DOT = ["#E26D6D", "#E89A4C", "#D4B52A", "#58A65C", "#4B8BD1", "#9672CF"];
  const EVENT_COLORS = ["#F9C4C4", "#FCD9B2", "#FBEFA5", "#C8EBC6", "#C0DCF6", "#DCCBF3", "#E5E7EB", "#BCE4E9"];
  const LEVEL_COLORS = { A: "#1f3864", B: "#2f5d9a", C: "#4a86c5", D: "#7aa7d6", E: "#a9c4e4" };
  const MONTHS = [{ y: 2026, m: 9 }, { y: 2026, m: 10 }, { y: 2026, m: 11 }]; // 0-기준 월: 10·11·12월
  const SEED = {
    version: 1,
    people: [
      { id: "p1", name: "민효식", school: "산남고등학교", major: "일반사회", dev: "", rev1: "" },
      { id: "p2", name: "최선희", school: "충북대학교사범대학부설고등학교", major: "일반사회", dev: "", rev1: "" },
      { id: "p3", name: "임한진", school: "충주여자고등학교", major: "일반사회", dev: "", rev1: "" },
      { id: "p4", name: "임동현", school: "대금고등학교", major: "윤리", dev: "", rev1: "" },
      { id: "p5", name: "변성일", school: "주성고등학교", major: "일반사회", dev: "", rev1: "" },
      { id: "p6", name: "노현경", school: "충북체육고등학교", major: "일반사회", dev: "", rev1: "" }
    ],
    events: [
      { id: "ev-period", title: "개발 기간", start: "2026-10-22", end: "2026-12-11", time: "", color: "#C0DCF6", shade: true, memo: "" },
      { id: "ev-1019", title: "팀장 협의회", start: "2026-10-19", end: "2026-10-19", time: "17:30", color: "#F9C4C4", shade: false, memo: "도교육청 본관 307호 영상회의실(대면)" },
      { id: "ev-1021", title: "전체 온라인 협의회", start: "2026-10-21", end: "2026-10-21", time: "19:00", color: "#FCD9B2", shade: false, memo: "채움모니터(비대면)" },
      { id: "ev-1022", title: "개발 시작", start: "2026-10-22", end: "2026-10-22", time: "", color: "#C8EBC6", shade: false, memo: "" },
      { id: "ev-1211", title: "최종 개발 완료", start: "2026-12-11", end: "2026-12-11", time: "", color: "#DCCBF3", shade: false, memo: "" }
    ],
    std: {},
    updated: ""
  };
  const STANDARDS = window.STANDARDS || [];
  const STD_BY_CODE = Object.fromEntries(STANDARDS.map((s) => [s.code, s]));
  const API = (window.APP_CONFIG && window.APP_CONFIG.apiUrl) || "";
  const LOCAL_KEY = "tongsa2026_state_v1";

  // ------------------------------------------------------------ 상태·저장
  let state = clone(SEED);
  let busy = 0;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function applyOp(s, op) {
    s.events = s.events || []; s.people = s.people || []; s.std = s.std || {};
    if (op.type === "init") { return op.state; }
    if (op.type === "event") { s.events = s.events.filter((e) => e.id !== op.event.id); s.events.push(op.event); }
    else if (op.type === "delEvent") { s.events = s.events.filter((e) => e.id !== op.id); }
    else if (op.type === "person") { const p = s.people.find((x) => x.id === op.id); if (p) p[op.field] = op.value; }
    else if (op.type === "people") { s.people = op.people; }
    else if (op.type === "std") { if (op.value) s.std[op.code] = op.value; else delete s.std[op.code]; }
    s.updated = new Date().toISOString();
    return s;
  }

  function localLoad() {
    try { const t = localStorage.getItem(LOCAL_KEY); if (t) return JSON.parse(t); } catch (e) { /* 무시 */ }
    return clone(SEED);
  }
  function localSave(s) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(s)); } catch (e) { /* 무시 */ } }

  async function remoteGet() {
    const r = await fetch(API + (API.includes("?") ? "&" : "?") + "action=get&t=" + Date.now(), { redirect: "follow" });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "불러오기 실패");
    return j.state;
  }
  async function remotePost(op) {
    const r = await fetch(API, { method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ op }) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "저장 실패");
    return j.state;
  }

  async function load() {
    if (!API) { state = normalize(localLoad()); return; }
    try {
      let s = await remoteGet();
      if (!s || !s.people) s = await remotePost({ type: "init", state: clone(SEED) });
      state = normalize(s);
    } catch (e) {
      toast("공유 저장소에 연결하지 못했습니다. 잠시 후 새로고침해 주세요.");
      state = normalize(localLoad());
    }
  }

  function normalize(s) {
    s = s || clone(SEED);
    s.people = s.people && s.people.length ? s.people : clone(SEED.people);
    s.events = s.events || [];
    s.std = s.std || {};
    return s;
  }

  async function send(op) {
    state = applyOp(state, op);
    renderAll();
    if (!API) { localSave(state); return; }
    busy++;
    try { state = normalize(await remotePost(op)); renderAll(); toast("저장했습니다."); }
    catch (e) { toast("저장하지 못했습니다. 새로고침 후 다시 시도해 주세요."); }
    finally { busy--; }
  }

  async function poll() {
    if (!API || busy || document.hidden || !document.getElementById("modal").hidden) return;
    const a = document.activeElement;
    if (a && (a.tagName === "INPUT" || a.tagName === "SELECT" || a.tagName === "TEXTAREA")) return;
    try { const s = await remoteGet(); if (s && s.updated !== state.updated) { state = normalize(s); renderAll(); } } catch (e) { /* 다음 주기에 다시 */ }
  }

  // ------------------------------------------------------------ 유틸
  const $ = (q, el) => (el || document).querySelector(q);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const DOW = "일월화수목금토";
  const kdate = (s) => { const d = parse(s); return `${d.getMonth() + 1}. ${d.getDate()}.(${DOW[d.getDay()]})`; };
  function personIndex(id) { return state.people.findIndex((p) => p.id === id); }
  function personColor(id) { const i = personIndex(id); return i >= 0 ? PERSON_COLORS[i % 6] : ""; }
  function personDot(id) { const i = personIndex(id); return i >= 0 ? PERSON_DOT[i % 6] : "#ccc"; }
  function personName(id) { const p = state.people.find((x) => x.id === id); return p ? p.name : ""; }

  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  function openModal(html, onMount) {
    $("#modalBody").innerHTML = html; $("#modal").hidden = false;
    if (onMount) onMount($("#modalBody"));
  }
  function closeModal() { $("#modal").hidden = true; $("#modalBody").innerHTML = ""; }

  // ------------------------------------------------------------ 탭
  function showTab(name) {
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === name));
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.id === "tab-" + name));
  }

  // ------------------------------------------------------------ 1. 개발 일정표
  function renderCalendar() {
    const cal = $("#calendar");
    const todayStr = ymd(new Date());
    const events = state.events.slice();
    const shaded = events.filter((e) => e.shade);
    let html = "";
    for (const { y, m } of MONTHS) {
      const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
      const start = new Date(first); start.setDate(1 - first.getDay());
      html += `<div class="month"><h2>${y}년 ${m + 1}월</h2><div class="dow">${[..."일월화수목금토"].map((d) => `<span>${d}</span>`).join("")}</div>`;
      const cur = new Date(start);
      while (cur <= last) {
        const days = [];
        for (let i = 0; i < 7; i++) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
        const inMonth = days.map((d) => d.getMonth() === m);
        const wkFirst = days.findIndex((x, i) => inMonth[i]), wkLast = 6 - [...inMonth].reverse().findIndex(Boolean);
        const segS = ymd(days[wkFirst]), segE = ymd(days[wkLast]);
        let cells = "";
        days.forEach((d, i) => {
          const ds = ymd(d);
          const cls = ["day", "c" + (i + 1)];
          if (!inMonth[i]) cls.push("out");
          if (d.getDay() === 0) cls.push("sun");
          if (d.getDay() === 6) cls.push("sat");
          if (ds === todayStr) cls.push("today");
          let style = `grid-column:${i + 1};grid-row:1 / span __SPAN__`;
          if (inMonth[i]) { const sh = shaded.find((e) => e.start <= ds && ds <= e.end); if (sh) { cls.push("period"); style += `;background:${tint(sh.color)}`; } }
          cells += `<div class="${cls.join(" ")}" data-date="${inMonth[i] ? ds : ""}" style="${style}"><span class="dn">${d.getDate()}</span></div>`;
        });
        // 이 주에 걸치는 일정 구간
        const segs = [];
        for (const e of events) {
          if (e.end < segS || e.start > segE) continue;
          const s = e.start > segS ? e.start : segS, en = e.end < segE ? e.end : segE;
          const sc = days.findIndex((d) => ymd(d) === s), ec = days.findIndex((d) => ymd(d) === en);
          if (e.shade && !(e.start >= segS || s === ymd(first))) continue; // 기간 일정은 시작 주와 월 첫 주에만 이름 표시
          segs.push({ e, sc, ec, contL: e.start < s, contR: e.end > en });
        }
        segs.sort((a, b) => a.sc - b.sc || (b.ec - b.sc) - (a.ec - a.sc) || (a.e.shade ? -1 : 1));
        const lanes = [];
        let bars = "";
        for (const g of segs) {
          let lane = 0;
          while (lanes[lane] && lanes[lane].some((x) => !(g.ec < x.sc || g.sc > x.ec))) lane++;
          (lanes[lane] = lanes[lane] || []).push(g);
          const cls = ["bar"]; if (g.contL) cls.push("cont-l"); if (g.contR) cls.push("cont-r");
          const label = g.e.title + (g.e.time ? " " + g.e.time : "");
          bars += `<div class="${cls.join(" ")}" data-ev="${esc(g.e.id)}" title="${esc(label + (g.e.memo ? " · " + g.e.memo : ""))}" style="grid-column:${g.sc + 1} / ${g.ec + 2};grid-row:${lane + 2};background:${g.e.color}">${esc(label)}</div>`;
        }
        const nl = Math.max(lanes.length, 2);
        html += `<div class="week" style="grid-template-rows:22px repeat(${nl},20px)">${cells.split("__SPAN__").join(String(nl + 1))}${bars}</div>`;
      }
      html += `</div>`;
    }
    cal.innerHTML = html;
    cal.querySelectorAll(".day[data-date]").forEach((el) => { if (el.dataset.date) el.addEventListener("click", () => eventForm({ start: el.dataset.date, end: el.dataset.date })); });
    cal.querySelectorAll(".bar").forEach((el) => el.addEventListener("click", (ev) => { ev.stopPropagation(); const e = state.events.find((x) => x.id === el.dataset.ev); if (e) eventForm(e); }));
    renderEventList();
  }

  function tint(hex) {
    // 배경 음영은 원래 색보다 연하게
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const mix = (c) => Math.round(c + (255 - c) * 0.55);
    return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
  }

  function renderEventList() {
    const list = state.events.slice().sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
    $("#eventList").innerHTML = list.map((e) => {
      const when = e.start === e.end ? kdate(e.start) : `${kdate(e.start)} ~ ${kdate(e.end)}`;
      return `<div class="ev"><span class="dot" style="background:${e.color}"></span><span class="when">${when}${e.time ? " " + esc(e.time) : ""}</span><span class="what">${esc(e.title)}${e.memo ? `<span class="memo">${esc(e.memo)}</span>` : ""}</span><span class="act"><button class="btn small" data-edit="${esc(e.id)}">수정</button><button class="btn small danger" data-del="${esc(e.id)}">삭제</button></span></div>`;
    }).join("") || `<p class="hint">등록된 일정이 없습니다.</p>`;
    $("#eventList").querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => eventForm(state.events.find((x) => x.id === b.dataset.edit))));
    $("#eventList").querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => delEvent(b.dataset.del)));
  }

  function delEvent(id) {
    const e = state.events.find((x) => x.id === id);
    if (!e) return;
    if (!confirm(`'${e.title}' 일정을 삭제할까요?`)) return;
    send({ type: "delEvent", id });
    closeModal();
  }

  function eventForm(e) {
    const isNew = !e.id;
    const v = Object.assign({ title: "", start: "2026-10-22", end: "2026-10-22", time: "", color: EVENT_COLORS[4], shade: false, memo: "" }, e);
    const colors = EVENT_COLORS.map((c) => `<label><input type="radio" name="color" value="${c}" ${c === v.color ? "checked" : ""}><span style="background:${c}"></span></label>`).join("");
    openModal(`
      <h3>${isNew ? "일정 추가" : "일정 수정"}</h3>
      <div class="meta">여러 날에 걸친 일정은 시작일과 종료일을 다르게 넣으면 달력에 이어져 표시됩니다.</div>
      <form class="form" id="evForm">
        <label for="f-title">제목</label><input id="f-title" required value="${esc(v.title)}" placeholder="예: 1차 검토">
        <label for="f-start">시작일</label><input id="f-start" type="date" required min="2026-10-01" max="2026-12-31" value="${v.start}">
        <label for="f-end">종료일</label><input id="f-end" type="date" required min="2026-10-01" max="2026-12-31" value="${v.end}">
        <label for="f-time">시간(선택)</label><input id="f-time" value="${esc(v.time)}" placeholder="예: 19:00">
        <label>색상</label><div class="colors">${colors}</div>
        <label for="f-shade">표시 방식</label><label class="chk"><input id="f-shade" type="checkbox" ${v.shade ? "checked" : ""}> 기간으로 표시(해당 날짜 배경에 색칠)</label>
        <label for="f-memo">메모(선택)</label><textarea id="f-memo" placeholder="장소, 방법 등">${esc(v.memo)}</textarea>
      </form>
      <div class="form-actions">${isNew ? "" : `<button class="btn danger" id="evDel">삭제</button>`}<div class="right"><button class="btn" id="evCancel">취소</button><button class="btn primary" id="evSave">저장</button></div></div>`,
      (box) => {
        $("#evCancel", box).onclick = closeModal;
        if (!isNew) $("#evDel", box).onclick = () => delEvent(v.id);
        $("#evSave", box).onclick = () => {
          const title = $("#f-title", box).value.trim(), start = $("#f-start", box).value, end = $("#f-end", box).value;
          if (!title) { toast("제목을 입력해 주세요."); return; }
          if (!start || !end) { toast("날짜를 입력해 주세요."); return; }
          if (end < start) { toast("종료일이 시작일보다 앞설 수 없습니다."); return; }
          const ev = { id: v.id || "ev-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title, start, end, time: $("#f-time", box).value.trim(), color: (box.querySelector("input[name=color]:checked") || {}).value || EVENT_COLORS[4], shade: $("#f-shade", box).checked, memo: $("#f-memo", box).value.trim() };
          closeModal();
          send({ type: "event", event: ev });
        };
        $("#f-start", box).addEventListener("change", () => { if ($("#f-end", box).value < $("#f-start", box).value) $("#f-end", box).value = $("#f-start", box).value; });
        $("#f-title", box).focus();
      });
  }

  // ------------------------------------------------------------ 2. 개발/검토 배정
  function renderAssign() {
    const rows = state.people.map((p, i) => `
      <tr>
        <td><span class="name-chip"><i style="background:${PERSON_DOT[i % 6]}"></i>${esc(p.name)}</span></td>
        <td>${esc(p.school)}</td>
        <td>${esc(p.major)}</td>
        <td class="num"><input type="number" min="0" max="15" step="1" data-id="${p.id}" data-f="dev" value="${esc(p.dev)}" aria-label="${esc(p.name)} 개발 세트 수"></td>
        <td class="num"><input type="number" min="0" max="15" step="1" data-id="${p.id}" data-f="rev1" value="${esc(p.rev1)}" aria-label="${esc(p.name)} 1차 검토 세트 수"></td>
        <td class="num"><input type="text" value="미정" disabled aria-label="2차 검토(미정)" style="width:72px;text-align:center"></td>
      </tr>`).join("");
    const sum = (f) => state.people.reduce((a, p) => a + (Number(p[f]) || 0), 0);
    $("#asgTable").innerHTML = `
      <thead><tr><th>이름</th><th>소속</th><th>전공</th><th class="num">개발(세트)</th><th class="num">1차 검토(세트)</th><th class="num">2차 검토(세트)</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="3">합계 (전체 15세트)</td><td class="num">${sum("dev")} / 15</td><td class="num">${sum("rev1")} / 15</td><td class="num na">미정</td></tr></tfoot>`;
    $("#asgTable").querySelectorAll("input[data-f]").forEach((inp) => inp.addEventListener("change", () => {
      let val = inp.value === "" ? "" : Math.max(0, Math.min(15, Math.round(Number(inp.value))));
      if (Number.isNaN(val)) val = "";
      inp.value = val;
      send({ type: "person", id: inp.dataset.id, field: inp.dataset.f, value: val === "" ? "" : String(val) });
    }));
  }

  // ------------------------------------------------------------ 3. 성취기준 배분
  const stdView = { sort: "code", vol: "", who: "", text: "", unassigned: false };

  function renderStd() {
    const who = $("#fWho"), cur = who.value;
    who.innerHTML = `<option value="">담당자 전체</option>` + state.people.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("") + `<option value="__none">미배정</option>`;
    who.value = cur;

    // 요약
    const counts = {}; let none = 0;
    STANDARDS.forEach((s) => { const a = state.std[s.code]; if (a && personIndex(a) >= 0) counts[a] = (counts[a] || 0) + 1; else none++; });
    $("#stdSummary").innerHTML = state.people.map((p, i) => `<button class="pill ${stdView.who === p.id ? "on" : ""}" data-who="${p.id}"><i style="background:${PERSON_DOT[i % 6]}"></i>${esc(p.name)} <b>${counts[p.id] || 0}</b></button>`).join("")
      + `<button class="pill ${stdView.who === "__none" ? "on" : ""}" data-who="__none"><i style="background:#d1d5db"></i>미배정 <b>${none}</b></button><span class="hint" style="margin:6px 4px">전체 ${STANDARDS.length}개</span>`;
    $("#stdSummary").querySelectorAll(".pill").forEach((b) => b.addEventListener("click", () => { stdView.who = stdView.who === b.dataset.who ? "" : b.dataset.who; $("#fWho").value = stdView.who; renderStd(); }));

    let list = STANDARDS.filter((s) => {
      const a = state.std[s.code] && personIndex(state.std[s.code]) >= 0 ? state.std[s.code] : "";
      if (stdView.vol && s.vol !== stdView.vol) return false;
      if (stdView.who === "__none" && a) return false;
      if (stdView.who && stdView.who !== "__none" && a !== stdView.who) return false;
      if (stdView.unassigned && a) return false;
      if (stdView.text) { const t = stdView.text; if (!(s.text.includes(t) || s.area.includes(t) || s.code.includes(t))) return false; }
      return true;
    });
    if (stdView.sort === "name") {
      const rank = (s) => { const i = personIndex(state.std[s.code]); return i >= 0 ? i : 99; };
      list = list.slice().sort((a, b) => rank(a) - rank(b) || a.code.localeCompare(b.code));
    }
    const opts = (sel) => `<option value="">— 선택 —</option>` + state.people.map((p) => `<option value="${p.id}" ${sel === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("");
    $("#stdTable").innerHTML = `<thead><tr><th>코드</th><th>영역</th><th>성취기준</th><th>담당자</th></tr></thead><tbody>${list.map((s) => {
      const a = state.std[s.code] && personIndex(state.std[s.code]) >= 0 ? state.std[s.code] : "";
      const bg = a ? ` style="background:${personColor(a)}"` : "";
      return `<tr${bg}><td class="code"><a data-code="${s.code}">[${s.code}]</a></td><td class="area">${esc(s.vol)}<br>${esc(s.area)}</td><td>${esc(s.text)}</td><td><select data-code="${s.code}" aria-label="${s.code} 담당자">${opts(a)}</select></td></tr>`;
    }).join("") || `<tr><td colspan="4" class="na">조건에 맞는 성취기준이 없습니다.</td></tr>`}</tbody>`;
    $("#stdTable").querySelectorAll("a[data-code]").forEach((el) => el.addEventListener("click", () => stdModal(el.dataset.code)));
    $("#stdTable").querySelectorAll("select[data-code]").forEach((el) => el.addEventListener("change", () => send({ type: "std", code: el.dataset.code, value: el.value })));
  }

  function stdModal(code) {
    const s = STD_BY_CODE[code]; if (!s) return;
    const a = state.std[code] && personIndex(state.std[code]) >= 0 ? state.std[code] : "";
    const levels = ["A", "B", "C", "D", "E"].map((L) => `<tr><td class="lv" style="background:${LEVEL_COLORS[L]}">${L}</td><td>${esc((s.levels || {})[L] || "")}</td></tr>`).join("");
    openModal(`
      <h3>[${s.code}]</h3>
      <div class="meta">${esc(s.vol)} · ${esc(s.area)}${a ? ` · 담당 <span class="name-chip"><i style="background:${personDot(a)}"></i>${esc(personName(a))}</span>` : " · 미배정"}</div>
      <div class="blk"><h4>성취기준</h4><div class="std-text">${esc(s.text)}</div></div>
      <div class="blk"><h4>성취기준 해설</h4><p style="margin:0">${esc(s.explain)}</p></div>
      <div class="blk"><h4>성취기준별 성취수준</h4><table class="levels">${levels}</table></div>
      <div class="blk"><h4>성취기준 적용 시 고려 사항 (영역 공통)</h4><ul>${(s.consider || []).map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>
      <div class="form-actions"><label class="chk">담당자 <select id="m-who" style="margin-left:6px;padding:6px 8px;border:1px solid #cfd6e2;border-radius:6px;font:inherit"><option value="">— 선택 —</option>${state.people.map((p) => `<option value="${p.id}" ${a === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label><div class="right"><button class="btn primary" id="m-close">닫기</button></div></div>`,
      (box) => {
        $("#m-close", box).onclick = closeModal;
        $("#m-who", box).onchange = (ev) => { send({ type: "std", code, value: ev.target.value }); closeModal(); };
      });
  }

  function exportCsv() {
    const rows = [["코드", "교육과정", "영역", "성취기준", "담당자"]].concat(STANDARDS.map((s) => [s.code, s.vol, s.area, s.text, personName(state.std[s.code]) || ""]));
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "성취기준_배분_" + ymd(new Date()) + ".csv";
    a.click();
  }


  // ------------------------------------------------------------ 자료 다운로드
  function downloadsModal() {
    const list = window.DOWNLOADS || [];
    const items = list.map((d) => {
      const name = d.file.split("/").pop();
      return `<div class="ev"><span class="dot" style="background:#1f3864"></span><span class="what">${esc(d.title)}<span class="memo">${esc(name)}${d.desc ? " · " + esc(d.desc) : ""}</span></span><span class="act"><a class="btn small primary" href="${encodeURI(d.file)}" download="${esc(name)}">내려받기</a></span></div>`;
    }).join("") || `<p class="hint">등록된 자료가 없습니다.</p>`;
    openModal(`<h3>자료 다운로드</h3><div class="meta">필요한 파일의 '내려받기'를 누르세요.</div><div class="event-list">${items}</div>
      <div class="form-actions"><div class="right"><button class="btn" id="dlClose">닫기</button></div></div>`,
      (box) => { $("#dlClose", box).onclick = closeModal; });
  }

  // ------------------------------------------------------------ 팀장 전용 메뉴(암호화된 모듈)
  async function unlockLead(pw) {
    const enc = window.LEAD_ENC; if (!enc) return false;
    try {
      const b = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
      const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
      const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b(enc.salt), iterations: enc.iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b(enc.iv) }, key, b(enc.data));
      new Function(new TextDecoder().decode(plain))();
      return !!window.LEAD;
    } catch (e) { return false; }
  }

  let leadOn = false;
  function mountLead() {
    if (leadOn || !window.LEAD) return;
    leadOn = true;
    const btn = document.createElement("button");
    btn.dataset.tab = "lead"; btn.textContent = window.LEAD.title || "팀 관리";
    btn.addEventListener("click", () => { showTab("lead"); window.LEAD.render(); });
    $("#tabs").appendChild(btn);
    window.LEAD.mount($("#leadMount"), { get state() { return state; }, send, toast, PERSON_DOT, esc, clone });
    showTab("lead"); window.LEAD.render();
  }

  function leadPrompt() {
    openModal(`<h3>팀장 확인</h3><div class="meta">팀장 비밀번호를 입력하세요.</div>
      <form class="form" id="lf"><label for="lp">비밀번호</label><input id="lp" type="password" autocomplete="current-password"></form>
      <div class="form-actions"><div class="right"><button class="btn" id="lc">취소</button><button class="btn primary" id="lo">확인</button></div></div>`,
      (box) => {
        const go = async () => {
          const pw = $("#lp", box).value;
          if (await unlockLead(pw)) { try { sessionStorage.setItem("lead_pw", pw); } catch (e) { /* 무시 */ } closeModal(); mountLead(); }
          else toast("비밀번호가 맞지 않습니다.");
        };
        $("#lo", box).onclick = go; $("#lc", box).onclick = closeModal;
        $("#lf", box).onsubmit = (e) => { e.preventDefault(); go(); };
        $("#lp", box).focus();
      });
  }

  async function checkLead() {
    let pw = null; try { pw = sessionStorage.getItem("lead_pw"); } catch (e) { /* 무시 */ }
    if (pw && await unlockLead(pw)) { mountLead(); return; }
    if (location.hash === "#admin") leadPrompt();
  }

  // ------------------------------------------------------------ 전체 렌더
  function renderAll() {
    renderCalendar(); renderAssign(); renderStd();
    if (leadOn && window.LEAD && $("#tab-lead").classList.contains("on")) window.LEAD.render();
  }

  // ------------------------------------------------------------ 시작
  document.addEventListener("DOMContentLoaded", async () => {
    $("#tabs").addEventListener("click", (e) => { const b = e.target.closest("button[data-tab]"); if (b && b.dataset.tab !== "lead") showTab(b.dataset.tab); });
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal" || e.target.classList.contains("modal-x")) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });
    $("#btnAddEvent").addEventListener("click", () => eventForm({ start: "2026-10-22", end: "2026-10-22" }));
    $("#fVol").addEventListener("change", (e) => { stdView.vol = e.target.value; renderStd(); });
    $("#fWho").addEventListener("change", (e) => { stdView.who = e.target.value; renderStd(); });
    $("#fText").addEventListener("input", (e) => { stdView.text = e.target.value.trim(); renderStd(); });
    $("#fMine").addEventListener("change", (e) => { stdView.unassigned = e.target.checked; renderStd(); });
    document.querySelectorAll("[data-sort]").forEach((b) => b.addEventListener("click", () => { stdView.sort = b.dataset.sort; document.querySelectorAll("[data-sort]").forEach((x) => x.classList.toggle("on", x === b)); renderStd(); }));
    $("#btnCsv").addEventListener("click", exportCsv);
    $("#btnDownloads").addEventListener("click", downloadsModal);
    window.addEventListener("hashchange", () => { if (location.hash === "#admin" && !leadOn) leadPrompt(); });

    if (!API) { const bn = $("#banner"); bn.hidden = false; bn.textContent = "아직 공유 저장소가 연결되지 않아 입력 내용이 이 브라우저에만 저장됩니다."; }
    await load();
    renderAll();
    checkLead();
    setInterval(poll, 20000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });
  });
})();
