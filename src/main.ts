import '@/assets/app.scss';

import { cacheThreads } from '@/cache';
import { strToNumber, writeTextToFile } from '@/helpers';
import { WatchedThread } from '@/types';
import {
  activateTab,
  addButton,
  addLabelTabsContainer,
  addSearchInput,
  addTab,
  clearTabs,
  ensureButtonsContainerExist,
  removePaginationLinks,
  stylizeBlockContainer,
  updateButtonText,
} from '@/ui';
import { GM_getValue, GM_setClipboard, GM_setValue } from '$';

ensureButtonsContainerExist();
stylizeBlockContainer();

let queriedThreads: WatchedThread[] = [];
let btnCopyThreads: null | HTMLAnchorElement = null;
let btnExportThreads: null | HTMLAnchorElement = null;
let searchInput: null | HTMLInputElement = null;

const isCached = GM_getValue('cached', false);

const lastPageEl = document.querySelector('.pageNav-main > li:nth-last-child(1)');
const totalPages = lastPageEl ? Number(lastPageEl.textContent) : 1;

if (isCached) {
  removePaginationLinks();
}

const updatePageTitle = (title: string) => {
  const el = document.querySelector('.p-title-value');
  if (el) {
    el.innerHTML = title;
  }
};

const getCachedThreads = () => JSON.parse(GM_getValue('watched_threads', '[]')) as WatchedThread[];

const countThreadsByLabel = (label: string, threads: WatchedThread[]) => {
  return threads.filter((t) => t.labels.includes(label)).length;
};

const syncCopyThreadsButton = (threads: WatchedThread[]) => {
  if (btnCopyThreads) {
    updateButtonText(
      btnCopyThreads,
      threads.length === 1 ? 'Copy Thread' : `Copy ${threads.length} Threads`,
    );
  }
};

const syncExportThreadsButton = (threads: WatchedThread[]) => {
  if (btnExportThreads) {
    updateButtonText(
      btnExportThreads,
      threads.length === 1 ? 'Export Thread' : `Export ${threads.length} Threads`,
    );
  }
};

const addThreads = (threads: WatchedThread[]) => {
  const container = document.querySelector('.structItemContainer');

  if (!container) {
    return;
  }

  container.innerHTML = threads.map((t) => t.raw).join('');

  container.querySelectorAll('.structItem--thread').forEach((threadEl) => {
    threadEl.classList.add('hvr-underline-from-left');
  });
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
  const deadThreads = threads.filter((t) => t.dead);

  if (unreadThreads.length) {
    const unreadLabel = 'Unread';
    addThreads(unreadThreads);
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

  if (deadThreads.length) {
    const deadLabel = 'Dead';
    addTab('dead', `${deadLabel} (${deadThreads.length})`, () => {
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

const getUniqueLabels = (threads: WatchedThread[]) =>
  threads
    .flatMap((t) => t.labels)
    .reduce((acc: string[], curr) => (acc.includes(curr) ? acc : acc.concat(curr)), []);

if (isCached) {
  const container = document.querySelector('.block-container') as HTMLDivElement;
  addLabelTabsContainer(container);
  searchInput = addSearchInput(container, (input: string) => {
    const i = input.toLowerCase();

    const threads = getCachedThreads().filter((t) => {
      const matchThreadPropsByOperator = (
        thread: WatchedThread,
        query: string,
        operator: string,
      ) => {
        const matchableProps = ['views', 'replies'];

        const parts = query.split(operator, 2).map((s) => s.trim());

        if (parts.length !== 2) {
          return false;
        }

        let prop = parts[0];
        const value = parts[1];

        if (prop === 'v') {
          prop = 'views';
        }

        if (prop === 'r') {
          prop = 'replies';
        }

        if (!matchableProps.includes(prop)) {
          return false;
        }

        if (operator === '>=') {
          // @ts-ignore
          return thread[prop] >= strToNumber(value);
        } else if (operator === '<=') {
          // @ts-ignore
          return thread[prop] <= strToNumber(value);
        } else if (operator === '>') {
          // @ts-ignore
          return thread[prop] > strToNumber(value);
        } else if (operator === '<') {
          // @ts-ignore
          return thread[prop] < strToNumber(value);
        }

        return false;
      };

      if (i.includes('>=')) {
        return matchThreadPropsByOperator(t, i, '>=');
      }

      if (i.includes('<=')) {
        return matchThreadPropsByOperator(t, i, '<=');
      }

      if (i.includes('>')) {
        return matchThreadPropsByOperator(t, i, '>');
      }

      if (i.includes('<')) {
        return matchThreadPropsByOperator(t, i, '<');
      }

      return (
        t.title.toLowerCase().indexOf(i) > -1 ||
        t.labels.some((label) => label.toLowerCase().indexOf(i) > -1) ||
        t.author.toLowerCase().indexOf(i) > -1
      );
    });

    const filteredThreads = threads.length ? threads : getCachedThreads();

    queriedThreads = filteredThreads;

    syncTabs(getUniqueLabels(filteredThreads), filteredThreads);
    syncCopyThreadsButton(queriedThreads);
    syncExportThreadsButton(queriedThreads);

    updatePageTitle(
      `Showing ${queriedThreads.length} / ${getCachedThreads().length} Watched Threads`,
    );
  }) as HTMLInputElement;

  queriedThreads = getCachedThreads();
  updatePageTitle(`Showing ${queriedThreads.length} / ${queriedThreads.length} Watched Threads`);

  syncTabs(getUniqueLabels(getCachedThreads()), getCachedThreads());

  syncCopyThreadsButton(queriedThreads);
  syncExportThreadsButton(queriedThreads);

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
syncCopyThreadsButton(cachedThreads);
syncExportThreadsButton(cachedThreads);
if (!isCached) {
  // Reload on first cache.
  window.location.reload();
}
