(function () {
  const root = window.PPRModules ||= {};
  const factoryCalendar = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Qyzylorda", calendar: "iso8601", numberingSystem: "latn",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  });
  const calendarParts = date => Object.fromEntries(factoryCalendar.formatToParts(date)
    .filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  const monthRanges = new Map();

  function normalizedCalendarInput(value) {
    const input = String(value ?? "").trim().replace(" ", "T");
    return /T/i.test(input) ? input.replace(/([+-]\d{2})(\d{2})$/, "$1:$2").replace(/([+-]\d{2})$/, "$1:00") : input;
  }

  function parsedCalendarValue(value) {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? { date: value } : null;
    const input = normalizedCalendarInput(value);
    const match = input.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?)?$/i);
    if (!match) return null;
    const day = new Date(`${match[1]}T00:00:00Z`);
    if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== match[1]
      || Number(match[2] || 0) > 23 || Number(match[3] || 0) > 59 || Number(match[4] || 0) > 59) return null;
    const wallDate = match[5] ? "" : match[1];
    const date = new Date(match[5] ? input : `${input}${match[2] ? "" : "T00:00:00"}Z`);
    return Number.isFinite(date.getTime()) ? { date, wallDate } : null;
  }

  function calendarDate(value) {
    const parsed = parsedCalendarValue(value);
    if (!parsed) return "";
    // Date-only keys and legacy wall-clock values already name a calendar day.
    if (parsed.wallDate) return parsed.wallDate;
    const parts = calendarParts(parsed.date);
    return `${parts.year.padStart(4, "0")}-${parts.month}-${parts.day}`;
  }

  function calendarMonth(value) {
    return calendarDate(value).slice(0, 7);
  }

  function localClockTimeMs(instant) {
    const parts = calendarParts(new Date(instant));
    const local = new Date(0);
    local.setUTCFullYear(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
    local.setUTCHours(Number(parts.hour), Number(parts.minute), Number(parts.second), new Date(instant).getUTCMilliseconds());
    return local.getTime();
  }

  function wallClockTimeMs(nominal) {
    const offsets = new Set([-86400000, 0, 86400000].map(delta => {
      const instant = nominal + delta;
      return localClockTimeMs(instant) - instant;
    }));
    const candidates = [...offsets].map(offset => nominal - offset).sort((a, b) => a - b);
    // A repeated wall time uses its earlier occurrence; a missing spring time
    // moves forward by the gap, consistently across device timezones.
    return candidates.find(instant => localClockTimeMs(instant) === nominal) ?? candidates.at(-1);
  }

  function calendarTimeMs(value) {
    const parsed = parsedCalendarValue(value);
    if (!parsed) return NaN;
    return parsed.wallDate ? wallClockTimeMs(parsed.date.getTime()) : parsed.date.getTime();
  }

  function calendarMonthRange(year, monthIndex) {
    const key = `${year}:${monthIndex}`;
    const cached = monthRanges.get(key);
    if (cached) return { start: new Date(cached[0]), end: new Date(cached[1]) };
    const boundary = month => {
      const nominal = new Date(0);
      nominal.setUTCFullYear(year, month, 1);
      nominal.setUTCHours(0, 0, 0, 0);
      return new Date(wallClockTimeMs(nominal.getTime()));
    };
    const start = boundary(monthIndex), end = boundary(monthIndex + 1);
    if (monthRanges.size >= 36) monthRanges.delete(monthRanges.keys().next().value);
    monthRanges.set(key, [start.getTime(), end.getTime()]);
    return { start, end };
  }

  root.director = {
    calendarDate, calendarMonth, calendarTimeMs, calendarMonthRange,
    healthBand(score) {
      if (score >= 90) return "green";
      if (score >= 70) return "yellow";
      if (score >= 50) return "orange";
      return "red";
    },
    needsAttention(count) {
      return Number(count || 0) > 0;
    }
  };
})();
