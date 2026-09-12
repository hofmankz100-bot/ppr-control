(function () {
  const root = window.PPRModules ||= {};
  root.comments = {
    clearComposer(item) {
      if (!item) return;
      item.comment = "";
      item.commentPhoto = "";
      item.commentOwnerRole = "";
      item.commentOwnerName = "";
      item.commentUpdatedAt = "";
      item.nodeDraftText = "";
    },
    dedupeAggregateJournalItems(entries = []) {
      const normalize = value => String(value || "").normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim().toLocaleLowerCase("ru-RU").replace(/\s+/g, " ");
      const result = [];
      for (const entry of [...entries].sort((a, b) => String(b.at).localeCompare(String(a.at)))) {
        const entryAt = Date.parse(entry.at || "");
        const duplicateIndex = result.findIndex(candidate => {
          if (candidate.kind === entry.kind || Number(candidate.equipmentId) !== Number(entry.equipmentId)) return false;
          if (!normalize(entry.text) || normalize(candidate.text) !== normalize(entry.text)) return false;
          if (normalize(candidate.authorName) !== normalize(entry.authorName)) return false;
          if (normalize(candidate.resolvedComment) !== normalize(entry.resolvedComment)) return false;
          const candidateAt = Date.parse(candidate.at || "");
          return Number.isFinite(candidateAt) && Number.isFinite(entryAt) && Math.abs(candidateAt - entryAt) <= 300000;
        });
        if (duplicateIndex < 0) { result.push(entry); continue; }
        const candidate = result[duplicateIndex];
        const downtime = candidate.kind === "Поломка" ? candidate : entry;
        const remark = candidate.kind === "Замечание" ? candidate : entry;
        result[duplicateIndex] = {
          ...remark, ...downtime, kind: "Поломка",
          recordKey: remark.recordKey || downtime.recordKey,
          remarkId: remark.remarkId || downtime.remarkId,
          resolutionParticipants: remark.resolutionParticipants?.length ? remark.resolutionParticipants : downtime.resolutionParticipants,
          resolutionCompletedParticipants: remark.resolutionCompletedParticipants?.length ? remark.resolutionCompletedParticipants : downtime.resolutionCompletedParticipants,
          confirmedAt: remark.confirmedAt || downtime.confirmedAt,
          confirmedByName: remark.confirmedByName || downtime.confirmedByName,
          confirmedByRole: remark.confirmedByRole || downtime.confirmedByRole,
          resolved: Boolean(remark.resolved || downtime.resolved),
          resolvedAt: downtime.resolvedAt || remark.resolvedAt,
          resolvedComment: downtime.resolvedComment || remark.resolvedComment,
          durationMs: Number(downtime.durationMs || remark.durationMs || 0)
        };
      }
      return result;
    }
  };
})();
