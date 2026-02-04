// 小说
export interface Novel {
  id: string;
  title: string;
  idea: string;
  description: string;
  genre: string;
  overallOutline: string;
  overallOutlineLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  chapterCount: number;
  wordCount: number;
}

// 分卷（书 -> 卷）
export interface Volume {
  id: string;
  novelId: string;
  number: number;
  title: string;
  outline: string;
  targetChapters: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// 章纲/章计划（卷 -> 章）
export interface ChapterPlan {
  id: string;
  novelId: string;
  volumeId: string;
  number: number; // 全书连续章节号
  title: string;
  outline: string;
  status: 'draft' | 'confirmed' | 'drafted' | 'done';
  createdAt: Date;
  updatedAt: Date;
}

export interface ChapterPlanVersion {
  id: string;
  chapterPlanId: string;
  versionNumber: number;
  title: string;
  outline: string;
  createdAt: Date;
  createdBy: 'user' | 'system' | string;
  changeDescription?: string | null;
}

// 章节
export interface Chapter {
  id: string;
  novelId: string;
  volumeId?: string | null;
  planId?: string | null;
  number: number;
  title: string;
  content: string;
  outline: string;
  wordCount: number;
  createdAt: Date;
  reviewResult?: ReviewResult;
}

// 批注（Reviewer Loop）
export interface ChapterAnnotation {
  id: string;
  chapterId: string;
  status: 'open' | 'applied' | 'dismissed';
  quote: string;
  startOffset: number;
  endOffset: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
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

// 技法库（全局按用户）
export interface Technique {
  id: string;
  userId: string;
  title: string;
  tags: string[];
  content: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  lastSyncedAt?: Date | null;
  lightragDocId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TechniqueVersion {
  id: string;
  techniqueId: string;
  versionNumber: number;
  title: string;
  tags: string[];
  content: string;
  createdAt: Date;
  createdBy: 'user' | 'system' | string;
  changeDescription?: string | null;
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
