(function () {
  const icons = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />',
    briefcase:
      '<rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />',
    phone:
      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />',
    file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />',
    close:
      '<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />',
    search: '<circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />',
  };

  const svg = (name) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    icons[name] +
    "</svg>";

  const clean = (value) => value.replace(/\.html$/, "");
  const currentPage = clean(location.pathname.split("/").pop() || "index.html");

  const groups = [
    {
      title: "Home",
      items: [
        { label: "About", href: "index.html#about" },
        { label: "Skills", href: "index.html#skills" },
        { label: "Projects", href: "index.html#projects" },
        { label: "Contact", href: "index.html#contact" },
      ],
    },
    {
      title: "Navigation",
      items: [
        { label: "Home", href: "index.html", icon: "home" },
        { label: "Projects", href: "projects.html", icon: "briefcase" },
        { label: "Contact", href: "index.html#contact", icon: "phone" },
        { label: "Resume", href: "resume.html", icon: "file" },
      ],
    },
    {
      title: "Projects",
      items: [
        {
          prefix: "projects",
          label: "AlbumScope",
          href: "projects.html#albumscope",
          icon: "file",
        },
        {
          prefix: "projects",
          label: "CSA-CTA",
          href: "projects.html#csa-cta",
          icon: "file",
        },
      ],
    },
  ];

  function go(href) {
    const parts = href.split("#");
    if (clean(parts[0]) === currentPage) {
      const target = parts[1] ? document.getElementById(parts[1]) : null;
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
        history.replaceState(null, "", "#" + parts[1]);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    location.href = href;
  }

  function labelHtml(item) {
    if (item.prefix) {
      return (
        '<span class="nav-prefix">' +
        item.prefix +
        '</span><span class="nav-sep">/</span><span>' +
        item.label +
        "</span>"
      );
    }
    return "<span>" + item.label + "</span>";
  }

  const paletteOverlay = document.createElement("div");
  paletteOverlay.className = "overlay";
  paletteOverlay.innerHTML =
    '<div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">' +
    '<div class="palette-search">' +
    svg("search") +
    '<input class="palette-input" type="text" placeholder="Type a command or search..." aria-label="Search" autocomplete="off" spellcheck="false" />' +
    "</div>" +
    '<div class="palette-list" role="listbox"></div>' +
    "</div>";

  const drawerOverlay = document.createElement("div");
  drawerOverlay.className = "overlay";

  const isActive = (item) =>
    !item.href.includes("#") && clean(item.href) === currentPage;

  function drawerLink(item) {
    const icon = item.icon ? svg(item.icon) : "";
    const active = isActive(item) ? ' is-active" aria-current="page' : "";
    return (
      '<a class="drawer-link' +
      active +
      '" href="' +
      item.href +
      '">' +
      icon +
      labelHtml(item) +
      "</a>"
    );
  }

  drawerOverlay.innerHTML =
    '<aside class="drawer" role="dialog" aria-modal="true" aria-label="Navigation">' +
    '<div class="drawer-head"><h2 class="drawer-title">Navigation</h2>' +
    '<button type="button" class="drawer-close" aria-label="Close menu">' +
    svg("close") +
    "</button></div>" +
    '<nav class="drawer-nav">' +
    groups[1].items.map(drawerLink).join("") +
    '<div class="drawer-divider"></div><p class="label drawer-label">Projects</p>' +
    groups[2].items.map(drawerLink).join("") +
    "</nav></aside>";

  document.body.appendChild(paletteOverlay);
  document.body.appendChild(drawerOverlay);

  const input = paletteOverlay.querySelector(".palette-input");
  const list = paletteOverlay.querySelector(".palette-list");
  const entries = [];

  groups.forEach((group) => {
    const heading = document.createElement("div");
    heading.className = "palette-group";
    heading.textContent = group.title;
    list.appendChild(heading);
    const groupEntries = [];
    group.items.forEach((item) => {
      const node = document.createElement("button");
      node.type = "button";
      node.className = "palette-item";
      node.setAttribute("role", "option");
      node.innerHTML = (item.icon ? svg(item.icon) : "") + labelHtml(item);
      node.addEventListener("click", () => {
        closeAll();
        go(item.href);
      });
      list.appendChild(node);
      const entry = {
        node: node,
        href: item.href,
        text: (
          (item.prefix || "") +
          " " +
          item.label +
          " " +
          group.title
        ).toLowerCase(),
      };
      entries.push(entry);
      groupEntries.push(entry);
    });
    heading.groupEntries = groupEntries;
  });

  const empty = document.createElement("p");
  empty.className = "palette-empty";
  empty.textContent = "No results found.";
  empty.hidden = true;
  list.appendChild(empty);

  const headings = list.querySelectorAll(".palette-group");
  let selected = 0;

  function visibleEntries() {
    return entries.filter((entry) => !entry.node.hidden);
  }

  function select(index) {
    const visible = visibleEntries();
    if (!visible.length) return;
    selected = (index + visible.length) % visible.length;
    entries.forEach((entry) =>
      entry.node.setAttribute("aria-selected", "false"),
    );
    const current = visible[selected];
    current.node.setAttribute("aria-selected", "true");
    current.node.scrollIntoView({ block: "nearest" });
  }

  function filter() {
    const query = input.value.trim().toLowerCase();
    entries.forEach((entry) => {
      entry.node.hidden = query !== "" && !entry.text.includes(query);
    });
    headings.forEach((heading) => {
      heading.hidden = heading.groupEntries.every((entry) => entry.node.hidden);
    });
    empty.hidden = visibleEntries().length > 0;
    select(0);
  }

  input.addEventListener("input", filter);

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      select(selected + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      select(selected - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const visible = visibleEntries();
      if (visible[selected]) visible[selected].node.click();
    }
  });

  entries.forEach((entry) => {
    entry.node.addEventListener("mousemove", () => {
      const index = visibleEntries().indexOf(entry);
      if (index !== selected) select(index);
    });
  });

  const menuBtn = document.getElementById("menu-btn");
  const searchBtn = document.getElementById("search-btn");

  function lock() {
    const open =
      paletteOverlay.classList.contains("is-open") ||
      drawerOverlay.classList.contains("is-open");
    document.body.style.overflow = open ? "hidden" : "";
  }

  function openPalette() {
    closeDrawer();
    paletteOverlay.classList.add("is-open");
    input.value = "";
    filter();
    lock();
    input.focus();
  }

  function closePalette() {
    paletteOverlay.classList.remove("is-open");
    lock();
  }

  function openDrawer() {
    closePalette();
    drawerOverlay.classList.add("is-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
    lock();
  }

  function closeDrawer() {
    drawerOverlay.classList.remove("is-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    lock();
  }

  function closeAll() {
    closePalette();
    closeDrawer();
  }

  if (searchBtn) searchBtn.addEventListener("click", openPalette);
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      if (drawerOverlay.classList.contains("is-open")) closeDrawer();
      else openDrawer();
    });
  }

  paletteOverlay.addEventListener("click", (event) => {
    if (event.target === paletteOverlay) closePalette();
  });

  drawerOverlay.addEventListener("click", (event) => {
    if (event.target === drawerOverlay) closeDrawer();
  });

  drawerOverlay
    .querySelector(".drawer-close")
    .addEventListener("click", closeDrawer);

  drawerOverlay.querySelectorAll(".drawer-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      closeDrawer();
      go(link.getAttribute("href"));
    });
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (paletteOverlay.classList.contains("is-open")) closePalette();
      else openPalette();
    } else if (event.key === "Escape") {
      closeAll();
    }
  });

  window
    .matchMedia("(min-width: 768px)")
    .addEventListener("change", (event) => {
      if (event.matches) closeDrawer();
    });
})();
