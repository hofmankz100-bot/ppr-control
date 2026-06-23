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
    }
  };
})();
