
export enum Frequency {
  ONE_TIME = 'One-time',
  DAILY = 'Daily',
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly',
  QUARTERLY = 'Quarterly'
}

export interface Chore {
  id: string;
  title: string;
  assignee: string | 'Unassigned';
  frequency: Frequency;
  completed: boolean;
  createdAt: number;
  lastCompletedAt?: number;
  completionCount?: number;
  // New fields
  weeklyDays?: number[]; // 0-6 (Sun-Sat)
  dueDate?: number; // timestamp
  completionHistory?: number[]; // Array of completion timestamps
}

export interface FamilyMember {
  name: string;
  color: string;
  avatar: string;
}
