(function () {
  const root = window.PPRModules ||= {};
  root.auth = {
    saveSession(profile) {
      if (!profile) return;
      root.cache.set("profile", profile).catch(() => {});
    },
    loadSession() {
      return root.cache.get("profile").catch(() => null);
    }
  };
})();
