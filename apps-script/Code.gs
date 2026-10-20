/**
 * 2026. 중등 서논술형 평가 도움자료 개발 - 고등학교 통합사회1·2
 * 공유 저장소 (Google Apps Script 웹 앱)
 *
 * 설치: 새 Google 스프레드시트 → 확장 프로그램 → Apps Script → 이 코드를 붙여넣기 → 저장
 *       → 배포 → 새 배포 → 유형 '웹 앱' → 실행 사용자 '나', 액세스 권한 '모든 사용자' → 배포
 *       → 나온 웹 앱 URL(…/exec)을 웹앱의 config.js 의 apiUrl 에 넣는다.
 */
var SHEET_DATA = "data";

function getBook_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function getSheet_(name) {
  var ss = getBook_();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function readState_() {
  var v = getSheet_(SHEET_DATA).getRange("A1").getValue();
  if (!v) return null;
  try { return JSON.parse(v); } catch (e) { return null; }
}

function writeState_(s) {
  getSheet_(SHEET_DATA).getRange("A1").setValue(JSON.stringify(s));
  writeViews_(s);
}

function applyOp_(s, op) {
  if (op.type === "init") { return s && s.people ? s : op.state; }
  s = s || { people: [], events: [], std: {} };
  s.events = s.events || []; s.people = s.people || []; s.std = s.std || {};
  if (op.type === "event") { s.events = s.events.filter(function (e) { return e.id !== op.event.id; }); s.events.push(op.event); }
  else if (op.type === "delEvent") { s.events = s.events.filter(function (e) { return e.id !== op.id; }); }
  else if (op.type === "person") { s.people.forEach(function (p) { if (p.id === op.id) p[op.field] = op.value; }); }
  else if (op.type === "people") { s.people = op.people; }
  else if (op.type === "std") { if (op.value) s.std[op.code] = op.value; else delete s.std[op.code]; }
  else throw new Error("알 수 없는 요청");
  s.updated = new Date().toISOString();
  return s;
}

/** 사람이 보기 쉬운 시트(일정·배정·성취기준)도 함께 갱신 */
function writeViews_(s) {
  var names = {};
  (s.people || []).forEach(function (p) { names[p.id] = p.name; });
  var ev = [["시작일", "종료일", "시간", "제목", "메모"]].concat((s.events || []).slice().sort(function (a, b) { return a.start < b.start ? -1 : 1; })
    .map(function (e) { return [e.start, e.end, e.time || "", e.title, e.memo || ""]; }));
  putTable_("일정", ev);
  var pp = [["이름", "소속", "전공", "개발(세트)", "1차 검토(세트)"]].concat((s.people || []).map(function (p) { return [p.name, p.school, p.major, p.dev, p.rev1]; }));
  putTable_("개발검토배정", pp);
  var st = [["성취기준 코드", "담당자"]];
  Object.keys(s.std || {}).sort().forEach(function (k) { st.push([k, names[s.std[k]] || ""]); });
  putTable_("성취기준배분", st);
}

function putTable_(name, rows) {
  var sh = getSheet_(name);
  sh.clearContents();
  if (rows.length) sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try { return json_({ ok: true, state: readState_() }); }
  catch (err) { return json_({ ok: false, error: String(err) }); }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var req = JSON.parse(e.postData.contents);
    var s = applyOp_(readState_(), req.op || {});
    writeState_(s);
    return json_({ ok: true, state: s });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
