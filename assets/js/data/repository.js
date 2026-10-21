/* ============================================================
   核纪元 · 深地质处置数据
   ------------------------------------------------------------
   公开科学概念示意：玻璃固化体 / 金属包容体 / 膨润土缓冲层 /
   回填与近场 / 天然岩体。不包含具体处置库的工程尺寸、核素
   清单、地下水参数或场址评价数据。
   ============================================================ */
window.NEG = window.NEG || {};
NEG.data = NEG.data || {};

NEG.data.repository = {
  id: 'deep-geological-disposal',
  title: '深地质处置',
  en: 'DEEP GEOLOGICAL DISPOSAL',
  code: 'MULTI-BARRIER / REFERENCE 500 M',
  intro: '高放废物从玻璃固化体出发，穿过金属包容体、膨润土缓冲层与回填层，最终进入数百米深的稳定岩体。每一层都不是“绝对封印”，而是把释放路径拆成多个独立、互补的环节。',
  caveat: '本页聚焦高放废物的最终地质处置；中低放废物、废气废液的处理与近地表处置不在本模型范围内。深度、层厚、材料与巷道布置均为教学化表达，不代表任何具体处置库的设计；真实场址需要长期地质调查、安全评价与监管审查。',
  stats: [
    { label: '参考深度', value: '500', unit: 'm', note: '深部稳定岩体' },
    { label: '工程屏障', value: '04', unit: '层', note: '固化 · 包容 · 缓冲 · 回填' },
    { label: '天然屏障', value: '01', unit: '层', note: '围岩与地下水系统' },
    { label: '隔离目标', value: '地质', unit: '尺度', note: '与生物圈长期隔离' }
  ],
  parts: [
    {
      id: 'glass',
      index: 1,
      name: '玻璃固化体',
      en: 'VITRIFIED WASTE FORM',
      tag: '工程屏障 / 废物体',
      accent: '#ffd36b',
      role: '把高放废液中的放射性核素固定进稳定的玻璃网络中。',
      desc: '高放废液经过处理后被熔入硼硅酸盐玻璃，冷却成致密的玻璃固化体。玻璃网络把核素“锁”在固体结构中，降低它们与地下水接触后的浸出速率。',
      material: '硼硅酸盐玻璃（示意）',
      fact: '固化不是把废物稀释，而是把核素固定进耐水浸的固体基质。',
      note: '不同国家也研究陶瓷、玻璃陶瓷等固化路线；本页以玻璃固化为例。',
      anchor: [0, 0.5, 0.18],
      labelOffset: [-18, 66]
    },
    {
      id: 'canister',
      index: 2,
      name: '金属包容体',
      en: 'METAL CANISTER',
      tag: '工程屏障 / 密封',
      accent: '#c9d6e6',
      role: '把玻璃固化体密封在耐腐蚀的金属容器中，隔绝地下水。',
      desc: '玻璃体被装入不锈钢或铜钢包容体，端盖焊接密封。包容体在第一段时间内承担主要的物理隔离作用，为外侧缓冲层和岩体争取时间。',
      material: '不锈钢 / 铜钢包容体（示意）',
      fact: '包容体的关键是“密封完整性”，而不是单纯追求壁厚。',
      note: '本页不展示容器尺寸、焊缝结构、腐蚀速率或寿命预测。',
      anchor: [0, 0.8, 0.3],
      labelOffset: [32, 30]
    },
    {
      id: 'bentonite',
      index: 3,
      name: '膨润土缓冲层',
      en: 'BENTONITE BUFFER',
      tag: '工程屏障 / 缓冲',
      accent: '#e0a36a',
      role: '遇水膨胀、低渗透，并在废物与岩体之间提供化学缓冲。',
      desc: '压实膨润土遇水后膨胀，填充容器与岩体之间的空隙，降低地下水流速；其表面还能吸附部分放射性核素，延缓迁移。',
      material: '压实膨润土（示意）',
      fact: '膨润土的“膨胀—低渗—吸附”三种作用，针对的是不同的释放路径。',
      note: '本页不展示膨润土配比、干密度、膨胀压力或长期蚀变参数。',
      anchor: [0, 1.0, 0.34],
      labelOffset: [32, 0]
    },
    {
      id: 'backfill',
      index: 4,
      name: '回填与近场',
      en: 'BACKFILL & NEAR FIELD',
      tag: '工程屏障 / 封闭',
      accent: '#b9b09a',
      role: '封闭处置巷道与钻孔，限制地下水进入和核素向外迁移。',
      desc: '废物包就位后，巷道和钻孔用膨润土、混凝土或其他回填材料封闭。近场工程屏障与围岩共同构成一个低流速、低渗透的隔离环境。',
      material: '膨润土-混凝土回填与衬砌（示意）',
      fact: '“近场”不是单一材料，而是废物包、缓冲层、回填层与开挖扰动区的组合。',
      note: '本页不展示回填配比、施工接缝、衬砌厚度或地下水流场。',
      anchor: [0, 1.12, 0.34],
      labelOffset: [34, -32]
    },
    {
      id: 'rock',
      index: 5,
      name: '天然岩体',
      en: 'HOST ROCK',
      tag: '天然屏障 / 围岩',
      accent: '#8fd8b6',
      role: '用低渗透、稳定的地质体把处置库与生物圈长期隔开。',
      desc: '数百米深的稳定岩体提供最终的天然屏障。岩体的低渗透性、地下水化学、构造稳定性和长期地质演化，决定了核素能否在极长时间尺度上被滞留和稀释。',
      material: '低渗透稳定岩体（示意）',
      fact: '天然屏障不是一个“岩性标签”，而是岩体、地下水与地质构造共同构成的系统。',
      note: '真实场址需要长期地质调查、断层与地震评价、地下水模拟和多重安全评价。',
      anchor: [0, 1.2, 0.34],
      labelOffset: [-32, -56]
    }
  ],
  chain: [
    { id: 'vitrify', label: '玻璃固化', note: '固定核素' },
    { id: 'contain', label: '金属包容', note: '密封隔离' },
    { id: 'buffer', label: '膨润土缓冲', note: '膨胀低渗' },
    { id: 'backfill', label: '回填封闭', note: '限制水流' },
    { id: 'rock', label: '稳定岩体', note: '地质隔离' }
  ],
  notes: [
    {
      title: '奥克洛天然反应堆',
      text: '约 20 亿年前，加蓬奥克洛地区的铀矿曾发生天然链式反应。周围岩体对部分裂变产物的滞留，被用作研究地质处置长期行为的天然类比；它不是“处置库已经验证安全”的同义词。'
    },
    {
      title: '分离嬗变',
      text: '分离—嬗变（P&T）尝试把长寿命核素分离出来，再在反应堆或加速器中嬗变成较短寿命核素。它可以减小废物的长期危害，但仍需与地质处置配合，并处于研究与发展阶段。'
    }
  ],
  sources: [
    {
      name: 'IAEA · Radioactive Waste Management',
      url: 'https://www.iaea.org/topics/radioactive-waste-management'
    },
    {
      name: 'OECD-NEA · Radioactive Waste Management',
      url: 'https://www.oecd-nea.org/rwm/'
    },
    {
      name: 'World Nuclear Association · Geological Disposal',
      url: 'https://world-nuclear.org/information-library/nuclear-fuel-cycle/nuclear-wastes/geological-disposal-of-high-level-waste.aspx'
    },
    {
      name: '中国核工业集团有限公司 · 北山地下实验室公开资料',
      url: 'https://www.cnnc.com.cn/'
    }
  ]
};
