"use strict";

// web-push forwards this to the HTTPS socket's inactivity timeout (not TTL).
const PUSH_TIMEOUT_MS = 10000;

function pushParticipants(participants) {
  return (Array.isArray(participants) ? participants : []).map(participant => ({
    id: String(participant?.id || ""),
    employeeId: String(participant?.employeeId || ""),
    phone: String(participant?.phone || ""),
    name: String(participant?.name || ""),
    role: String(participant?.role || "")
  }));
}

function pushRemarks(remarks) {
  return remarks.map(remark => {
    const entry = remark.entry || remark;
    return {
      recordKey: remark.recordKey,
      entry: {
        area: entry.area,
        confirmationArea: entry.confirmationArea,
        resolutionParticipants: pushParticipants(entry.resolutionParticipants)
      }
    };
  });
}

function pushSheet(sheet, includeRows = false) {
  return {
    id: sheet.id,
    date: sheet.date,
    ...(includeRows ? { rows: (sheet.rows || []).map(row => ({
      work: String(row?.work || "").trim() ? "1" : "",
      equipment: row?.equipment
    })) } : {})
  };
}

function createPushSnapshot(db, matches, badgeCount) {
  // The count helper normalizes legacy remarks in place. Isolate only those
  // mutable paths; photos and other state are neither cloned nor returned.
  // This view lives only during synchronous routing/count evaluation.
  const view = { ...db, checks: {} };
  for (const [key, record] of Object.entries(db.checks || {})) {
    view.checks[key] = record?.to ? {
      ...record,
      to: {
        ...record.to,
        ...(Array.isArray(record.to.commentLog) ? {
          commentLog: record.to.commentLog.map(entry => entry && { ...entry })
        } : {})
      }
    } : record;
  }
  // Preserve filter-then-count ordering: counts may normalize the legacy view.
  const targets = (db.pushNotifications.subscriptions || []).filter(entry => matches(view, entry));
  return {
    vapid: { ...db.pushNotifications.vapid },
    targets: targets.map(entry => ({
      subscription: structuredClone(entry.subscription),
      profile: { language: entry.profile?.language },
      badgeCount: badgeCount(view, entry)
    }))
  };
}

module.exports = { PUSH_TIMEOUT_MS, createPushSnapshot, pushParticipants, pushRemarks, pushSheet };
