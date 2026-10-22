/* Lightweight navigation and saved-progress metadata. No feature modules load here. */
export const CONTENT_COUNTS = Object.freeze({
  chinaTimeline: 19,
  rumors: 32,
  doses: 25,
  plantParts: 12,
  repositoryParts: 5
});

const chapters = [
  { id: 'ch01_overview', title: '总览：核科学技术的历史沿革', cardCount: 0, summary: '从历史沿革认识核科学技术的发展与应用。' },
  { id: 'ch02_national_security', title: '第二章：国家安全', cardCount: 2, summary: '从历史中理解核科学，在安全与责任的前提下认识它的和平用途。' },
  { id: 'ch03_innovation_frontier', title: '第三章：创新前沿', cardCount: 3, summary: '在科研委托台为任务选择合适装置，理解它能解决什么、又有什么局限。' },
  { id: 'ch04_people_safety', title: '第四章：百姓平安', cardCount: 3, summary: '在生活服务站判断用途、查看依据、解释原因，区分示踪、辐照与无损检测。' },
  { id: 'ch05_clean_energy', title: '第五章：清洁能源', cardCount: 4, summary: '了解核能发电与压水堆，拼装核电站。' },
  { id: 'ch06_waste_process', title: '第六章：绿水青山', cardCount: 3, summary: '认识核废物分类、玻璃固化与多重屏障。' },
  { id: 'ch07_radiation_protection', title: '第七章：辐射防护', cardCount: 3, summary: '通过外照射调控与内照射判断，理解时间、距离、屏蔽与“阻止进入”的不同。' },
  { id: 'ch08_epilogue', title: '终章：核科学认知档案', cardCount: 1, summary: '完成“结论 + 依据”的公众回应，总结已掌握、已纠正与建议复习，再完成认证。' }
].map((chapter) => Object.freeze(chapter));

export const storySummary = Object.freeze({
  order: Object.freeze(chapters.map((chapter) => chapter.id)),
  chapters: Object.freeze(chapters),
  totalCards: chapters.reduce((sum, chapter) => sum + chapter.cardCount, 0),
  ...Object.fromEntries(chapters.map((chapter) => [chapter.id, chapter]))
});

function mode(state, id) {
  return (state && state.modes && state.modes[id]) || {};
}

function items(value) {
  return Array.isArray(value) ? value.length : 0;
}

function completedChapters(state) {
  const completed = mode(state, 'main').completed;
  const ids = new Set(Array.isArray(completed) ? completed : []);
  return storySummary.order.filter((id) => ids.has(id)).length;
}

export const routeCatalog = Object.freeze([
  {
    id: 'home', order: 0, title: '首页', nav: '首页', icon: 'home', accent: '#38e1ff', hidden: false,
    blurb: '总览你的核能探索进度',
    progress: (state) => (mode(state, 'home').plays || 0) > 0 ? 1 : 0,
    isComplete: (state) => (mode(state, 'home').plays || 0) > 0
  },
  {
    id: 'main', order: 0.5, title: '认知档案', nav: '认知档案', icon: 'book', accent: '#38e1ff', hidden: false,
    blurb: '八章主线,从核科学的历史沿革走到结业答辩。',
    progress: (state) => completedChapters(state) / storySummary.order.length,
    isComplete: (state) => completedChapters(state) >= storySummary.order.length
  },
  {
    id: 'rumor', order: 1, title: '辟谣实验室', nav: '辟谣实验室', icon: 'search', accent: '#ff8a8a', hidden: false,
    blurb: '识破 32 条流传甚广的核辐射谣言，学会用剂量与机制思考。',
    progress: (state) => Math.min(1, items(mode(state, 'rumor').seen) / CONTENT_COUNTS.rumors),
    isComplete: (state) => items(mode(state, 'rumor').seen) >= CONTENT_COUNTS.rumors
  },
  {
    id: 'city', order: 2, title: '核电站建造', nav: '核电站建造', icon: 'build', accent: '#38e1ff', hidden: false,
    blurb: '按工程顺序拼装压水堆：堆芯、蒸汽发生器、安全壳、汽轮机……',
    progress(state) {
      const current = mode(state, 'city');
      return Math.min(1, (current.completed || 0) > 0 ? 1 : (current.bestSteps || 0) / CONTENT_COUNTS.plantParts);
    },
    isComplete: (state) => (mode(state, 'city').completed || 0) > 0
  },
  {
    id: 'console', order: 3, title: '反应堆控制台', nav: '反应堆控制台', icon: 'gauge', accent: '#3ef0a2', hidden: true,
    blurb: '控制棒、主泵、汽轮机：在 12 小时班次里把一座压水堆稳定开到满功率。',
    progress(state) {
      const current = mode(state, 'console');
      if (current.completed > 0) return 1;
      return Math.min(0.9, ((current.bestEnergy || 0) / 5500) * 0.5 + ((current.bestSafety || 0) / 100) * 0.4);
    },
    isComplete: (state) => (mode(state, 'console').completed || 0) > 0
  },
  {
    id: 'dose', order: 4, title: '剂量实验室', nav: '剂量实验室', icon: 'radiation', accent: '#a78bfa', hidden: false,
    blurb: '把香蕉、胸片、CT、职业限值和事故放在同一把对数标尺上。',
    progress: (state) => Math.min(1, items(mode(state, 'dose').viewed) / CONTENT_COUNTS.doses),
    isComplete: (state) => items(mode(state, 'dose').viewed) >= CONTENT_COUNTS.doses
  },
  {
    id: 'china', order: 5, title: '中国核电', nav: '中国核电', icon: 'flag', accent: '#ffc857', hidden: false,
    blurb: '从秦山一期到华龙一号、玲龙一号与「人造太阳」的里程碑。',
    progress: (state) => Math.min(1, items(mode(state, 'china').viewed) / CONTENT_COUNTS.chinaTimeline),
    isComplete: (state) => items(mode(state, 'china').viewed) >= CONTENT_COUNTS.chinaTimeline
  },
  {
    id: 'repository', order: 7, title: '深地质处置', nav: '地质处置', icon: 'vault', accent: '#7fe0b0', hidden: false,
    blurb: '把高放废物封进玻璃、钢桶、膨润土与 500 米岩层，亲手拆开五重屏障。',
    progress(state) {
      const current = mode(state, 'repository');
      return Math.max(items(current.viewed) / CONTENT_COUNTS.repositoryParts, current.exploded ? 1 : 0);
    },
    isComplete: (state) => !!mode(state, 'repository').exploded
  }
].map((route) => Object.freeze(route)));
