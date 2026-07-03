(function () {
  "use strict";

  var VER = "1.0.5";
  var DEFAULT_CLOUD = "https://rcudhixnmt9u6ipayw98gdmiwalnpzbg.ui.nabu.casa/";

  // Localized strings (ported 1:1 from the Android res/values*/strings.xml).
  var STR = {
    tk: {
      app_name: "SEZAM Akylly Öý",
      brand_web: "SEZAM Akylly öý",
      choose: "Birikmäni saýlaň",
      online: "ONLAÝN (INTERNET ARKALY)",
      local: "ÝERLI (ŞU TORDA)",
      editOnline: "⚙ Onlaýn salgyny üýtget",
      editLocal: "⚙ Ýerli salgyny üýtget",
      needLocal: "Ilki ýerli serweriň salgysyny giriziň",
      onlineLabel: "Onlaýn salgy (giriş salgysy):",
      localLabel: "Ýerli salgy (öz toruňyzda):",
      note: "Ýerli diňe telefon serwer bilen bir torda bolanda işleýär. Salgyny durnukly (statik) IP bilen bermek maslahat berilýär.",
      save: "Saklamak",
      back: "Yza",
      devLabel: "Işläp düzüji",
      verLabel: "Programma wersiýasy",
      credit: "Işläp düzüji: VAGAN +(993) (61) 03-73-30",
      ver: "Wersiýa " + VER
    },
    ru: {
      app_name: "SEZAM Умный Дом",
      brand_web: "SEZAM Умный Дом",
      choose: "Выберите подключение",
      online: "ОНЛАЙН (ЧЕРЕЗ ИНТЕРНЕТ)",
      local: "ЛОКАЛЬНО (В ЭТОЙ СЕТИ)",
      editOnline: "⚙ Изменить онлайн-адрес",
      editLocal: "⚙ Изменить локальный адрес",
      needLocal: "Сначала укажите локальный адрес сервера",
      onlineLabel: "Онлайн-адрес (ссылка для входа):",
      localLabel: "Локальный адрес (в вашей сети):",
      note: "Локально работает, когда телефон в одной сети с сервером. Адрес лучше задать со статическим IP.",
      save: "Сохранить",
      back: "Назад",
      devLabel: "Разработчик",
      verLabel: "Версия приложения",
      credit: "Разработчик: VAGAN +(993) (61) 03-73-30",
      ver: "Версия " + VER
    },
    en: {
      app_name: "SEZAM Smart Home",
      brand_web: "SEZAM Smart Home",
      choose: "Choose connection",
      online: "ONLINE (VIA INTERNET)",
      local: "LOCAL (ON THIS NETWORK)",
      editOnline: "⚙ Change online address",
      editLocal: "⚙ Change local address",
      needLocal: "Enter the local server address first",
      onlineLabel: "Online address (login link):",
      localLabel: "Local address (on your network):",
      note: "Local works when the phone is on the same network as the server. A static IP is recommended.",
      save: "Save",
      back: "Back",
      devLabel: "Developer",
      verLabel: "App version",
      credit: "Developer: VAGAN +(993) (61) 03-73-30",
      ver: "Version " + VER
    }
  };

  var $ = function (id) { return document.getElementById(id); };
  var LS = window.localStorage;
  var logoLight = "", logoDark = "";
  var editMode = "cloud"; // "cloud" | "local"

  function lang() { return LS.getItem("lang") || "tk"; }
  function getCloud() { var u = (LS.getItem("cloud_url") || "").trim(); return u || DEFAULT_CLOUD; }
  function getLocal() { return (LS.getItem("local_url") || "").trim(); }

  // Fetch the bundled base64 logos and turn them into data URIs.
  function loadLogos() {
    return Promise.all([
      fetch("logo.txt").then(function (r) { return r.text(); }),
      fetch("logo_dark.txt").then(function (r) { return r.text(); })
    ]).then(function (a) {
      logoLight = "data:image/png;base64," + a[0].trim();
      logoDark = "data:image/png;base64," + a[1].trim();
      $("logo").src = logoLight;
    }).catch(function () {});
  }

  function render() {
    var s = STR[lang()];
    document.documentElement.lang = lang();
    $("brand").textContent = s.app_name;
    $("prompt").textContent = s.choose;
    $("btnOnline").textContent = s.online;
    $("btnLocal").textContent = s.local;
    $("editOnline").textContent = s.editOnline;
    $("editLocal").textContent = s.editLocal;
    $("credit").textContent = s.credit;
    $("ver").textContent = s.ver;
    // language bar highlight
    var spans = document.querySelectorAll("#langbar span[data-lang]");
    for (var i = 0; i < spans.length; i++) {
      spans[i].className = (spans[i].getAttribute("data-lang") === lang()) ? "active" : "";
    }
  }

  // Build the JS snippet injected into the Home Assistant page (documentStart).
  function buildGlobals() {
    var s = STR[lang()];
    function q(v) { return JSON.stringify(v); }
    return "window.__SEZAM_IOS=1;" +
      "window.__SEZAM_BRAND=" + q(s.brand_web) + ";" +
      "window.__SEZAM_DEV_LABEL=" + q(s.devLabel) + ";" +
      "window.__SEZAM_VER_LABEL=" + q(s.verLabel) + ";" +
      "window.__SEZAM_VER=" + q(VER) + ";" +
      "window.__SEZAM_LOGO=" + q(logoLight) + ";" +
      "window.__SEZAM_LOGO_DARK=" + q(logoDark) + ";";
  }

  // Ask the native layer to load the server URL with branding injection.
  function openServer(url) {
    var bridge = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.sezam;
    if (bridge) {
      bridge.postMessage({ action: "open", url: url, globals: buildGlobals() });
    } else {
      // Fallback (e.g. running in a plain browser preview): just navigate.
      window.location.href = url;
    }
  }

  function startOnline() { openServer(getCloud()); }
  function startLocal() {
    var l = getLocal();
    if (!l) { openEditor("local"); return; }
    openServer(l);
  }

  // ---- address editor ----
  function openEditor(mode) {
    editMode = mode;
    var s = STR[lang()];
    $("modalTitle").textContent = (mode === "cloud") ? s.onlineLabel : s.localLabel;
    $("modalLabel").textContent = "";
    $("modalNote").textContent = (mode === "local") ? s.note : "";
    $("modalNote").style.display = (mode === "local") ? "block" : "none";
    $("modalInput").value = (mode === "cloud") ? getCloud() : getLocal();
    $("modalInput").placeholder = (mode === "cloud") ? DEFAULT_CLOUD : "http://192.168.1.123:8123";
    $("modalSave").textContent = s.save;
    $("modalBack").textContent = s.back;
    $("modal").classList.add("show");
  }
  function closeEditor() { $("modal").classList.remove("show"); }
  function saveEditor() {
    var v = $("modalInput").value.trim();
    if (editMode === "cloud") {
      if (v && !/^https?:\/\//i.test(v)) v = "https://" + v;
      LS.setItem("cloud_url", v);
    } else {
      if (v && !/^https?:\/\//i.test(v)) v = "http://" + v;
      LS.setItem("local_url", v);
    }
    closeEditor();
  }

  function setLang(l) {
    if (!STR[l]) return;
    LS.setItem("lang", l);
    render();
  }

  function wire() {
    $("btnOnline").addEventListener("click", startOnline);
    $("btnLocal").addEventListener("click", startLocal);
    $("editOnline").addEventListener("click", function () { openEditor("cloud"); });
    $("editLocal").addEventListener("click", function () { openEditor("local"); });
    $("modalBack").addEventListener("click", closeEditor);
    $("modalSave").addEventListener("click", saveEditor);
    var spans = document.querySelectorAll("#langbar span[data-lang]");
    for (var i = 0; i < spans.length; i++) {
      (function (sp) {
        sp.addEventListener("click", function () { setLang(sp.getAttribute("data-lang")); });
      })(spans[i]);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    wire();
    render();
    loadLogos();
  });
})();
