import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireApiNovelOwner } from '@/lib/auth/api';
import { Character, WorldSetting, Foreshadowing } from '@/lib/types';

function truncateLabel(text: string, maxLength: number): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}…`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireApiNovelOwner(id);
    if ('response' in auth) return auth.response;

    // 获取所有人物
    const characters = await query<Character>(
      'SELECT * FROM characters WHERE novel_id = $1',
      [id]
    );

    // 获取所有世界观设定
    const worldSettings = await query<WorldSetting>(
      'SELECT * FROM world_settings WHERE novel_id = $1',
      [id]
    );

    // 获取所有伏笔
    const foreshadowing = await query<Foreshadowing>(
      'SELECT * FROM foreshadowing WHERE novel_id = $1',
      [id]
    );

    // 构建图谱数据
    const nodes = [
      ...characters.map(c => ({
        id: `character-${c.id}`,
        type: 'character',
        label: c.name,
        data: c
      })),
      ...worldSettings.map(w => ({
        id: `world-${w.id}`,
        type: 'world',
        label: w.title || truncateLabel(w.content || '未命名设定', 12),
        data: w
      })),
      ...foreshadowing.map(f => ({
        id: `foreshadowing-${f.id}`,
        type: 'foreshadowing',
        label: truncateLabel(f.content || '未命名伏笔', 16),
        data: f
      }))
    ];

    // 构建边(基于描述中的关联)
    const edges: Array<{ source: string; target: string; label?: string }> = [];
    const edgeKeys = new Set<string>();

    const addEdge = (source: string, target: string, label?: string) => {
      if (!source || !target || source === target) return;
      const a = source < target ? source : target;
      const b = source < target ? target : source;
      const key = `${a}↔${b}:${label || ''}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      edges.push({ source, target, label });
    };

    // 人物之间的关系
    characters.forEach(char => {
      const desc = char.description?.toLowerCase() || '';
      characters.forEach(other => {
        const otherName = other.name?.toLowerCase().trim();
        if (!otherName) return;
        if (char.id !== other.id && desc.includes(otherName)) {
          addEdge(`character-${char.id}`, `character-${other.id}`, '关联');
        }
      });
    });

    // 人物与世界观的关系
    characters.forEach(char => {
      const desc = char.description?.toLowerCase() || '';
      worldSettings.forEach(world => {
        const worldTitle = world.title?.toLowerCase().trim();
        if (!worldTitle) return;
        if (desc.includes(worldTitle)) {
          addEdge(`character-${char.id}`, `world-${world.id}`, '涉及');
        }
      });
    });

    // 人物与伏笔的关系
    characters.forEach(char => {
      const charName = char.name?.toLowerCase().trim();
      if (!charName) return;
      foreshadowing.forEach(fore => {
        const foreDesc = fore.content?.toLowerCase() || '';
        if (foreDesc.includes(charName)) {
          addEdge(`foreshadowing-${fore.id}`, `character-${char.id}`, '涉及');
        }
      });
    });

    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error('Failed to get knowledge graph:', error);
    return NextResponse.json(
      { error: 'Failed to get knowledge graph' },
      { status: 500 }
    );
  }
}
