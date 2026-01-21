// 小说
export interface Novel {
  id: string;
  title: string;
  description: string;
  genre: string;
  createdAt: Date;
  updatedAt: Date;
  chapterCount: number;
  wordCount: number;
}

// 章节
export interface Chapter {
  id: string;
  novelId: string;
  number: number;
  title: string;
  content: string;
  outline: string;
  wordCount: number;
  createdAt: Date;
  reviewResult?: ReviewResult;
}

// 人物卡
export interface Character {
  id: string;
  novelId: string;
  name: string;
  description: string;
  personality: string;
  abilities: string[];
  status: 'alive' | 'dead' | 'unknown';
  firstAppearance: number;
  lastAppearance: number;
}

// 伏笔
export interface Foreshadowing {
  id: string;
  novelId: string;
  content: string;
  plantedChapter: number;
  plannedRevealChapter: number;
  revealed: boolean;
  revealedChapter?: number;
}

// 世界观设定
export interface WorldSetting {
  id: string;
  novelId: string;
  category: 'rule' | 'geography' | 'history' | 'magic';
  title: string;
  content: string;
  relatedChapters: number[];
}

// 审核结果
export interface ReviewResult {
  id: string;
  chapterId: string;
  issues: ReviewIssue[];
  suggestions: string[];
  overallScore: number;
  createdAt: Date;
}

export interface ReviewIssue {
  type: 'character' | 'foreshadowing' | 'worldSetting' | 'logic';
  severity: 'high' | 'medium' | 'low';
  description: string;
  location?: string;
}
