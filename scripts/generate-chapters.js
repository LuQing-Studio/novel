const NOVEL_ID = '3b5ce412-43eb-4295-aa3c-b80af8b2daad';
const BASE_URL = 'http://localhost:3000';

const chapterOutlines = [
  '第二章:灵气复苏的征兆。林辰在学校发现异常的灵气波动,调查后发现学校地下有古代修仙遗迹。同时,他开始暗中帮助父亲处理赔偿问题,利用修仙知识赚取第一桶金。',
  '第三章:古玩市场的秘密。林辰再次拜访墨渊,从他那里了解到地球修仙界的基本格局和"昆仑监察会"的规则。墨渊透露学校地下遗迹的危险性,警告林辰不要轻举妄动。',
  '第四章:苏清雪的异变。苏清雪的玄阴灵体开始觉醒,身体出现异常寒冷症状。林辰暗中帮她压制灵体反噬,但引起了她的怀疑和好奇。两人关系开始微妙变化。',
  '第五章:赵家的阴谋。林辰调查发现,赵天虎背后有"血狼帮"支持,而血狼帮与某个隐世修仙家族有关联。父亲的工伤事故可能不是意外,而是有人故意为之。',
  '第六章:地下遗迹探险。林辰决定冒险进入学校地下遗迹,寻找修炼资源。在遗迹中遭遇机关陷阱和残留的阵法禁制,险象环生,但最终获得一枚"筑基丹"和一部残缺功法。',
  '第七章:突破筑基。林辰服用筑基丹,成功突破到筑基期。实力大增后,他开始着手解决父亲的赔偿问题,暗中教训赵天虎手下,展现出强大的战斗力。',
  '第八章:昆仑监察会的关注。林辰的行动引起昆仑监察会的注意,一名监察使前来调查。林辰小心应对,展现出合理的实力水平,暂时打消了对方的怀疑。',
  '第九章:苏清雪的身世。苏清雪的家族"月华苏家"派人接她回去,林辰得知她即将离开。在离别前,林辰传授她控制玄阴灵体的基础方法,并约定将来再见。',
  '第十章:新的开始。林辰成功为父亲争取到合理赔偿,家庭经济状况好转。他在高考中取得优异成绩,考入江城大学。同时,他开始筹划如何在大学期间建立自己的修仙势力,为将来的挑战做准备。'
];

async function generateChapter(outline, index) {
  console.log(`\n开始生成第 ${index + 2} 章...`);
  console.log(`大纲: ${outline}`);

  try {
    const response = await fetch(`${BASE_URL}/api/novels/${NOVEL_ID}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ outline }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✓ 第 ${index + 2} 章生成成功! 章节ID: ${data.id}`);
    console.log(`  字数: ${data.wordCount || 0}`);
    return data;
  } catch (error) {
    console.error(`✗ 第 ${index + 2} 章生成失败:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('开始批量生成章节');
  console.log('小说ID:', NOVEL_ID);
  console.log('章节数量:', chapterOutlines.length);
  console.log('='.repeat(60));

  const startTime = Date.now();

  for (let i = 0; i < chapterOutlines.length; i++) {
    try {
      await generateChapter(chapterOutlines[i], i);

      // 每章之间稍微延迟,避免过载
      if (i < chapterOutlines.length - 1) {
        console.log('等待5秒后继续...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch {
      console.error('生成过程中出错,停止执行');
      process.exit(1);
    }
  }

  const endTime = Date.now();
  const totalTime = Math.round((endTime - startTime) / 1000);

  console.log('\n' + '='.repeat(60));
  console.log('✓ 所有章节生成完成!');
  console.log(`总耗时: ${totalTime} 秒 (约 ${Math.round(totalTime / 60)} 分钟)`);
  console.log('='.repeat(60));
}

main().catch(console.error);
