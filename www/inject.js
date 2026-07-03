(function () {
  try {
    var BRAND = (typeof window.__SEZAM_BRAND === "string" && window.__SEZAM_BRAND) ? window.__SEZAM_BRAND : "SEZAM Akylly öý";
    var DEV_LABEL = (typeof window.__SEZAM_DEV_LABEL === "string" && window.__SEZAM_DEV_LABEL) ? window.__SEZAM_DEV_LABEL : "Разработчик";
    var VER_LABEL = (typeof window.__SEZAM_VER_LABEL === "string" && window.__SEZAM_VER_LABEL) ? window.__SEZAM_VER_LABEL : "Версия приложения";
    var VER = (typeof window.__SEZAM_VER === "string" && window.__SEZAM_VER) ? window.__SEZAM_VER : "1.0.4";
    var LOGO_LIGHT = (typeof window.__SEZAM_LOGO === "string" && window.__SEZAM_LOGO) ? window.__SEZAM_LOGO : null;
    var LOGO_DARK = (typeof window.__SEZAM_LOGO_DARK === "string" && window.__SEZAM_LOGO_DARK) ? window.__SEZAM_LOGO_DARK : LOGO_LIGHT;
    var MENU_LOGO = (typeof window.__SEZAM_MENU_LOGO === "string" && window.__SEZAM_MENU_LOGO) ? window.__SEZAM_MENU_LOGO : null;
    var LOGO = LOGO_LIGHT;
    var REPLACERS = [[/Home\s*Assistant/gi, BRAND]];

    // White "SEZAM" on dark backgrounds, black on light.
    function bgLum(el) {
      if (!el) return -1;
      try {
        var bg = getComputedStyle(el).backgroundColor || "";
        var m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/);
        if (m) {
          var a = (m[4] === undefined) ? 1 : parseFloat(m[4]);
          if (a < 0.15) return -1; // transparent -> unknown, don't treat as black
          return 0.299 * (+m[1]) + 0.587 * (+m[2]) + 0.114 * (+m[3]);
        }
      } catch (e) {}
      return -1;
    }
    function isDark() {
      // Only trust the actual rendered background of real surfaces.
      // (Do NOT use prefers-color-scheme — that is the phone's system theme,
      //  not the HA page theme, and gives false positives.)
      var sels = ["ha-launch-screen"];
      var els = [];
      try { var l = document.getElementById("ha-launch-screen"); if (l) els.push(l); } catch (e) {}
      try {
        var ha = document.querySelector("home-assistant");
        if (ha) {
          els.push(ha);
          var main = ha.shadowRoot && ha.shadowRoot.querySelector("home-assistant-main");
          if (main) els.push(main);
        }
      } catch (e) {}
      if (document.body) els.push(document.body);
      if (document.documentElement) els.push(document.documentElement);
      for (var i = 0; i < els.length; i++) {
        var lum = bgLum(els[i]);
        if (lum >= 0) return lum < 128;
      }
      return false; // unknown -> light -> black text (safer than white-on-white)
    }

    function rebrandString(str) {
      var o = str;
      for (var i = 0; i < REPLACERS.length; i++) o = o.replace(REPLACERS[i][0], REPLACERS[i][1]);
      return o;
    }

    function deepForEach(root, sel, fn) {
      if (!root) return;
      try { root.querySelectorAll(sel).forEach(fn); } catch (e) {}
      var all;
      try { all = root.querySelectorAll("*"); } catch (e) { return; }
      for (var i = 0; i < all.length; i++) {
        if (all[i].shadowRoot) deepForEach(all[i].shadowRoot, sel, fn);
      }
    }

    // Early CSS to hide HA branding instantly (no flash) -----------------
    function ensureStyle() {
      if (document.getElementById("sezam-style")) return;
      var head = document.head || document.documentElement;
      if (!head) return;
      var st = document.createElement("style");
      st.id = "sezam-style";
      st.textContent =
        "#ha-launch-screen > svg{display:none!important;}" +
        "svg[viewBox='0 0 240 240']{display:none!important;}" +
        ".ohf-logo,a[href*='openhomefoundation']{display:none!important;}" +
        "img[alt*='Open Home Foundation' i]{display:none!important;}" +
        ".sezam-launch-logo{width:96px;height:96px;object-fit:contain;display:block;margin:0 auto;}" +
        ".sezam-inline-logo{height:96px;width:96px;object-fit:contain;display:block;margin:0 auto;}";
      head.appendChild(st);
    }

    // Text rebrand (incl. shadow DOM) ------------------------------------
    function walkText(root) {
      if (!root) return;
      var nodes = root.childNodes;
      if (!nodes) return;
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.nodeType === Node.TEXT_NODE) {
          var v = n.nodeValue;
          if (v && /Home\s*Assistant/i.test(v)) {
            var nv = rebrandString(v);
            if (nv !== v) n.nodeValue = nv;
          }
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          var tag = n.tagName;
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") continue;
          ["title", "aria-label"].forEach(function (attr) {
            if (n.hasAttribute && n.hasAttribute(attr)) {
              var a = n.getAttribute(attr);
              if (a && /Home\s*Assistant/i.test(a)) n.setAttribute(attr, rebrandString(a));
            }
          });
          walkText(n);
          if (n.shadowRoot) walkText(n.shadowRoot);
        }
      }
    }

    // Replace brand logo images (login / about). Skip the OHF badge. -----
    function fixImages() {
      if (!LOGO) return;
      deepForEach(document, "img", function (img) {
        var src = img.getAttribute("src") || "";
        var alt = img.getAttribute("alt") || "";
        if (/Open\s*Home\s*Foundation/i.test(alt)) return; // handled by hideFoundation
        if (/favicon|\/icons\/|logo/i.test(src) || /Home\s*Assistant/i.test(alt)) {
          if (img.getAttribute("data-sezam") !== "1") {
            img.setAttribute("data-sezam", "1");
            img.className = (img.className ? img.className + " " : "") + "sezam-repl";
            img.src = LOGO;
            img.alt = BRAND;
          }
        }
      });
    }

    // Replace launch-screen logo (raw <svg> in #ha-launch-screen) and ----
    // the custom <ha-logo-svg> element (about / onboarding).
    function fixLogoSvg() {
      var launch = document.getElementById("ha-launch-screen");
      if (launch && LOGO && !launch.querySelector(".sezam-launch-logo")) {
        var img = document.createElement("img");
        img.src = LOGO;
        img.alt = BRAND;
        img.className = "sezam-launch-logo";
        // place where the original logo was (centered, before the info/spinner box)
        var infoBox = launch.querySelector("#ha-launch-screen-info-box")
          || launch.querySelector(".ha-launch-screen-spacer-bottom");
        launch.insertBefore(img, infoBox || launch.firstChild);
      }
      deepForEach(document, "ha-logo-svg", function (el) {
        if (el.getAttribute("data-sezam") === "1") return;
        el.setAttribute("data-sezam", "1");
        if (LOGO) {
          var im = document.createElement("img");
          im.src = LOGO; im.alt = BRAND;
          im.style.width = "100%"; im.style.height = "100%"; im.style.objectFit = "contain";
          el.innerHTML = ""; el.appendChild(im);
        } else {
          el.style.visibility = "hidden";
        }
      });
      // The HA brand logo SVG uses a unique viewBox "0 0 240 240" (icons use 24).
      deepForEach(document, "svg[viewBox='0 0 240 240']", function (el) {
        if (el.getAttribute("data-sezam") === "1") return;
        el.setAttribute("data-sezam", "1");
        // Launch screen is handled above (centered logo) — just hide its svg here
        // so we don't end up with two logos.
        if (el.closest && el.closest("#ha-launch-screen")) { el.style.display = "none"; return; }
        el.style.display = "none";
        if (!LOGO) return;
        // Match the original logo size (inline styles work inside shadow DOM).
        var sz = el.clientWidth || (el.getBoundingClientRect && el.getBoundingClientRect().width) || 0;
        if (!sz || sz < 24) sz = 72;
        var im = document.createElement("img");
        im.src = LOGO; im.alt = BRAND; im.className = "sezam-inline-logo";
        im.style.width = sz + "px";
        im.style.height = sz + "px";
        im.style.objectFit = "contain";
        if (el.parentNode) el.parentNode.insertBefore(im, el.nextSibling);
      });
    }

    // Hide the "Open Home Foundation" badge everywhere -------------------
    function hideFoundation() {
      deepForEach(document, '.ohf-logo, a[href*="openhomefoundation"], img[alt*="Open Home Foundation" i]', function (el) {
        var box = el.classList && el.classList.contains("ohf-logo") ? el : (el.closest ? (el.closest(".ohf-logo") || el) : el);
        box.style.display = "none";
      });
      deepForEach(document, "*", function (el) {
        if (el.children && el.children.length === 0) {
          var t = (el.textContent || "").trim();
          if (/Open\s*Home\s*Foundation/i.test(t)) {
            var host = el.closest ? (el.closest(".ohf-logo") || el.closest("a") || el) : el;
            host.style.display = "none";
          } else if (/^(Proud part of|Гордимся быть частью)/i.test(t)) {
            var card = el.closest ? (el.closest("ha-card") || el.parentElement || el) : (el.parentElement || el);
            if (card) card.style.display = "none";
          }
        }
      });
    }

    // About page: hide the Supervisor row, add the developer credit ------
    function aboutTweaks() {
      deepForEach(document, "*", function (el) {
        if (el.children && el.children.length === 0) {
          var t = (el.textContent || "").trim();
          if (t === "Supervisor") {
            var row = el.closest ? (el.closest("tr") || el.parentElement) : el.parentElement;
            if (row) row.style.display = "none";
          }
        }
      });
      // add "Разработчик: VAGAN" once, by cloning the real Frontend row
      deepForEach(document, "*", function (el) {
        if (el.children && el.children.length === 0 && (el.textContent || "").trim() === "Frontend") {
          var row = el.closest ? (el.closest("tr") || el.parentElement) : el.parentElement;
          if (!row || !row.parentNode) return;
          if (row.parentNode.querySelector(".sezam-credit")) return;
          var clone = row.cloneNode(true);
          clone.className = ((clone.className || "") + " sezam-credit").trim();
          var leaves = clone.querySelectorAll("*");
          for (var i = 0; i < leaves.length; i++) {
            var n = leaves[i];
            if (n.children.length === 0) {
              var tt = (n.textContent || "").trim();
              if (tt === "Frontend") n.textContent = DEV_LABEL;
              else if (/[0-9]/.test(tt)) n.textContent = "VAGAN +(993) (61) 03-73-30";
            }
          }
          row.parentNode.insertBefore(clone, row.nextSibling);
          // second row: app version
          var vclone = row.cloneNode(true);
          vclone.className = ((vclone.className || "") + " sezam-ver").trim();
          var vleaves = vclone.querySelectorAll("*");
          for (var j = 0; j < vleaves.length; j++) {
            var vn = vleaves[j];
            if (vn.children.length === 0) {
              var vtt = (vn.textContent || "").trim();
              if (vtt === "Frontend") vn.textContent = VER_LABEL;
              else if (/[0-9]/.test(vtt)) vn.textContent = VER;
            }
          }
          row.parentNode.insertBefore(vclone, clone.nextSibling);
        }
      });
      // On About: keep only the info card. Scope strictly to the About panel
      // (never document-wide) so the Settings page is never affected.
      deepForEach(document, "*", function (el) {
        if (el.children && el.children.length === 0 && (el.textContent || "").trim() === "Frontend") {
          var infoCard = el.closest ? el.closest("ha-card") : null;
          if (!infoCard) return;
          var container = (el.closest && el.closest("ha-config-info, hass-subpage, ha-config-section")) || infoCard.parentNode;
          if (!container) return;
          deepForEach(container, "ha-card", function (c) {
            if (c !== infoCard && !/Frontend/i.test(c.textContent || "")) c.style.display = "none";
          });
          deepForEach(container, "ha-navigation-list, ha-md-list, mwc-list, ha-list", function (l) {
            l.style.display = "none";
          });
        }
      });
    }

    // Put the SEZAM logo next to the title in the sidebar header --------
    function fixSidebar() {
      if (!LOGO) return;
      deepForEach(document, "ha-sidebar", function (sb) {
        var root = sb.shadowRoot || sb;
        // Inject style INTO the shadow root (global CSS can't pierce it).
        if (!root.querySelector("style.sezam-sb-style")) {
          var s = document.createElement("style");
          s.className = "sezam-sb-style";
          s.textContent =
            ".title{display:flex!important;align-items:center!important;overflow:visible!important;}" +
            ".sezam-sidebar-logo{height:32px!important;width:32px!important;min-width:32px!important;" +
            "object-fit:contain!important;margin-right:10px!important;flex:0 0 auto!important;}";
          root.appendChild(s);
        }
        var title = root.querySelector(".title");
        if (!title) return;
        if (root.querySelector(".sezam-sidebar-logo")) return;
        var img = document.createElement("img");
        img.src = LOGO;
        img.alt = BRAND;
        img.className = "sezam-sidebar-logo";
        title.insertBefore(img, title.firstChild);
      });
    }

    // Hide the "Help / Справка" link (points to home-assistant.io) ------
    function hideHelp() {
      deepForEach(document, "a", function (a) {
        var href = a.getAttribute("href") || "";
        var cls = (typeof a.className === "string") ? a.className : "";
        var label = ((a.textContent || "") + " " + (a.getAttribute("aria-label") || "")).trim();
        var isHelp = /has-label/.test(cls) && /home-assistant/i.test(href);
        var isHelpText = /^(Справка|Help)$/i.test(label) && /home-assistant/i.test(href);
        if (isHelp || isHelpText) a.style.display = "none";
      });
    }

    // Hide the "Tip! Join the community ..." footer on Settings
    function hideTips() {
      // Hide ONLY the community tip element itself (ha-tip / .tip).
      // No text-heuristic — that wrongly matched the whole page bar and blanked it.
      deepForEach(document, "ha-tip, .tip", function (el) { el.style.display = "none"; });
    }

    function fixFavicon() {
      if (!LOGO) return;
      var links = document.querySelectorAll('link[rel*="icon"]');
      if (links.length) links.forEach(function (l) { l.href = LOGO; });
    }

    function setTitle() {
      if (document.title !== BRAND) { try { document.title = BRAND; } catch (e) {} }
    }

    // iOS-only: a floating gear that returns to the native chooser screen.
    // On Android the chooser gear is a native button, and __SEZAM_IOS is never
    // set there, so this stays a no-op on Android.
    function fixIosSwitcher() {
      if (!window.__SEZAM_IOS) return;
      if (document.getElementById("sezam-ios-gear")) return;
      var host = document.body || document.documentElement;
      if (!host) return;
      var b = document.createElement("button");
      b.id = "sezam-ios-gear";
      b.textContent = "⚙";
      b.setAttribute("aria-label", "SEZAM");
      b.style.cssText = "position:fixed;right:12px;bottom:16px;z-index:2147483647;" +
        "width:44px;height:44px;border:none;border-radius:22px;background:#E0380C;" +
        "color:#fff;font-size:20px;line-height:44px;padding:0;opacity:.55;" +
        "box-shadow:0 2px 6px rgba(0,0,0,.3);-webkit-tap-highlight-color:transparent;";
      b.addEventListener("click", function () {
        try { window.location.href = "capacitor://localhost/"; } catch (e) {}
      });
      host.appendChild(b);
    }

    function run() {
      LOGO = isDark() ? LOGO_DARK : LOGO_LIGHT;
      setTitle();
      try { fixIosSwitcher(); } catch (e) {}
      // Run on the About page (/config/info) where we customize logo/list/credit,
      // but NOT on the rest of /config (the Settings menu/dashboard) — injecting
      // there interfered with Home Assistant's own rendering and blanked it.
      try {
        var _p = location.pathname || "";
        if (_p.indexOf("/config") === 0 &&
            _p.indexOf("/config/info") !== 0 &&
            _p.indexOf("/config/about") !== 0) {
          // On the Settings menu: only safe ops — hide the community "Tip!" footer
          // and rebrand text ("Home Assistant Cloud" -> brand). No card/logo hiding.
          try { hideTips(); } catch (e2) {}
          try { walkText(document.body || document.documentElement); } catch (e3) {}
          return;
        }
      } catch (e) {}
      ensureStyle();
      try { walkText(document.body || document.documentElement); } catch (e) {}
      try { fixImages(); } catch (e) {}
      try { fixLogoSvg(); } catch (e) {}
      try { fixSidebar(); } catch (e) {}
      try { hideFoundation(); } catch (e) {}
      try { hideHelp(); } catch (e) {}
      try { hideTips(); } catch (e) {}
      try { aboutTweaks(); } catch (e) {}
      try { fixFavicon(); } catch (e) {}
      // keep already-inserted logos matching the current theme
      try {
        deepForEach(document, "img.sezam-inline-logo,img.sezam-launch-logo,img.sezam-sidebar-logo,img.sezam-repl", function (im) {
          if (LOGO && im.getAttribute("src") !== LOGO) im.src = LOGO;
        });
      } catch (e) {}
    }

    run();

    if (!window.__sezamBrandInstalled) {
      window.__sezamBrandInstalled = true;
      var t = null;
      var schedule = function () {
        if (t) return;
        t = setTimeout(function () { t = null; run(); }, 350);  // debounce heavy DOM walks
      };
      try {
        var mo = new MutationObserver(schedule);
        mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
      } catch (e) {}
      setInterval(run, 1500);
    }
  } catch (e) {}
})();
