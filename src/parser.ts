import { WatchedThread } from './types';

const parseThreads = (el: Document | HTMLElement | HTMLBodyElement): WatchedThread[] => {
  return [...el.querySelectorAll('.structItem--thread')].map((thread: Element) => {
    const unread = thread.classList.contains('is-unread');
    const main = thread.querySelector('.structItem-cell--main') as HTMLDivElement;
    const meta = thread.querySelector('.structItem-cell--meta') as HTMLDivElement;
    const latest = thread.querySelector('.structItem-cell--latest') as HTMLDivElement;

    const titleContainer = main.querySelector('.structItem-title') as HTMLDivElement;

    const titleEl = titleContainer.querySelector('a:last-child') as HTMLAnchorElement;

    const url = titleEl.href;

    const title = titleEl.textContent;
    const labels = [...titleContainer.querySelectorAll('a:not(:last-child)')].map(
      (a: Element) => (a.querySelector('span') as HTMLSpanElement).textContent,
    );

    const author = (
      main.querySelector('.structItem-minor > .structItem-parts > li > a') as HTMLAnchorElement
    ).textContent;
    const threadStartTimestamp = Number(
      (
        main.querySelector(
          '.structItem-minor > .structItem-parts > .structItem-startDate > a > time',
        ) as HTMLTimeElement
      ).getAttribute('data-time') as string,
    );

    const replies = (meta.querySelector('dl > dd') as HTMLDataElement).textContent;
    const views = (meta.querySelector('dl:nth-child(2) > dd') as HTMLDataElement).textContent;

    const lastReplyTimestamp = Number(
      (latest.querySelector('.structItem-latestDate') as HTMLTimeElement).getAttribute('data-time'),
    );

    const id = Number((/\d+(?=\/)/.exec(url) as RegExpExecArray)[0]);

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
      url,
    } as WatchedThread;
  });
};

export { parseThreads };
