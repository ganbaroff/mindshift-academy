export interface Message {
  id: string;
  sender: "user" | "monster";
  avatar: string;
  text: string;
  isSystem?: boolean;
}

export interface Step {
  id: number;
  name: string;
  xp: string;
  status: "completed" | "active" | "locked";
  hint: string;
}

export interface Achievement {
  id: number;
  emoji: string;
  title: string;
  desc: string;
  unlocked: boolean;
}

export interface Skin {
  emoji: string;
  name: string;
  color: string;
}

export interface Monster {
  id?: number;
  userId?: string;
  name: string;
  emoji: string;
  color: string;
  promptUsed: string;
  imageUrl: string;
}
