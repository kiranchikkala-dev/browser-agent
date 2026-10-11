export type SnapshotElement = {
  id: number;
  tag: string;
  role: string;
  type?: string;
  label: string;
  href?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  options?: string[];
};

export type Snapshot = {
  url: string;
  title: string;
  elements: SnapshotElement[];
  text: string;
  scroll: { y: number; height: number; viewport: number };
};
