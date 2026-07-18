export type RoomTheme = {
  chip: string;
  accent: string;
  ring: string;
};

const THEMES: Record<string, RoomTheme> = {
  blue: {
    chip: "bg-blue-100 text-blue-800",
    accent: "bg-blue-600 hover:bg-blue-700",
    ring: "ring-blue-500",
  },
  green: {
    chip: "bg-emerald-100 text-emerald-800",
    accent: "bg-emerald-600 hover:bg-emerald-700",
    ring: "ring-emerald-500",
  },
};

const DEFAULT_THEME: RoomTheme = {
  chip: "bg-slate-100 text-slate-800",
  accent: "bg-slate-700 hover:bg-slate-800",
  ring: "ring-slate-500",
};

export function getRoomTheme(roomId: string): RoomTheme {
  return THEMES[roomId] ?? DEFAULT_THEME;
}
