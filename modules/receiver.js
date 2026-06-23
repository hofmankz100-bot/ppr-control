(function () {
  const root = window.PPRModules ||= {};
  root.receiver = {
    matches(name) {
      return /ресивер/i.test(String(name || ""));
    },
    label(name) {
      return root.receiver.matches(name) ? "Ресивер" : String(name || "");
    }
  };
})();
