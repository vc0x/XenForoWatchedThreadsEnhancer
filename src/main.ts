import { GM_getValue, GM_setClipboard, GM_setValue } from '$';

import { cacheThreads } from './cache';
import { writeTextToFile } from './helpers';
import { parseThreads } from './parser';
import { WatchedThread } from './types';
import {
  activateTab,
  addButton,
  addLabelTabsContainer,
  addSearchInput,
  addTab,
  clearTabs,
  updateButtonText,
} from './ui';

let manuallySyncing = false;

const originalBodyHtml = document.body.outerHTML;

let queriedThreads: WatchedThread[] = [];
let btnCopyThreads: null | HTMLAnchorElement = null;
let btnExportThreads: null | HTMLAnchorElement = null;
let searchInput: null | HTMLInputElement = null;

const isCached = GM_getValue('cached', false);

const lastPageEl = document.querySelector('.pageNav-main > li:nth-last-child(1)');
const totalPages = lastPageEl ? Number(lastPageEl.textContent) : 1;

if (isCached) {
  document.querySelectorAll('.pageNav-main').forEach((nav) => nav.remove());
  document.querySelector('.pageNav > a')?.remove();
  document.querySelector('.block-outer--after > .pageNavWrapper')?.remove();
}

const updatePageTitle = (title: string) => {
  const el = document.querySelector('.p-title-value');
  if (el) {
    el.innerHTML = title;
  }
};

const getCachedThreads = () => JSON.parse(GM_getValue('watched_threads', '[]')) as WatchedThread[];

const updateCopyThreadsButtonText = (threads: WatchedThread[]) => {
  if (btnCopyThreads) {
    updateButtonText(
      btnCopyThreads,
      threads.length === 1 ? 'Copy Thread' : `Copy ${threads.length} Threads`,
    );
  }
};

const updateExportThreadsButtonText = (threads: WatchedThread[]) => {
  if (btnExportThreads) {
    updateButtonText(
      btnExportThreads,
      threads.length === 1 ? 'Export Thread' : `Export ${threads.length} Threads`,
    );
  }
};

const countThreadsByLabel = (label: string, threads: WatchedThread[]) => {
  return threads.filter((t) => t.labels.includes(label)).length;
};

const addThreads = (threads: WatchedThread[]) => {
  const container = document.querySelector('.structItemContainer');

  if (!container) {
    return;
  }

  container.innerHTML = threads.map((t) => t.raw).join('');
};

const filterByLabel = (label: string, threads: WatchedThread[]) => {
  const filteredThreads = threads.filter((t) => t.labels.includes(label));
  const container = document.querySelector('.structItemContainer');

  if (!container) {
    return;
  }

  addThreads(filteredThreads);
};

const syncTabs = (labels: string[], threads: WatchedThread[]) => {
  clearTabs();

  const unreadThreads = threads.filter((t) => t.unread);

  if (unreadThreads.length) {
    const unreadLabel = 'Unread';
    addTab('unread', `${unreadLabel} (${unreadThreads.length})`, () => {
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

  if (labels.length && !unreadThreads.length) {
    const activeLabel = labels[0];
    activateTab(activeLabel.toLowerCase());
    filterByLabel(activeLabel, threads);
  }
};

const getUniqueLabels = (threads: WatchedThread[]) =>
  threads
    .flatMap((t) => t.labels)
    .reduce((acc: string[], curr) => (acc.includes(curr) ? acc : acc.concat(curr)), []);

if (isCached) {
  const container = document.querySelector('.block-container') as HTMLDivElement;
  addLabelTabsContainer(container);
  searchInput = addSearchInput(container, (input: string) => {
    const lowercaseInput = input.toLowerCase();

    const threads = getCachedThreads().filter((t) => {
      return (
        t.title.toLowerCase().indexOf(lowercaseInput) > -1 ||
        t.labels.some((label) => label.toLowerCase().indexOf(lowercaseInput) > -1) ||
        t.author.toLowerCase().indexOf(lowercaseInput) > -1
      );
    });

    const filteredThreads = threads.length ? threads : getCachedThreads();

    queriedThreads = filteredThreads;

    syncTabs(getUniqueLabels(filteredThreads), filteredThreads);
    updateCopyThreadsButtonText(queriedThreads);
    updateExportThreadsButtonText(queriedThreads);

    updatePageTitle(
      `Showing ${queriedThreads.length} / ${getCachedThreads().length} Watched Threads`,
    );
  }) as HTMLInputElement;

  queriedThreads = getCachedThreads();
  updatePageTitle(`Showing ${queriedThreads.length} / ${queriedThreads.length} Watched Threads`);

  syncTabs(getUniqueLabels(getCachedThreads()), getCachedThreads());

  updateCopyThreadsButtonText(queriedThreads);
  updateExportThreadsButtonText(queriedThreads);

  searchInput?.focus();

  const copyThreadsText = `Copy ${queriedThreads.length} Threads`;
  const exportThreadsText = `Export ${queriedThreads.length} Threads`;

  btnCopyThreads = addButton(copyThreadsText, false, (btn) => {
    const threads = queriedThreads.length ? queriedThreads : getCachedThreads();
    GM_setClipboard(threads.map((t) => t.url).join('\n'), 'text');
    const originalText = btn.textContent;
    btn.textContent = `Copied`;
    setTimeout(() => (btn.textContent = originalText), 1500);
  }) as HTMLAnchorElement;

  btnExportThreads = addButton(exportThreadsText, true, (btn) => {
    const threads = queriedThreads.length ? queriedThreads : getCachedThreads();
    const threadsToStr = threads.map((t) => t.url).join('\n');
    writeTextToFile(threadsToStr, 'simpcity_watched_threads.txt');
    const originalText = btn.textContent;
    btn.textContent = `Exported`;
    setTimeout(() => (btn.textContent = originalText), 1500);
  }) as HTMLAnchorElement;

  addButton('Sync Threads', true, async (btn) => {
    if (manuallySyncing) {
      return;
    }

    manuallySyncing = true;

    updatePageTitle('Syncing Threads...');
    btn.textContent = 'Syncing...';
    await cacheAllThreads();
    btn.textContent = 'Sync Threads';

    manuallySyncing = false;

    const cachedThreads = getCachedThreads();
    syncTabs(getUniqueLabels(cachedThreads), cachedThreads);
    updatePageTitle(`Showing ${cachedThreads.length} / ${cachedThreads.length} Watched Threads`);
    updateCopyThreadsButtonText(cachedThreads);
    updateExportThreadsButtonText(cachedThreads);

    if (searchInput) {
      searchInput.value = '';
    }
  });
}

const cacheAllThreads = async () => {
  const threads = [];

  for (let page = 1; page <= totalPages; page++) {
    console.log(`Caching Threads 🢒 Page ${page} / ${totalPages}`);
    threads.push(...(await cacheThreads(page)));
  }

  console.log(`${threads.length} Threads Cached`);
  GM_setValue('watched_threads', JSON.stringify(threads));
};

updatePageTitle('Syncing Threads...');
await cacheAllThreads();
GM_setValue('cached', true);
const cachedThreads = getCachedThreads();
syncTabs(getUniqueLabels(cachedThreads), cachedThreads);
updatePageTitle(`Showing ${cachedThreads.length} / ${cachedThreads.length} Watched Threads`);
if (!isCached) {
  // Reload on first cache.
  window.location.reload();
}
