(function () {
  const root = window.PPRModules ||= {};
  root.requests = {
    active(request) {
      return Boolean(request && !request.done && !request.stock && !request.rejected && !request.deleted);
    },
    overdue(request, today) {
      return Boolean(request?.dueDate && root.requests.active(request) && request.dueDate < today);
    }
  };
})();
