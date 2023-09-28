type WatchedThread = {
  id: number;
  raw: string;
  title: string;
  labels: string[];
  author: string;
  threadStartTimestamp: number;
  lastReplyTimestamp: number;
  replies: string;
  views: string;
  url: string;
  unread: boolean;
};

export type { WatchedThread };
