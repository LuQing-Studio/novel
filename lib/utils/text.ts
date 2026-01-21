/**
 * 计算文本字数
 * 对于中文文本,统计所有非空白字符
 * 对于英文文本,统计单词数
 */
export function countWords(text: string): number {
  if (!text) return 0;

  // 移除所有空白字符后计算长度(适用于中文)
  return text.replace(/\s/g, '').length;
}

/**
 * 格式化字数显示
 * 超过10000字显示为"X.X万字"
 */
export function formatWordCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万字`;
  }
  return `${count}字`;
}
