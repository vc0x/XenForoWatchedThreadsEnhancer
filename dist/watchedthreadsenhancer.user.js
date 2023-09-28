// ==UserScript==
// @name       Watched Threads Enhancer
// @namespace  https://github.com/azzlover
// @version    1.0.0
// @author     azzlover
// @icon       https://simp4.jpg.church/simpcityIcon192.png
// @match      https://*.simpcity.su/watched/threads*
// @grant      GM_getValue
// @grant      GM_setClipboard
// @grant      GM_setValue
// ==/UserScript==

(async function () {
  'use strict';

  var _a, _b;
  var _GM_getValue = /* @__PURE__ */ (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
  var _GM_setClipboard = /* @__PURE__ */ (() => typeof GM_setClipboard != "undefined" ? GM_setClipboard : void 0)();
  var _GM_setValue = /* @__PURE__ */ (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
  const parseThreads = (el) => {
    return [...el.querySelectorAll(".structItem--thread")].map((thread) => {
      const unread = thread.classList.contains("is-unread");
      const main = thread.querySelector(".structItem-cell--main");
      const meta = thread.querySelector(".structItem-cell--meta");
      const latest = thread.querySelector(".structItem-cell--latest");
      const titleContainer = main.querySelector(".structItem-title");
      const titleEl = titleContainer.querySelector("a:last-child");
      const url = titleEl.href;
      const title = titleEl.textContent;
      const labels = [...titleContainer.querySelectorAll("a:not(:last-child)")].map(
        (a) => a.querySelector("span").textContent
      );
      const author = main.querySelector(".structItem-minor > .structItem-parts > li > a").textContent;
      const threadStartTimestamp = Number(
        main.querySelector(
          ".structItem-minor > .structItem-parts > .structItem-startDate > a > time"
        ).getAttribute("data-time")
      );
      const replies = meta.querySelector("dl > dd").textContent;
      const views = meta.querySelector("dl:nth-child(2) > dd").textContent;
      const lastReplyTimestamp = Number(
        latest.querySelector(".structItem-latestDate").getAttribute("data-time")
      );
      const id = Number(/\d+(?=\/)/.exec(url)[0]);
      return {
        id,
        unread,
        raw: thread.outerHTML.trim(),
        title,
        labels,
        author,
        threadStartTimestamp,
        lastReplyTimestamp,
        replies,
        views,
        url
      };
    });
  };
  const cacheThreads = async (page) => {
    const parser = new DOMParser();
    const threads = [];
    const url = `https://simpcity.su/watched/threads?page=${page}`;
    await new Promise((resolve, reject) => {
      fetch(url, {
        referrer: url
      }).then((response) => response.text()).then((text) => {
        const document2 = parser.parseFromString(text, "text/html");
        threads.push(...parseThreads(document2));
        resolve(true);
      }).catch((e) => reject(e));
    });
    return new Promise((resolve) => resolve(threads));
  };
  const writeTextToFile = (data, fileName) => {
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    const blob = new Blob([data], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  const addSearchInput = (parent, onInput) => {
    const input = document.createElement("input");
    input.id = "filter-wt";
    input.className = "input";
    input.placeholder = "Search...";
    input.autocomplete = "off";
    input.style.borderRadius = "1px";
    input.addEventListener("input", (e) => {
      onInput(e.target.value);
    });
    input.addEventListener("mouseenter", (e) => {
      e.target.focus();
    });
    parent.insertAdjacentElement("beforebegin", input);
    return input;
  };
  const addLabelTabsContainer = (parent) => {
    const tabHeader = document.createElement("h4");
    tabHeader.setAttribute("class", "menu-tabHeader tabs");
    tabHeader.setAttribute("data-xf-init", "tabs");
    tabHeader.innerHTML = `
<span class="hScroller" data-xf-init="h-scroller">
 <span class="hScroller-scroll" id="label-tabs-container">
 </span><i class="hScroller-action hScroller-action--end" aria-hidden="true"></i><i class="hScroller-action hScroller-action--start" aria-hidden="true"></i>
 </span>
`;
    parent.prepend(tabHeader);
    const container = document.getElementById("label-tabs-container");
    if (container) {
      container.addEventListener("wheel", (e) => {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      });
    }
  };
  const clearTabs = () => {
    const container = document.querySelector("#label-tabs-container");
    if (!container) {
      return;
    }
    container.innerHTML = "";
  };
  const addTab = (id, label, onClick) => {
    const container = document.querySelector("#label-tabs-container");
    if (!container) {
      return;
    }
    const tab = document.createElement("a");
    tab.href = "#";
    tab.id = `label-${id}`;
    tab.className = "tabs-tab";
    tab.setAttribute("role", "tab");
    tab.innerHTML = label;
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      onClick();
    });
    container.append(tab);
  };
  const activateTab = (label) => {
    const tab = document.getElementById(`label-${label.toLowerCase()}`);
    if (!tab) {
      return false;
    }
    [...document.querySelectorAll(`a[id^="label-"]`)].filter((a) => a.id !== `label-${label.toLowerCase()}`).forEach((a) => {
      if (a.classList.contains("is-active")) {
        a.classList.remove("is-active");
      }
    });
    if (!tab.classList.contains("is-active")) {
      tab.classList.add("is-active");
      tab.click();
      return true;
    }
    return false;
  };
  const addButton = (text, addMargin, onClick) => {
    const container = document.querySelector(".pageNav--skipEnd");
    if (!container) {
      return;
    }
    const id = Math.round(Math.random() * Number.MAX_SAFE_INTEGER);
    const btn = document.createElement("a");
    btn.href = "#";
    btn.id = `btn-${id}`;
    btn.className = "pageNav-jump";
    btn.innerHTML = text;
    if (addMargin) {
      btn.style.marginLeft = "6px";
    }
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      onClick(btn);
    });
    container.append(btn);
    return btn;
  };
  const updateButtonText = (button, text) => {
    button.innerHTML = text;
  };
  const originalBodyHtml = document.body.outerHTML;
  let queriedThreads = [];
  let btnCopyThreads = null;
  let btnExportThreads = null;
  let searchInput = null;
  const isCached = _GM_getValue("cached", false);
  const lastPageEl = document.querySelector(".pageNav-main > li:nth-last-child(1)");
  const totalPages = lastPageEl ? Number(lastPageEl.textContent) : 1;
  if (isCached) {
    document.querySelectorAll(".pageNav-main").forEach((nav) => nav.remove());
    (_a = document.querySelector(".pageNav > a")) == null ? void 0 : _a.remove();
    (_b = document.querySelector(".block-outer--after > .pageNavWrapper")) == null ? void 0 : _b.remove();
  }
  const updatePageTitle = (title) => {
    const el = document.querySelector(".p-title-value");
    if (el) {
      el.innerHTML = title;
    }
  };
  const getCachedThreads = () => JSON.parse(_GM_getValue("watched_threads", "[]"));
  const updateCopyThreadsButtonText = (threads) => {
    if (btnCopyThreads) {
      updateButtonText(
        btnCopyThreads,
        threads.length === 1 ? "Copy Thread" : `Copy ${threads.length} Threads`
      );
    }
  };
  const updateExportThreadsButtonText = (threads) => {
    if (btnExportThreads) {
      updateButtonText(
        btnExportThreads,
        threads.length === 1 ? "Export Thread" : `Export ${threads.length} Threads`
      );
    }
  };
  const countThreadsByLabel = (label, threads) => {
    return threads.filter((t) => t.labels.includes(label)).length;
  };
  const addThreads = (threads) => {
    const container = document.querySelector(".structItemContainer");
    if (!container) {
      return;
    }
    container.innerHTML = threads.map((t) => t.raw).join("");
  };
  const filterByLabel = (label, threads) => {
    const filteredThreads = threads.filter((t) => t.labels.includes(label));
    const container = document.querySelector(".structItemContainer");
    if (!container) {
      return;
    }
    addThreads(filteredThreads);
  };
  const syncTabs = (labels, threads) => {
    clearTabs();
    const unreadThreads2 = threads.filter((t) => t.unread);
    if (unreadThreads2.length) {
      const unreadLabel = "Unread";
      addTab("unread", `${unreadLabel} (${unreadThreads2.length})`, () => {
        addThreads(unreadThreads2);
        activateTab(unreadLabel);
      });
      activateTab(unreadLabel);
    }
    labels.forEach((label) => {
      addTab(label.toLowerCase(), `${label} (${countThreadsByLabel(label, threads)})`, () => {
        filterByLabel(label, threads);
        activateTab(label);
      });
    });
    if (labels.length && !unreadThreads2.length) {
      const activeLabel = labels[0];
      activateTab(activeLabel.toLowerCase());
      filterByLabel(activeLabel, threads);
    }
  };
  const getUniqueLabels = (threads) => threads.flatMap((t) => t.labels).reduce((acc, curr) => acc.includes(curr) ? acc : acc.concat(curr), []);
  if (isCached) {
    const container = document.querySelector(".block-container");
    addLabelTabsContainer(container);
    searchInput = addSearchInput(container, (input) => {
      const lowercaseInput = input.toLowerCase();
      const threads = getCachedThreads().filter((t) => {
        return t.title.toLowerCase().indexOf(lowercaseInput) > -1 || t.labels.some((label) => label.toLowerCase().indexOf(lowercaseInput) > -1) || t.author.toLowerCase().indexOf(lowercaseInput) > -1;
      });
      const filteredThreads = threads.length ? threads : getCachedThreads();
      queriedThreads = filteredThreads;
      syncTabs(getUniqueLabels(filteredThreads), filteredThreads);
      updateCopyThreadsButtonText(queriedThreads);
      updateExportThreadsButtonText(queriedThreads);
      updatePageTitle(
        `Showing ${queriedThreads.length} / ${getCachedThreads().length} Watched Threads`
      );
    });
    queriedThreads = getCachedThreads();
    updatePageTitle(`Showing ${queriedThreads.length} / ${queriedThreads.length} Watched Threads`);
    syncTabs(getUniqueLabels(getCachedThreads()), getCachedThreads());
    updateCopyThreadsButtonText(queriedThreads);
    updateExportThreadsButtonText(queriedThreads);
    searchInput == null ? void 0 : searchInput.focus();
    const copyThreadsText = `Copy ${queriedThreads.length} Threads`;
    const exportThreadsText = `Export ${queriedThreads.length} Threads`;
    btnCopyThreads = addButton(copyThreadsText, false, (btn) => {
      const threads = queriedThreads.length ? queriedThreads : getCachedThreads();
      _GM_setClipboard(threads.map((t) => t.url).join("\n"), "text");
      const originalText = btn.textContent;
      btn.textContent = `Copied`;
      setTimeout(() => btn.textContent = originalText, 1500);
    });
    btnExportThreads = addButton(exportThreadsText, true, (btn) => {
      const threads = queriedThreads.length ? queriedThreads : getCachedThreads();
      const threadsToStr = threads.map((t) => t.url).join("\n");
      writeTextToFile(threadsToStr, "simpcity_watched_threads.txt");
      const originalText = btn.textContent;
      btn.textContent = `Exported`;
      setTimeout(() => btn.textContent = originalText, 1500);
    });
  }
  const dom = new DOMParser().parseFromString(originalBodyHtml, "text/html");
  const currentPageThreads = parseThreads(dom);
  const unreadThreads = currentPageThreads.filter((t) => t.unread);
  const missingThreads = currentPageThreads.filter(
    (t) => getCachedThreads().find((cached) => cached.id === t.id) === void 0
  );
  const cacheAllThreads = async () => {
    const threads = [];
    for (let page = 1; page <= totalPages; page++) {
      console.log(`Caching Threads 🢒 Page ${page} / ${totalPages}`);
      threads.push(...await cacheThreads(page));
    }
    console.log(`${threads.length} Threads Cached`);
    _GM_setValue("watched_threads", JSON.stringify(threads));
  };
  if (!isCached || missingThreads.length || unreadThreads.length >= currentPageThreads.length) {
    updatePageTitle("Syncing Threads...");
    await( cacheAllThreads());
    _GM_setValue("cached", true);
    const cachedThreads = getCachedThreads();
    syncTabs(getUniqueLabels(cachedThreads), cachedThreads);
    updatePageTitle(`Showing ${cachedThreads.length} / ${cachedThreads.length} Watched Threads`);
    if (searchInput) {
      searchInput.value = "";
    }
    if (!isCached) {
      window.location.reload();
    }
  }

})();