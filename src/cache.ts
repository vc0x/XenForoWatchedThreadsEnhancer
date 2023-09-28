import { parseThreads } from './parser';
import { WatchedThread } from './types';

const cacheThreads = async (page: number) => {
  const parser = new DOMParser();

  const threads: WatchedThread[] = [];
  const url = `https://simpcity.su/watched/threads?page=${page}`;

  await new Promise((resolve, reject) => {
    fetch(url, {
      referrer: url,
    })
      .then((response) => response.text())
      .then((text) => {
        const document = parser.parseFromString(text, 'text/html');
        threads.push(...parseThreads(document));
        resolve(true);
      })
      .catch((e) => reject(e));
  });

  return new Promise<WatchedThread[]>((resolve) => resolve(threads));
};

export { cacheThreads };
