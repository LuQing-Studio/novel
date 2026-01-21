import { NextResponse } from 'next/server';
import { getAIService } from '@/lib/ai/factory';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, genre, description } = body;

    const prompt = `你是一位专业的小说策划编辑。根据以下信息,帮助作者完善小说设定:

小说标题: ${title}
类型: ${genre}
简介: ${description}

请生成以下内容:

1. 主要人物(3-5个):
   - 姓名
   - 简要描述(性格、背景、能力)
   - 状态(alive/dead/unknown)

2. 世界观设定(3-5条):
   - 类别(rule/geography/history/magic)
   - 具体内容

3. 初始伏笔(2-3个):
   - 伏笔内容
   - 计划在第几章揭示

请以 JSON 格式返回:
{
  "characters": [
    {
      "name": "人物名",
      "description": "描述",
      "status": "alive"
    }
  ],
  "worldSettings": [
    {
      "category": "rule",
      "content": "设定内容"
    }
  ],
  "foreshadowing": [
    {
      "content": "伏笔内容",
      "plannedRevealChapter": 10
    }
  ]
}`;

    const aiService = getAIService();
    const response = await aiService.generate({
      messages: [
        { role: 'system', content: '你是一位专业的小说策划编辑,擅长设计人物和世界观。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    let jsonContent = response.content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const setup = JSON.parse(jsonContent);
    return NextResponse.json(setup);
  } catch (error) {
    console.error('Failed to generate setup:', error);
    return NextResponse.json(
      { error: 'Failed to generate setup' },
      { status: 500 }
    );
  }
}
