(function (host, factory) {
  const updater = factory(host);
  if (typeof module === "object" && module.exports) module.exports = updater;
  else (host.PPRModules ||= {}).appUpdater = updater;
})(typeof window === "object" ? window : globalThis, function (host) {
  function create(options = {}) {
    const browser = options.window || host;
    const page = options.document || browser.document;
    const serviceWorkerNavigator = options.navigator || browser.navigator;
    const location = options.location || browser.location;
    const currentVersion = String(options.currentVersion || "");
    const retryDelayMs = Math.max(0, Number(options.retryDelayMs ?? 5000));
    const reloadDelayMs = Math.max(0, Number(options.reloadDelayMs ?? 4000));
    const idleDelayMs = Math.max(0, Number(options.idleDelayMs ?? 5000));
    let requiredVersion = "";
    let timer = 0;
    let installing = false;
    let lastInteractionAt = Date.now();

    const schedule = delay => {
      browser.clearTimeout(timer);
      timer = browser.setTimeout(attempt, delay);
    };
    const safeToInstall = () => {
      if (Date.now() - lastInteractionAt < idleDelayMs) return false;
      return options.isSafeToInstall?.() !== false;
    };
    const updateUrl = () => `/update.html?target=${encodeURIComponent(requiredVersion || "latest")}&refresh=${Date.now()}`;
    const overlay = () => {
      let element = page.querySelector(".required-update-overlay");
      if (element) return element;
      options.beforeShow?.();
      element = page.createElement("div");
      element.className = "required-update-overlay";
      element.innerHTML = `<section class="required-update-card" role="alertdialog" aria-modal="true">
        <div class="required-update-icon">↻</div>
        <span>АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ</span>
        <h1>Обновляем приложение</h1>
        <p>Новая версия установится автоматически. Введённые и неотправленные данные сохранятся.</p>
        <small data-required-update-version></small>
        <button type="button" data-required-update>Обновить сейчас</button>
        <div data-required-update-status>Подготовка обновления…</div>
      </section>`;
      page.body.appendChild(element);
      element.querySelector("[data-required-update]")?.addEventListener("click", installNow);
      return element;
    };

    function installNow() {
      if (installing) return;
      if (options.isSafeToInstall?.() === false) {
        schedule(retryDelayMs);
        return;
      }
      installing = true;
      browser.clearTimeout(timer);
      const element = overlay();
      const button = element.querySelector("[data-required-update]");
      const status = element.querySelector("[data-required-update-status]");
      if (button) { button.disabled = true; button.textContent = "Обновляем…"; }
      if (status) status.textContent = "Открываем безопасную страницу обновления…";
      location.replace(updateUrl());
    }

    function attempt() {
      if (installing || !requiredVersion) return;
      if (!safeToInstall()) {
        schedule(retryDelayMs);
        return;
      }
      const element = overlay();
      const version = element.querySelector("[data-required-update-version]");
      if (version) version.textContent = requiredVersion === "latest" ? "" : `Новая версия: ${requiredVersion}`;
      browser.clearTimeout(timer);
      timer = browser.setTimeout(installNow, reloadDelayMs);
    }

    function request(version = "latest") {
      const target = String(version || "latest");
      if (target === currentVersion) return false;
      requiredVersion = target;
      attempt();
      return true;
    }

    function startServiceWorkerUpdates() {
      if (!("serviceWorker" in serviceWorkerNavigator)) return Promise.resolve(null);
      browser.addEventListener("pointerdown", () => { lastInteractionAt = Date.now(); }, { passive: true });
      browser.addEventListener("keydown", () => { lastInteractionAt = Date.now(); });
      serviceWorkerNavigator.serviceWorker.addEventListener("message", event => {
        if (event.data?.type === "ppr-update-ready") request(event.data.version);
      });
      return serviceWorkerNavigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then(registration => {
        registration.update().catch(options.onError || (() => {}));
        const interval = browser.setInterval(() => registration.update().catch(options.onError || (() => {})), 60000);
        return { registration, interval };
      });
    }

    return { request, installNow, startServiceWorkerUpdates, pendingVersion: () => requiredVersion };
  }

  return { create };
});
