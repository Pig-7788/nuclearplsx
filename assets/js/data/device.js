/* ============================================================
   核纪元 · 核装置解剖室数据
   ------------------------------------------------------------
   仅整理公开历史资料中的结构层级与功能关系：
   - 不包含尺寸、材料配比、装药结构、起爆时序等工程参数
   - 3D 模型为教学化示意，不对应任何真实装置的制造图纸
   ============================================================ */
window.NEG = window.NEG || {};
NEG.data = NEG.data || {};

NEG.data.device = {
  id: 'mk3-implosion',
  title: '内爆式核装置',
  en: 'IMPLOSION-TYPE DEVICE',
  code: 'PUBLIC SCHEMATIC / 1945',
  prototype: 'Mk-III「胖子」历史原型',
  eyebrow: 'DECLASSIFIED STRUCTURE · 结构解剖',
  intro: '以公开史料中的 1945 年内爆式原子弹（Mk-III「胖子」）为原型，逐层拆开外壳、起爆阵列、炸药透镜、推层、反射层、核心与中子引发器。',
  caveat: '本页只呈现公开历史资料中的层级关系与功能，不含尺寸、材料配比、装药结构或起爆参数；3D 模型为教学示意。',
  stats: [
    { label: '公开原型', value: 'MK-III', note: '1945 · 内爆式' },
    { label: '结构层级', value: '07', note: '可逐层拆解' },
    { label: '波阵面', value: '向心', note: '球面内爆示意' },
    { label: '展示口径', value: 'EDU', note: '非工程图纸' }
  ],
  parts: [
    {
      id: 'casing',
      index: 1,
      name: '外壳与尾翼',
      en: 'CASING & TAIL',
      tag: '结构 / 气动',
      accent: '#a9c4e8',
      role: '把内部组件固定为一个可投放的整体，并为弹道提供气动稳定。',
      desc: '承力外壳保护内部物理组件，尾翼组件在飞行中提供方向稳定性。历史装置还包含引信、保险与遥测系统；本示意只保留承力与气动层级。',
      material: '钢制承力壳体 · 铝合金蒙皮（示意）',
      fact: '外壳不是“装饰”：它同时承担结构固定、环境密封与气动稳定。',
      note: '真实装置的引信、保险与遥测接线被有意省略，避免把结构示意误读为工程图。',
      anchor: [1.1, 1.05, 0],
      labelOffset: [0, -58]
    },
    {
      id: 'detonators',
      index: 2,
      name: '起爆雷管阵列',
      en: 'DETONATOR ARRAY',
      tag: '起爆 / 同步',
      accent: '#ffc857',
      role: '在高能炸药透镜外表面建立多个同步起爆点。',
      desc: '多个雷管按设计时序同时触发，使爆轰从外表面开始向内传播。起爆点的位置与同步性决定了后续波阵面能否保持对称。',
      material: '雷管与起爆网络（示意）',
      fact: '关键不只是“炸得响”，而是多个起爆点几乎同时、对称地启动。',
      note: '本页不展示雷管型号、装药、桥丝、时序误差或同步电路。',
      anchor: [0, 2.35, 0],
      labelOffset: [18, -46]
    },
    {
      id: 'lens',
      index: 3,
      name: '炸药透镜层',
      en: 'EXPLOSIVE LENS',
      tag: '爆轰 / 整形',
      accent: '#ff8a4c',
      role: '把向外发散的爆轰波整形为向心传播的球面波。',
      desc: '由多块几何形状不同的高能炸药拼接成球壳。爆轰在界面处改变传播方向，使原本向外发散的波阵面逐步收拢，向核心汇聚。',
      material: '高能炸药透镜阵列（示意）',
      fact: '“透镜”借用了光学概念：不是聚焦光线，而是把爆轰波阵面重新整形。',
      note: '本页不展示炸药种类、透镜几何、界面角度或波速参数。',
      anchor: [0.55, 1.5, 0],
      labelOffset: [28, -55]
    },
    {
      id: 'pusher',
      index: 4,
      name: '铝推层',
      en: 'ALUMINUM PUSHER',
      tag: '缓冲 / 均压',
      accent: '#d7e3f4',
      role: '在炸药与反射层之间缓冲冲击，帮助压力更均匀地传递。',
      desc: '推层位于爆轰产物与高密度反射层之间，起到阻抗匹配与均压作用，减少局部冲击差异，让内侧组件获得更对称的压缩。',
      material: '铝制推层（示意）',
      fact: '多层材料的声阻抗不同，推层的作用之一是让冲击波更“平滑”地进入高密度层。',
      note: '本页不展示厚度、合金牌号或界面设计。',
      anchor: [0.45, 1.25, 0],
      labelOffset: [32, -24]
    },
    {
      id: 'tamper',
      index: 5,
      name: '铀反射层',
      en: 'URANIUM TAMPER',
      tag: '惯性 / 反射',
      accent: '#7fe0b0',
      role: '用高密度材料迟滞核心膨胀，并把逃逸中子反射回核心。',
      desc: '高密度反射层在压缩阶段依靠惯性约束核心，同时把部分逃逸中子散射回裂变区，降低临界质量需求并延长反应时间。',
      material: '天然铀制惰层 / 反射层（示意）',
      fact: '“反射”和“惯性约束”是两种不同作用：一个回中子，一个拖住膨胀。',
      note: '本页不展示材料纯度、质量、几何尺寸或中子学参数。',
      anchor: [0.35, 1.0, 0],
      labelOffset: [36, 8]
    },
    {
      id: 'core',
      index: 6,
      name: '钚核心',
      en: 'PLUTONIUM CORE',
      tag: '裂变 / 临界',
      accent: '#ff7a5c',
      role: '亚临界裂变材料；在对称压缩后进入超临界状态。',
      desc: '核心在常态下保持亚临界。向内汇聚的压缩波提高材料密度，减少中子逃逸概率，使系统在短时间内达到超临界并释放能量。',
      material: '钚-239 金属（示意）',
      fact: '内爆的关键目标不是“把球压小”，而是提高密度，让中子更难得地逃逸。',
      note: '本页不展示核心质量、形状公差、相态或任何武器设计参数。',
      anchor: [0.25, 0.76, 0],
      labelOffset: [30, 38]
    },
    {
      id: 'initiator',
      index: 7,
      name: '中子引发器',
      en: 'NEUTRON INITIATOR',
      tag: '起始 / 中子源',
      accent: '#b79cff',
      role: '在压缩峰值附近提供起始中子，触发可自持的链式反应。',
      desc: '引发器在恰当的时刻释放中子，为链式反应提供“第一粒火花”。过早或过晚都会降低能量释放效率；它体现的是时序与临界状态的配合。',
      material: '钋-铍型中子源（历史示意）',
      fact: '临界只是“具备条件”；起始中子决定链式反应何时真正开始。',
      note: '本页不展示中子源结构、活度、时序或触发机制。',
      anchor: [0, 0.3, 0],
      labelOffset: [0, 92]
    }
  ],
  chain: [
    { id: 'fire', label: '同步起爆', note: '多点同时启动' },
    { id: 'shape', label: '波阵整形', note: '爆轰向心收拢' },
    { id: 'compress', label: '压缩增压', note: '密度上升' },
    { id: 'critical', label: '超临界', note: '中子逃逸减少' },
    { id: 'release', label: '能量释放', note: '链式反应' }
  ],
  ethics: '1945 年 8 月 9 日，内爆式核装置被用于日本长崎，造成大量平民伤亡。把装置拆开看，是为了理解技术史与物理机制，而不是把后果从历史中拆掉。',
  sources: [
    {
      name: 'Smithsonian National Air and Space Museum · Fat Man',
      url: 'https://airandspace.si.edu/collection-objects/bomb-atomic-fm-fat-man/nasm_A19690059000'
    },
    {
      name: 'U.S. Department of Energy · The Manhattan Project',
      url: 'https://www.energy.gov/management/manhattan-project'
    },
    {
      name: 'National Museum of Nuclear Science & History · Fat Man',
      url: 'https://www.atomicheritage.org/history/fat-man'
    }
  ]
};
