// ==UserScript==
// @name         Watched Threads Enhancer
// @namespace    https://github.com/azzlover
// @version      1.0.2
// @author       azzlover
// @description  Categorizes and adds search to watched threads.
// @icon         https://simp4.jpg.church/simpcityIcon192.png
// @match        https://*.simpcity.su/watched/threads*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setClipboard
// @grant        GM_setValue
// ==/UserScript==

(t=>{if(typeof GM_addStyle=="function"){GM_addStyle(t);return}const r=document.createElement("style");r.textContent=t,document.head.append(r)})(' .structItem-pageJump a{padding:2px 8px!important;border-radius:1px!important}.hvr-grow-shadow{-webkit-transform:perspective(1px) translateZ(0);transform:perspective(1px) translateZ(0);box-shadow:0 0 1px #0000;-webkit-transition-duration:.3s;transition-duration:.3s;-webkit-transition-property:box-shadow,transform;transition-property:box-shadow,transform}.hvr-grow-shadow:hover,.hvr-grow-shadow:focus,.hvr-grow-shadow:active{box-shadow:0 10px 10px -10px #00000080;-webkit-transform:scale(1.1);transform:scale(1.1)}.hvr-underline-from-left{-webkit-transform:perspective(1px) translateZ(0);transform:perspective(1px) translateZ(0);box-shadow:0 0 1px #0000;position:relative;overflow:hidden}.hvr-underline-from-left:before{content:"";position:absolute;z-index:-1;left:0;right:100%;bottom:0;background:#3db7c7;height:2px;-webkit-transition-property:right;transition-property:right;-webkit-transition-duration:.3s;transition-duration:.3s;-webkit-transition-timing-function:ease-out;transition-timing-function:ease-out}.hvr-underline-from-left:hover:before,.hvr-underline-from-left:focus:before,.hvr-underline-from-left:active:before{right:0} ');

(async function () {
  'use strict';

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
  const strToNumber = (strNum) => {
    const str = strNum.trim().toLowerCase();
    let num;
    if (str.includes("k")) {
      num = Number(str.replace(/k/i, "")) * 1e3;
    } else if (str.includes("m")) {
      num = Number(str.replace(/m/i, "")) * 1e6;
    } else {
      num = Number(str);
    }
    return num;
  };
  const treatAsUTC = (date) => {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
    return result;
  };
  const daysBetween = (startDate, endDate) => {
    const millisecondsPerDay = 24 * 60 * 60 * 1e3;
    return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
  };
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
      const now = /* @__PURE__ */ new Date();
      const lastUpdated = new Date(lastReplyTimestamp * 1e3);
      const dead = daysBetween(lastUpdated, now) >= 90;
      const intViews = strToNumber(views);
      const intReplies = strToNumber(replies);
      return {
        id,
        unread,
        raw: thread.outerHTML.trim(),
        title,
        labels,
        author,
        threadStartTimestamp,
        lastReplyTimestamp,
        replies: intReplies,
        views: intViews,
        url,
        dead
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
      return true;
    }
    return false;
  };
  const addButton = (text, addMargin, onClick) => {
    const container = document.querySelector(".pageNav");
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
  const ensureButtonsContainerExist = () => {
    if (!document.querySelector(".block-outer > .block-outer-main")) {
      const blockOuterMain = document.createElement("div");
      blockOuterMain.innerHTML = `
<nav class="pageNavWrapper pageNavWrapper--mixed">
  <div class="pageNav  pageNav--skipEnd">
  </div>
</nav>
    `;
      document.querySelector(".block-outer").appendChild(blockOuterMain);
    }
  };
  const removePaginationLinks = () => {
    var _a, _b;
    document.querySelectorAll(".pageNav-main").forEach((nav) => nav.remove());
    (_a = document.querySelector(".pageNav > a")) == null ? void 0 : _a.remove();
    (_b = document.querySelector(".block-outer--after > .pageNavWrapper")) == null ? void 0 : _b.remove();
  };
  const stylizeBlockContainer = () => {
    const container = document.querySelector(".block-container");
    container.style.borderRadius = "1px";
  };
  var _GM_getValue = /* @__PURE__ */ (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
  var _GM_setClipboard = /* @__PURE__ */ (() => typeof GM_setClipboard != "undefined" ? GM_setClipboard : void 0)();
  var _GM_setValue = /* @__PURE__ */ (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
  ensureButtonsContainerExist();
  stylizeBlockContainer();
  let queriedThreads = [];
  let btnCopyThreads = null;
  let btnExportThreads = null;
  let searchInput = null;
  const isCached = _GM_getValue("cached", false);
  const lastPageEl = document.querySelector(".pageNav-main > li:nth-last-child(1)");
  const totalPages = lastPageEl ? Number(lastPageEl.textContent) : 1;
  if (isCached) {
    removePaginationLinks();
  }
  const updatePageTitle = (title) => {
    const el = document.querySelector(".p-title-value");
    if (el) {
      el.innerHTML = title;
    }
  };
  const getCachedThreads = () => JSON.parse(_GM_getValue("watched_threads", "[]"));
  const countThreadsByLabel = (label, threads) => {
    return threads.filter((t) => t.labels.includes(label)).length;
  };
  const syncCopyThreadsButton = (threads) => {
    if (btnCopyThreads) {
      updateButtonText(
        btnCopyThreads,
        threads.length === 1 ? "Copy Thread" : `Copy ${threads.length} Threads`
      );
    }
  };
  const syncExportThreadsButton = (threads) => {
    if (btnExportThreads) {
      updateButtonText(
        btnExportThreads,
        threads.length === 1 ? "Export Thread" : `Export ${threads.length} Threads`
      );
    }
  };
  const addThreads = (threads) => {
    const container = document.querySelector(".structItemContainer");
    if (!container) {
      return;
    }
    container.innerHTML = threads.map((t) => t.raw).join("");
    container.querySelectorAll(".structItem--thread").forEach((threadEl) => {
      threadEl.classList.add("hvr-underline-from-left");
    });
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
    const unreadThreads = threads.filter((t) => t.unread);
    const deadThreads = threads.filter((t) => t.dead);
    if (unreadThreads.length) {
      const unreadLabel = "Unread";
      addThreads(unreadThreads);
      addTab("unread", `${unreadLabel} (${unreadThreads.length})`, () => {
        addThreads(unreadThreads);
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
    if (deadThreads.length) {
      const deadLabel = "Dead";
      addTab("dead", `${deadLabel} (${deadThreads.length})`, () => {
        addThreads(deadThreads);
        activateTab(deadLabel);
      });
    }
    if (labels.length && !unreadThreads.length) {
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
      const i = input.toLowerCase();
      const threads = getCachedThreads().filter((t) => {
        const matchThreadPropsByOperator = (thread, query, operator) => {
          const matchableProps = ["views", "replies"];
          const parts = query.split(operator, 2).map((s) => s.trim());
          if (parts.length !== 2) {
            return false;
          }
          let prop = parts[0];
          const value = parts[1];
          if (prop === "v") {
            prop = "views";
          }
          if (prop === "r") {
            prop = "replies";
          }
          if (!matchableProps.includes(prop)) {
            return false;
          }
          if (operator === ">=") {
            return thread[prop] >= strToNumber(value);
          } else if (operator === "<=") {
            return thread[prop] <= strToNumber(value);
          } else if (operator === ">") {
            return thread[prop] > strToNumber(value);
          } else if (operator === "<") {
            return thread[prop] < strToNumber(value);
          }
          return false;
        };
        if (i.includes(">=")) {
          return matchThreadPropsByOperator(t, i, ">=");
        }
        if (i.includes("<=")) {
          return matchThreadPropsByOperator(t, i, "<=");
        }
        if (i.includes(">")) {
          return matchThreadPropsByOperator(t, i, ">");
        }
        if (i.includes("<")) {
          return matchThreadPropsByOperator(t, i, "<");
        }
        return t.title.toLowerCase().indexOf(i) > -1 || t.labels.some((label) => label.toLowerCase().indexOf(i) > -1) || t.author.toLowerCase().indexOf(i) > -1;
      });
      const filteredThreads = threads.length ? threads : getCachedThreads();
      queriedThreads = filteredThreads;
      syncTabs(getUniqueLabels(filteredThreads), filteredThreads);
      syncCopyThreadsButton(queriedThreads);
      syncExportThreadsButton(queriedThreads);
      updatePageTitle(
        `Showing ${queriedThreads.length} / ${getCachedThreads().length} Watched Threads`
      );
    });
    queriedThreads = getCachedThreads();
    updatePageTitle(`Showing ${queriedThreads.length} / ${queriedThreads.length} Watched Threads`);
    syncTabs(getUniqueLabels(getCachedThreads()), getCachedThreads());
    syncCopyThreadsButton(queriedThreads);
    syncExportThreadsButton(queriedThreads);
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
  const cacheAllThreads = async () => {
    const threads = [];
    for (let page = 1; page <= totalPages; page++) {
      console.log(`Caching Threads 🢒 Page ${page} / ${totalPages}`);
      threads.push(...await cacheThreads(page));
    }
    console.log(`${threads.length} Threads Cached`);
    _GM_setValue("watched_threads", JSON.stringify(threads));
  };
  updatePageTitle("Syncing Threads...");
  await( cacheAllThreads());
  _GM_setValue("cached", true);
  const cachedThreads = getCachedThreads();
  syncTabs(getUniqueLabels(cachedThreads), cachedThreads);
  updatePageTitle(`Showing ${cachedThreads.length} / ${cachedThreads.length} Watched Threads`);
  syncCopyThreadsButton(cachedThreads);
  syncExportThreadsButton(cachedThreads);
  if (!isCached) {
    window.location.reload();
  }

})();