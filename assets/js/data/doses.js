/* ============================================================
 * 核纪元 · 数据层 — 辐射剂量数据集
 * 全部剂量统一折算为 mSv（毫西弗），便于同一标尺比较。
 * 数值取公开权威资料（UNSCEAR、ICRP、IAEA、国家核安全局等）
 * 的常用保守值；慢性（年累积）与急性（单次）已在 note 中注明。
 * 本文件为传统脚本（非 ES Module），直接挂载到 window.NEG.data。
 * ============================================================ */

window.NEG = window.NEG || {};
window.NEG.data = window.NEG.data || {};

/* ---------- 剂量分组 ---------- */
window.NEG.data.doseGroups = [
  { id: "daily", name: "日常生活" },
  { id: "medical", name: "医疗检查" },
  { id: "nature", name: "天然本底" },
  { id: "work", name: "职业与事故" },
  { id: "space", name: "航天与极端" }
];

/* ---------- 剂量条目（26 项） ----------
 * 字段：id 唯一标识 / name 名称 / group 分组 / value 数值(mSv)
 *       unit 单位 / icon 图标 / note 说明（含口径与换算）
 */
window.NEG.data.doses = [
  /* ===== 日常生活 ===== */
  {
    id: "banana",
    name: "吃一根香蕉",
    group: "daily",
    value: 0.0001,
    unit: "mSv",
    icon: "🍌",
    note: "香蕉富含钾-40，约 0.1 微西弗，约相当于 20 分钟天然本底。"
  },
  {
    id: "airport-scan",
    name: "一次机场安检",
    group: "daily",
    value: 0.0001,
    unit: "mSv",
    icon: "🛂",
    note: "背散射 X 射线安检约 0.1 微西弗；毫米波安检属于非电离辐射，不产生电离剂量。"
  },
  {
    id: "flight-long",
    name: "一次长途飞行",
    group: "daily",
    value: 0.06,
    unit: "mSv",
    icon: "✈️",
    note: "北京—纽约约 10 小时，高空宇宙射线约 0.04–0.08 毫西弗。"
  },
  {
    id: "brick-house",
    name: "住砖混/混凝土住宅（年附加）",
    group: "daily",
    value: 0.2,
    unit: "mSv",
    icon: "🏠",
    note: "建材中天然放射性核素带来的年附加剂量，因地区与通风差异较大（约 0.1–0.3）。"
  },

  /* ===== 医疗检查 ===== */
  {
    id: "xray-limb",
    name: "拍一张四肢 X 光片",
    group: "medical",
    value: 0.001,
    unit: "mSv",
    icon: "🦴",
    note: "单部位摄影，约 1 微西弗。"
  },
  {
    id: "dental-xray",
    name: "一次牙科 X 光",
    group: "medical",
    value: 0.005,
    unit: "mSv",
    icon: "🦷",
    note: "根尖片约 5 微西弗；全景片约 0.01 毫西弗。"
  },
  {
    id: "chest-xray",
    name: "一次胸片",
    group: "medical",
    value: 0.1,
    unit: "mSv",
    icon: "🫁",
    note: "正侧位合计约 0.1 毫西弗，相当于约半个月本底。"
  },
  {
    id: "chest-fluoro",
    name: "一次胸部透视",
    group: "medical",
    value: 0.3,
    unit: "mSv",
    icon: "🩻",
    note: "透视比普通胸片剂量高，依设备与时长约 0.3–1 毫西弗。"
  },
  {
    id: "mammography",
    name: "一次乳腺钼靶",
    group: "medical",
    value: 0.4,
    unit: "mSv",
    icon: "🎗️",
    note: "双侧乳腺摄影，约 0.4 毫西弗。"
  },
  {
    id: "head-ct",
    name: "一次头部 CT",
    group: "medical",
    value: 2,
    unit: "mSv",
    icon: "🧠",
    note: "约 2 毫西弗，约相当于 10 个月的天然本底（按 2.4 毫西弗/年）。"
  },
  {
    id: "abdomen-ct",
    name: "一次腹部 CT",
    group: "medical",
    value: 10,
    unit: "mSv",
    icon: "🩻",
    note: "约 10 毫西弗，相当于约 4 年的天然本底。"
  },
  {
    id: "coronary-cta",
    name: "一次冠状动脉 CTA",
    group: "medical",
    value: 12,
    unit: "mSv",
    icon: "🫀",
    note: "依扫描方案约 8–16 毫西弗，属较高剂量检查。"
  },
  {
    id: "pet-ct",
    name: "一次 PET-CT",
    group: "medical",
    value: 7,
    unit: "mSv",
    icon: "🔬",
    note: "含示踪剂与 CT 部分，约 7 毫西弗（不同显像剂有差异）。"
  },
  {
    id: "bone-scan",
    name: "一次骨扫描",
    group: "medical",
    value: 6,
    unit: "mSv",
    icon: "🦴",
    note: "锝-99m 标记药物，约 4–6 毫西弗。"
  },
  /* ===== 天然本底 ===== */
  {
    id: "background-day",
    name: "一天受到的天然本底",
    group: "nature",
    value: 0.0066,
    unit: "mSv",
    icon: "🌍",
    note: "按全球平均 2.4 毫西弗/年折算，每天约 6.6 微西弗。"
  },
  {
    id: "background-year",
    name: "全球平均天然本底（年）",
    group: "nature",
    value: 2.4,
    unit: "mSv",
    icon: "🌱",
    note: "UNSCEAR 口径，含氡及其子体、宇宙射线、地面伽马与食入。"
  },
  {
    id: "brazil-high-background",
    name: "巴西瓜拉帕里高本底（局部，年）",
    group: "nature",
    value: 10,
    unit: "mSv",
    icon: "🏖️",
    note: "部分富钍海滨区域可达约 5–10 毫西弗/年，属局部高值；当地居民健康未见明确异常。"
  },
  {
    id: "ramsar-high-background",
    name: "伊朗拉姆萨尔高本底（年）",
    group: "nature",
    value: 10.2,
    unit: "mSv",
    icon: "🏔️",
    note: "部分居民年有效剂量可达 10–20 毫西弗，长期流行病学调查未发现明确辐射危害。"
  },

  /* ===== 职业与事故 ===== */
  {
    id: "npp-neighbor",
    name: "核电站周边居民（年附加）",
    group: "work",
    value: 0.01,
    unit: "mSv",
    icon: "🏘️",
    note: "UNSCEAR 评估通常低于 0.01 毫西弗/年，远小于天然本底的正常涨落。"
  },
  {
    id: "npp-worker",
    name: "核电站工作人员（年）",
    group: "work",
    value: 2,
    unit: "mSv",
    icon: "👷",
    note: "典型年有效剂量约 1–2 毫西弗；职业照射法定限值为 20 毫西弗/年（5 年累计不超过 100）。"
  },
  {
    id: "fukushima-worker",
    name: "福岛事故应急作业人员（估算）",
    group: "work",
    value: 170,
    unit: "mSv",
    icon: "⚠️",
    note: "2011 年 3 月参与高放废水作业的部分人员估算有效剂量约 170–180 毫西弗；后续评估中个别应急人员累积剂量更高，均属应急照射，不属于正常运行工况。"
  },
  {
    id: "chernobyl-firefighter",
    name: "切尔诺贝利消防员（首批典型）",
    group: "work",
    value: 10000,
    unit: "mSv",
    icon: "☢️",
    note: "首批消防员受到约 2–16 戈瑞急性照射，10 戈瑞为代表性量级；部分人员在数周内死亡。"
  },

  /* ===== 航天与极端 ===== */
  {
    id: "iss-6months",
    name: "宇航员驻留空间站 6 个月",
    group: "space",
    value: 100,
    unit: "mSv",
    icon: "🚀",
    note: "国际空间站约 80–160 毫西弗，取决于太阳活动、轨道高度与出舱次数。"
  },
  {
    id: "ars-threshold",
    name: "急性辐射病阈值",
    group: "space",
    value: 1000,
    unit: "mSv",
    icon: "🚨",
    note: "约 1 戈瑞全身急性照射可出现恶心、白细胞下降等急性辐射病表现。"
  },
  {
    id: "ld50",
    name: "半数致死剂量（未治疗）",
    group: "space",
    value: 4000,
    unit: "mSv",
    icon: "💀",
    note: "约 4 戈瑞；未治疗时约半数受照者会在 60 天内死亡（LD50/60）。"
  }
];

/* ---------- 关键剂量参考线 ---------- */
window.NEG.data.doseRefs = [
  { label: "公众年剂量限值（人工源）", value: 1, unit: "mSv/年" },
  { label: "全球平均天然本底", value: 2.4, unit: "mSv/年" },
  { label: "职业照射年限值", value: 20, unit: "mSv/年" },
  { label: "急性辐射病阈值", value: 1000, unit: "mSv" },
  { label: "半数致死剂量（未治疗）", value: 4000, unit: "mSv" }
];

/* ---------- 天然本底构成（UNSCEAR 口径，合计 100%） ----------
 * 全球平均天然本底约 2.4 mSv/年：
 * 氡及子体约 1.15、地面伽马约 0.48、宇宙射线约 0.39、食入约 0.29，
 * 四舍五入后余量归入“其他”，合计 100%。
 */
window.NEG.data.background = [
  { name: "氡及其子体", pct: 48, color: "#22d3ee" },
  { name: "地面伽马射线", pct: 20, color: "#34d399" },
  { name: "宇宙射线", pct: 16, color: "#60a5fa" },
  { name: "食入（食物与饮水）", pct: 12, color: "#fbbf24" },
  { name: "其他（建材等）", pct: 4, color: "#a78bfa" }
];

/* ---------- 剂量单位小词典 ---------- */
window.NEG.data.units = [
  {
    unit: "Bq",
    name: "贝可勒尔",
    desc: "每秒发生衰变的原子核数，衡量放射性活度。1 Bq = 每秒 1 次衰变。"
  },
  {
    unit: "Gy",
    name: "戈瑞",
    desc: "吸收剂量，每千克物质吸收 1 焦耳辐射能量。1 Gy = 1 J/kg。"
  },
  {
    unit: "Sv",
    name: "希沃特",
    desc: "等效剂量，在吸收剂量上乘以辐射权重因子，反映对人体的生物效应。1 Sv = 1000 mSv。"
  }
];

/* ---------- 辐射入门：电离 vs 非电离 ---------- */
window.NEG.data.radiationIntro = {
  nonIonizing:
    "非电离辐射包括无线电波、微波、红外线、可见光等，单个光子能量低，不足以把原子中的电子打出来。手机、Wi-Fi、微波炉、输电线路都属于这一类，按国家标准控制强度即可安全使用。",
  ionizing:
    "电离辐射包括 X 射线、伽马射线、中子及高能粒子等，能量足以使原子电离，可直接或间接损伤 DNA。它并不神秘：用屏蔽、距离和时间就能把剂量控制在安全范围内，医院与核电站都执行严格的剂量限值。"
};
