(function () {
  const root = window.PPRModules ||= {};
  root.director = {
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
