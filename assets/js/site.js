/* Nostalgia Portal — behaviour: era skins, routing, widgets, memory wall, particles. */
(function () {
  "use strict";

  var D = window.NP_DATA;
  var ERAS = Object.keys(D.eras);
  var view = document.getElementById("view");
  var root = document.documentElement;

  /* ── storage (never throws) ── */
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function wayback(ts) { return "https://web.archive.org/web/" + ts + "/http://www.worldofwarcraft.com/"; }
  function waybackYear(y) { return "https://web.archive.org/web/" + y + "*/worldofwarcraft.com"; }

  /* ── era ── */
  var era = (function () {
    var q = new URLSearchParams(location.search).get("era");
    if (ERAS.indexOf(q) !== -1) return q;
    var s = store.get("np.era", "classic");
    return ERAS.indexOf(s) !== -1 ? s : "classic";
  })();

  function setEra(next, opts) {
    if (ERAS.indexOf(next) === -1) return;
    era = next;
    root.setAttribute("data-era", era);
    store.set("np.era", era);
    try {
      var u = new URL(location.href);
      u.searchParams.set("era", era);
      history.replaceState(null, "", u);
    } catch (e) { /* file:// in some browsers */ }
    document.querySelectorAll(".era-switch [data-set-era]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-set-era") === era));
    });
    document.getElementById("era-ribbon").textContent = D.eras[era].tagline;
    renderSide();
    if (!opts || opts.render !== false) render();
    motes.reset();
  }

  /* ── routing ── */
  function route() {
    var h = location.hash.replace(/^#\/?/, "").split("/")[0];
    return h || "news";
  }

  var pages = {
    news: pageNews,
    timeline: pageTimeline,
    "time-machine": pageTimeMachine,
    memories: pageMemories,
    about: pageAbout
  };

  function render() {
    var r = route();
    var fn = pages[r] || pageNotFound;
    view.innerHTML = fn();
    if (r === "news") wireBanner();
    if (r === "memories") wireWall();
    document.querySelectorAll(".leftnav a").forEach(function (a) {
      var match = a.getAttribute("href") === "#/" + r && !a.hasAttribute("data-set-era") &&
        !a.hasAttribute("data-focus") && !a.hasAttribute("data-scroll");
      a.classList.toggle("is-current", match);
    });
    document.title = (pageTitles[r] || "Lost in the archives") + " · Nostalgia Portal";
  }

  var pageTitles = {
    news: "Museum Notes", timeline: "Era Timeline", "time-machine": "Time Machine",
    memories: "Memory Wall", about: "About"
  };

  /* ── shared bits ── */
  function post(p, open) {
    return '<details class="parch post"' + (open ? " open" : "") + ">" +
      '<summary class="post-head"><i class="icon icon-' + esc(p.icon || "quill") + '"></i>' +
      '<span class="post-titles"><span class="post-title">' + esc(p.title) + "</span>" +
      '<span class="post-meta">Posted by: <b>The Curator</b> &nbsp;|&nbsp; ' + esc(p.date) + "</span></span>" +
      '<i class="toggle"></i></summary>' +
      '<div class="post-body">' + p.body + "</div></details>";
  }

  function pageHead(title, sub) {
    return '<div class="parch pagehead"><h1>' + esc(title) + "</h1>" + (sub ? "<p>" + sub + "</p>" : "") + "</div>";
  }

  /* ── page: news ── */
  function pageNews() {
    var e = D.eras[era];
    var html = '<div class="banner" id="banner">' +
      '<div class="banner-art"><i class="lantern lantern-l"></i><i class="lantern lantern-r"></i></div>' +
      '<p class="banner-welcome"><span>Welcome</span> ' + esc(e.welcome) + "</p>" +
      '<button type="button" class="plugin" id="plugin"><span class="plugin-top">plugin not found</span>' +
      '<span class="plugin-bot">▶ play it anyway</span></button>' +
      '<p class="banner-line" id="banner-line" aria-live="polite"></p>' +
      "</div>";

    html += D.posts[era].map(function (p) { return post(p, true); }).join("");

    html += '<div class="rows">' + D.headlines[era].map(function (h) {
      return '<details class="row"><summary><i class="icon icon-dot"></i><span class="row-title">' + esc(h.title) +
        '</span><span class="row-by">The Curator</span><span class="row-date">' + esc(h.date) +
        '</span><i class="toggle"></i></summary><div class="row-body">' + esc(h.body) + "</div></details>";
    }).join("") + "</div>";
    return html;
  }

  function wireBanner() {
    var btn = document.getElementById("plugin");
    var line = document.getElementById("banner-line");
    var banner = document.getElementById("banner");
    if (!btn) return;
    var lines = D.eras[era].remember;
    var i = Math.floor(Math.random() * lines.length);
    function show() {
      if (!document.body.contains(line)) { clearInterval(timer); return; }
      line.classList.remove("in");
      void line.offsetWidth;
      line.textContent = "Remember when " + lines[i % lines.length];
      line.classList.add("in");
      i++;
    }
    var timer;
    btn.addEventListener("click", function () {
      banner.classList.add("loading");
      btn.querySelector(".plugin-top").textContent = "loading memories";
      btn.querySelector(".plugin-bot").textContent = "please wait…";
      btn.disabled = true;
      setTimeout(function () {
        if (!document.body.contains(banner)) return;
        banner.classList.remove("loading");
        banner.classList.add("playing");
        show();
        timer = setInterval(show, 6500);
      }, 1400);
    });
  }

  /* ── page: timeline ── */
  function pageTimeline() {
    var html = pageHead("Era Timeline", "Six years of one website, told in dates. The rows for the era you are wearing are highlighted.");
    html += '<div class="parch tl"><ol>';
    D.timeline.forEach(function (t) {
      html += '<li class="tl-item tl-' + t.era + (t.era === era ? " is-era" : "") + '">' +
        '<span class="tl-date">' + esc(t.date) + '</span><span class="tl-text">' + esc(t.text) + "</span></li>";
    });
    html += "</ol></div>";
    return html;
  }

  /* ── page: time machine ── */
  function pageTimeMachine() {
    var html = pageHead("Time Machine",
      "The real pages still exist, preserved by the Internet Archive's Wayback Machine. These links leave this " +
      "site and open the archive. It lands on the nearest capture it holds to the date shown, so the day may be " +
      "off by a little — and some images and animated banners never survived.");
    var order = [era].concat(ERAS.filter(function (k) { return k !== era; }));
    order.forEach(function (k) {
      var c = D.captures[k], e = D.eras[k];
      html += '<section class="parch tm tm-' + k + '"><h2><i class="swatch swatch-' + k + '"></i>' + esc(e.name) +
        ' <small>' + esc(e.years) + "</small></h2><div class=\"tm-grid\">";
      c.list.forEach(function (x) {
        html += '<a class="tm-card" href="' + wayback(x.ts) + '" target="_blank" rel="noopener">' +
          '<span class="tm-label">' + esc(x.label) + '</span><span class="tm-note">' + esc(x.note) +
          '</span><span class="tm-go">Open capture ↗</span></a>';
      });
      html += '</div><p class="tm-years">Browse every capture: ' + c.years.map(function (y) {
        return '<a href="' + waybackYear(y) + '" target="_blank" rel="noopener">' + y + "</a>";
      }).join(" · ") + "</p></section>";
    });
    return html;
  }

  /* ── page: memory wall ── */
  function memories() { return store.get("np.memories", []); }

  function pageMemories() {
    var html = pageHead("Memory Wall",
      "What do you remember? Pin a note to the wall. Notes are saved in <strong>this browser only</strong> — " +
      "this is a static site with no server behind it, so nobody else can see them and clearing your browser " +
      "data takes them down.");
    html += '<form class="parch wallform" id="wallform" novalidate>' +
      '<div class="field"><label for="memory-name">Your name</label><input id="memory-name" maxlength="40" placeholder="Anonymous adventurer"></div>' +
      '<div class="field"><label for="memory-main">You mostly played…</label><input id="memory-main" maxlength="40" placeholder="e.g. a healer who never had enough mana"></div>' +
      '<div class="field"><label for="memory-era">Era</label><select id="memory-era">' +
      ERAS.map(function (k) {
        return '<option value="' + k + '"' + (k === era ? " selected" : "") + ">" + esc(D.eras[k].name) + " (" + esc(D.eras[k].years) + ")</option>";
      }).join("") + "</select></div>" +
      '<div class="field field-wide"><label for="memory-text">Your memory</label>' +
      '<textarea id="memory-text" rows="4" maxlength="600" placeholder="The first thing that comes to mind…"></textarea>' +
      '<span class="count" id="memory-count">0 / 600</span></div>' +
      '<p class="formerr" id="memory-err" role="alert"></p>' +
      '<button type="submit" class="btn">Pin it to the wall</button></form>';
    html += '<div class="wall" id="wall"></div>';
    return html;
  }

  function drawWall() {
    var wall = document.getElementById("wall");
    if (!wall) return;
    var mine = memories();
    var all = mine.map(function (m, i) { return { m: m, i: i }; }).reverse()
      .concat(D.seedMemories.map(function (m) { return { m: m, i: -1 }; }));
    wall.innerHTML = all.map(function (x) {
      var m = x.m, e = D.eras[m.era] || D.eras.classic;
      return '<article class="note note-' + esc(m.era) + '"><p class="note-text">' + esc(m.text) + "</p>" +
        '<p class="note-by">— <b>' + esc(m.name || "Anonymous adventurer") + "</b>" +
        (m.main ? ", " + esc(m.main) : "") + '<span class="note-era">' + esc(e.name) + "</span></p>" +
        (x.i >= 0 ? '<button type="button" class="note-del" data-del="' + x.i + '" aria-label="Remove this note">×</button>' : "") +
        "</article>";
    }).join("");
  }

  function wireWall() {
    drawWall();
    var form = document.getElementById("wallform");
    var text = document.getElementById("memory-text");
    var count = document.getElementById("memory-count");
    var err = document.getElementById("memory-err");
    text.addEventListener("input", function () { count.textContent = text.value.length + " / 600"; err.textContent = ""; });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var t = text.value.trim();
      if (!t) { err.textContent = "Write a memory first — even one line counts."; text.focus(); return; }
      var list = memories();
      list.push({
        name: document.getElementById("memory-name").value.trim().slice(0, 40),
        main: document.getElementById("memory-main").value.trim().slice(0, 40),
        era: document.getElementById("memory-era").value,
        text: t.slice(0, 600),
        ts: Date.now()
      });
      store.set("np.memories", list);
      text.value = ""; count.textContent = "0 / 600";
      drawWall();
    });
    document.getElementById("wall").addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-del]");
      if (!b) return;
      var list = memories();
      list.splice(Number(b.getAttribute("data-del")), 1);
      store.set("np.memories", list);
      drawWall();
    });
  }

  /* ── page: about ── */
  function pageAbout() {
    return pageHead("About This Site", "A small museum for a very particular kind of web page.") +
      post({
        icon: "hourglass", title: "What this is", date: "Read me",
        body: "<p>Between 2004 and 2010 the game's community site kept one stone-and-parchment layout and simply " +
          "<em>re-dressed</em> it for every expansion: warm brown, then fel green, then frost blue. For a lot of " +
          "people that page was a daily habit, and seeing its colours again is an instant trip back.</p>" +
          "<p>Nostalgia Portal is a fan-made tribute to that idea. Use the era switch at the top to change the " +
          "whole site's skin, read the museum notes for each era, browse the timeline, and pin your own memories " +
          "to the wall.</p>"
      }, true) +
      post({
        icon: "frame", title: "What this is not", date: "Read me",
        body: "<p>It is not a copy of the original site. The logos, character paintings, screenshots and articles " +
          "from those pages belong to their owner, so none of them are here. The scenery, crest, icons and text on " +
          "this site were all made from scratch for this project.</p>" +
          "<p>If you want the real thing, exactly as it was, the <a href=\"#/time-machine\">Time Machine</a> links " +
          "straight to the preserved pages at the Internet Archive.</p>"
      }, true) +
      '<div id="legal">' + post({
        icon: "quill", title: "Legal & credits", date: "Read me",
        body: "<p>This is an unofficial, non-commercial fan project. It is not affiliated with, endorsed by, or " +
          "sponsored by Blizzard Entertainment. World of Warcraft, The Burning Crusade and Wrath of the Lich King " +
          "are trademarks or registered trademarks of Blizzard Entertainment, Inc., used here only to refer to the " +
          "periods being remembered.</p>" +
          "<p>Archived pages are served by the Internet Archive's Wayback Machine. Dates in the timeline are public " +
          "release dates.</p>"
      }, true) + "</div>";
  }

  function pageNotFound() {
    return pageHead("Lost in the archives", 'That page is not in the museum. <a href="#/news">Back to the museum notes</a>.');
  }

  /* ── sidebar widgets ── */
  function dayNumber() {
    var n = new Date();
    return Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 86400000);
  }

  function renderSide() {
    var e = D.eras[era], c = D.captures[era];
    document.getElementById("quick").innerHTML = [
      ['<a href="' + waybackYear(c.years[0]) + '" target="_blank" rel="noopener">' + c.years[0] + " capture calendar ↗</a>"],
      ['<a href="#/time-machine">' + esc(e.name) + " captures</a>"],
      ['<a href="#/timeline">Era timeline</a>'],
      ['<a href="#/memories">Sign the memory wall</a>'],
      ['<a href="#/about">What is this place?</a>']
    ].map(function (x) { return "<li><i class=\"orb\"></i>" + x[0] + "</li>"; }).join("");

    var pick = c.list[dayNumber() % c.list.length];
    var cotd = document.getElementById("cotd");
    cotd.href = wayback(pick.ts);
    document.getElementById("cotd-date").textContent = pick.label;
    document.getElementById("cotd-link").textContent = "Open the " + pick.label + " capture ↗";

    var day = dayNumber();
    document.getElementById("realms").innerHTML = D.realms.map(function (name, i) {
      var roll = (day * 31 + i * 17 + ERAS.indexOf(era) * 7) % 11;
      var st = roll === 0 ? "down" : roll < 3 ? "full" : "up";
      return '<li><i class="led led-' + st + '"></i>' + esc(name) + '<span class="realm-st">' +
        (st === "up" ? "Up" : st === "full" ? "Full" : "Down") + "</span></li>";
    }).join("");
    document.getElementById("realm-note").textContent = new Date().getDay() === 2
      ? "It's Tuesday. Maintenance has been extended by two hours."
      : "These realms are fictional. The queues were real.";
  }

  function countVisit() {
    var n = store.get("np.visits", 0);
    var seen = false;
    try { seen = sessionStorage.getItem("np.seen") === "1"; sessionStorage.setItem("np.seen", "1"); } catch (e) { /* ok */ }
    if (!seen) { n += 1; store.set("np.visits", n); }
    var s = String(Math.max(n, 1));
    while (s.length < 6) s = "0" + s;
    document.getElementById("visits").innerHTML = s.split("").map(function (d) { return "<b>" + d + "</b>"; }).join("");
  }

  /* ── stars in every scene ── */
  function sowStars() {
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    document.querySelectorAll("[data-stars]").forEach(function (g) {
      var out = "";
      for (var i = 0; i < 130; i++) {
        var r = rnd() < 0.12 ? 1.6 : 0.9;
        out += '<circle cx="' + Math.round(rnd() * 1600) + '" cy="' + Math.round(rnd() * 560) + '" r="' + r +
          '" fill="#fff" opacity="' + (0.25 + rnd() * 0.6).toFixed(2) + '"/>';
      }
      g.innerHTML = out;
    });
  }

  /* ── drifting motes: embers / fel sparks / snow ── */
  var motes = (function () {
    var cv = document.getElementById("motes");
    var ctx = cv.getContext("2d");
    var still = window.matchMedia("(prefers-reduced-motion: reduce)");
    var parts = [], w = 0, h = 0, raf = 0;
    var kinds = {
      classic: { n: 46, color: [255, 170, 70], vy: [-0.5, -0.15], size: [1, 2.4], sway: 0.35 },
      outland: { n: 54, color: [140, 255, 80], vy: [-0.7, -0.2], size: [1, 2.8], sway: 0.6 },
      northrend: { n: 90, color: [230, 245, 255], vy: [0.35, 1.1], size: [1, 2.6], sway: 0.5 }
    };
    function size() { w = cv.width = innerWidth; h = cv.height = innerHeight; }
    function spawn(k, anywhere) {
      var up = k.vy[1] < 0;
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : (up ? h + 8 : -8),
        vy: k.vy[0] + Math.random() * (k.vy[1] - k.vy[0]),
        r: k.size[0] + Math.random() * (k.size[1] - k.size[0]),
        a: 0.25 + Math.random() * 0.6, p: Math.random() * 6.28
      };
    }
    function reset() {
      cancelAnimationFrame(raf);
      size();
      ctx.clearRect(0, 0, w, h);
      if (still.matches) { parts = []; return; }
      var k = kinds[era];
      parts = [];
      for (var i = 0; i < k.n; i++) parts.push(spawn(k, true));
      raf = requestAnimationFrame(tick);
    }
    function tick() {
      var k = kinds[era];
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.p += 0.02; p.y += p.vy; p.x += Math.sin(p.p) * k.sway;
        if (p.y < -10 || p.y > h + 10) parts[i] = p = spawn(k, false);
        ctx.fillStyle = "rgba(" + k.color.join(",") + "," + (p.a * (0.6 + 0.4 * Math.sin(p.p * 2))).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    addEventListener("resize", function () { size(); });
    document.addEventListener("visibilitychange", function () {
      cancelAnimationFrame(raf);
      if (!document.hidden && parts.length) raf = requestAnimationFrame(tick);
    });
    if (still.addEventListener) still.addEventListener("change", reset);
    return { reset: reset };
  })();

  /* ── global wiring ── */
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-set-era]");
    if (t) {
      var isLink = t.tagName === "A";
      var sameRoute = isLink && t.getAttribute("href") === location.hash;
      setEra(t.getAttribute("data-set-era"), { render: !isLink || sameRoute });
      if (isLink && sameRoute) ev.preventDefault();
    }
    var a = ev.target.closest("a[data-focus], a[data-scroll]");
    if (a) {
      var id = a.getAttribute("data-focus") || a.getAttribute("data-scroll");
      var focus = a.hasAttribute("data-focus");
      setTimeout(function () {
        var el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({ block: "center" });
        if (focus) el.focus({ preventScroll: true });
      }, 60);
    }
  });

  addEventListener("hashchange", function () {
    render();
    view.focus({ preventScroll: true });
    if (innerWidth < 760) view.scrollIntoView();
    else scrollTo(0, 0);
  });

  /* remember which nav groups are open */
  var navState = store.get("np.nav", {});
  document.querySelectorAll(".navgroup").forEach(function (d) {
    var k = d.getAttribute("data-nav");
    if (k in navState) d.open = navState[k];
    d.addEventListener("toggle", function () { navState[k] = d.open; store.set("np.nav", navState); });
  });

  sowStars();
  countVisit();
  setEra(era);
})();
