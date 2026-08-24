(function () {
  var scripts = document.querySelectorAll('script[src*="/embed/form/"]');
  var seen = new Set();
  function mount(target, embedId) {
    if (!embedId || seen.has(embedId + ":" + target.dataset.prestateMounted)) return;
    target.dataset.prestateMounted = "1";
    seen.add(embedId);
    var iframe = document.createElement("iframe");
    var src = target.getAttribute("data-prestate-src") || (new URL(target.src || location.href).origin + "/embed/form/" + encodeURIComponent(embedId));
    // If this script tag itself carries the embed id in its src, derive it.
    if (!embedId) {
      var m = (target.src || "").match(/\/embed\/form\/([^\/?#\.]+)/);
      embedId = m ? decodeURIComponent(m[1]) : "";
      src = location.origin + "/embed/form/" + encodeURIComponent(embedId);
    }
    iframe.src = src;
    iframe.title = "Prestate form " + embedId;
    iframe.style.width = "100%";
    iframe.style.minHeight = "720px";
    iframe.style.border = "0";
    iframe.loading = "lazy";
    iframe.setAttribute("allow", "fullscreen");
    // Auto-resize via postMessage if the embed posts its height
    window.addEventListener("message", function (e) {
      if (e.data && e.data.prestateEmbedId === embedId && e.data.height) {
        iframe.style.height = e.data.height + "px";
      }
    });
    // Also support div[data-prestate-form] placement
    var holder = document.querySelector('[data-prestate-form="' + embedId + '"]');
    if (holder) {
      holder.innerHTML = "";
      holder.appendChild(iframe);
    } else {
      target.parentNode.insertBefore(iframe, target.nextSibling);
    }
  }
  // 1) Script tag with src /embed/form/ID.js
  scripts.forEach(function (s) {
    var m = s.src.match(/\/embed\/form\/([^\/?#\.]+)(?:\.js)?/);
    if (m) mount(s, decodeURIComponent(m[1]));
  });
  // 2) Div placeholders: <div data-prestate-form="ID"></div>
  document.querySelectorAll("[data-prestate-form]").forEach(function (el) {
    var id = el.getAttribute("data-prestate-form");
    if (id && !el.dataset.prestateMounted) {
      var iframe = document.createElement("iframe");
      iframe.src = (document.currentScript ? new URL(document.currentScript.src).origin : location.origin) + "/embed/form/" + encodeURIComponent(id);
      iframe.title = "Prestate form " + id;
      iframe.style.width = "100%";
      iframe.style.minHeight = "720px";
      iframe.style.border = "0";
      el.innerHTML = "";
      el.appendChild(iframe);
      el.dataset.prestateMounted = "1";
    }
  });
})();
