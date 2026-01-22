import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Character, WorldSetting, Foreshadowing } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid novel ID format. Expected UUID.' },
        { status: 400 }
      );
    }

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
        label: w.title,
        data: w
      })),
      ...foreshadowing.map(f => ({
        id: `foreshadowing-${f.id}`,
        type: 'foreshadowing',
        label: f.title,
        data: f
      }))
    ];

    // 构建边(基于描述中的关联)
    const edges: Array<{ source: string; target: string; label?: string }> = [];

    // 人物之间的关系
    characters.forEach(char => {
      const desc = char.description?.toLowerCase() || '';
      characters.forEach(other => {
        if (char.id !== other.id && desc.includes(other.name.toLowerCase())) {
          edges.push({
            source: `character-${char.id}`,
            target: `character-${other.id}`,
            label: '关联'
          });
        }
      });
    });

    // 人物与世界观的关系
    characters.forEach(char => {
      const desc = char.description?.toLowerCase() || '';
      worldSettings.forEach(world => {
        if (desc.includes(world.title.toLowerCase())) {
          edges.push({
            source: `character-${char.id}`,
            target: `world-${world.id}`,
            label: '涉及'
          });
        }
      });
    });

    // 人物与伏笔的关系
    characters.forEach(char => {
      foreshadowing.forEach(fore => {
        const foreDesc = fore.content?.toLowerCase() || '';
        if (foreDesc.includes(char.name.toLowerCase())) {
          edges.push({
            source: `foreshadowing-${fore.id}`,
            target: `character-${char.id}`,
            label: '涉及'
          });
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
