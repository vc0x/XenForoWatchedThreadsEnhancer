type WatchedThread = {
  id: number;
  raw: string;
  title: string;
  labels: string[];
  author: string;
  threadStartTimestamp: number;
  lastReplyTimestamp: number;
  replies: number;
  views: number;
  url: string;
  unread: boolean;
  dead: boolean;
};

export type { WatchedThread };
