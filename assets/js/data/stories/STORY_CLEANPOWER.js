/**
 * 模块：第五章 - 清洁能源
 * 归属：数据库 / 剧情与关卡配置层
 * 内容来源：课件（核能巨大、核燃料循环、核岛、啤酒白酒不炸原理、控制棒、多重屏障、铀钚分级）
 * 玩法类型：剧情引入 -> 触发独立模块（反应堆建造）
 */

const chapterCleanEnergyData = {
    module_id: "ch05_clean_energy",
    module_type: "narrative_trigger",
    title: "第五章：清洁能源",

    unlock_condition: "ch04_people_safety_completed",
    next_module_id: "ch06_waste_process",

    // 第一阶段：剧情引入（深度扩写）
    narrative: {
        scenes: [
            {
                scene_id: "ce_s1",
                text: "化石燃料终有枯竭的一天。核能，是目前可大规模替代化石燃料的重要低碳选项之一。1千克铀-235完全裂变释放的能量，相当于270万千克标准煤。但在变成电能之前，它需要经历一段漫长的旅程。"
            },
            {
                scene_id: "ce_s2",
                text: "这就是‘核燃料循环’。从铀矿开采，到矿石加工、铀浓缩、燃料制造，再到进入反应堆发电。而在反应堆中‘燃烧’过后的乏燃料，还可以通过后处理提取出剩余的铀和钚再利用。这是一条真正的‘从摇篮到坟墓’的工业链条。"
            },
            {
                scene_id: "ce_s3",
                text: "走进核电站的核心——核岛。这里面没有熊熊燃烧的烈火，只有一个被称作‘原子锅炉’的反应堆。在这里，中子像火柴一样点燃核燃料，引发铀-235的链式反应。其核心反应方程式之一为：U-235 + n → Ba-144 + Kr-89 + 3n + 能量。一瞬间，巨大的热能就此释放。"
            },
            {
                scene_id: "ce_s4",
                text: "很多公众担心：核电站会不会像原子弹一样爆炸？不会发生核爆炸，原因要从“浓缩”说起。这涉及到一个关键概念——‘浓缩’。天然铀中铀-235的丰度仅0.71%；原子弹需要丰度大于90%的‘武器级铀’（像95度烈酒，一点就着）；而核电站使用的‘低浓铀’丰度仅3%-5%（像啤酒，根本点不着）。此外，反应堆里插着一排排由硼或镉制成的‘控制棒’，它们像海绵吸水一样吸收多余的中子，让反应按‘计划生育’平稳进行。"
            },
            {
                scene_id: "ce_s5",
                text: "除了铀，人类还能从乏燃料中提取出‘钚’。根据钚-240的含量不同，分为反应堆级、燃料级和武器级。为了万无一失，反应堆被层层包裹在‘多重屏障体系’中：第一层是封闭核燃料的锆合金‘包壳’，耐高温高压，破损率极低；第二层是重达数百吨的反应堆‘压力容器’，作为心脏部位，保证绝对没有裂缝和泄漏；第三层是外层的‘安全壳’，一米厚的预应力钢筋混凝土加上内壁钢板，能抵御地震、飓风甚至飞机撞击，内部保持负压，绝不让放射性物质外泄。"
            },
            {
                scene_id: "ce_s6",
                text: "现在，请你接管主控台，进入建造模块，组装这座能安全释放巨大能量的核电站！",
                // 触发独立的拼装/流程模块
                action: {
                    type: "launch_module",
                    target_module: "reactor_build_game",
                    payload: {
                        puzzle_id: "pwr_core_structure" // 传入要加载的拼图/流程题ID
                    }
                }
            }
        ]
    },

    // 接口声明
    module_trigger_interface: {
        triggered_module: "reactor_build_game",
        data_source: "REACTOR_PUZZLE_DB.js",
        puzzle_id: "pwr_core_structure"
    },

    /* 建造完成后的第二关：追踪热量与电能的路径 */
    extra_gameplay: {
        type: "power_trace",
        title: "追踪一度电",
        intro_text: "反应堆建好了，但热量是怎样变成电的？从堆芯开始，按顺序连接能量经过的每一环。",
        path: [
            { id: "core", name: "堆芯核裂变放热", hint: "一切从这里开始", note: "核能 → 热能" },
            { id: "primary", name: "一回路高压水带出热量", hint: "密闭回路，不直接接触汽轮机", note: "热量进入蒸汽发生器" },
            { id: "sg", name: "蒸汽发生器换热", hint: "核岛与常规岛的交界", note: "二回路水 → 蒸汽" },
            { id: "steam", name: "蒸汽进入汽轮机", hint: "推动叶片旋转", note: "热能 → 机械能" },
            { id: "generator", name: "汽轮机带动发电机", hint: "转子切割磁感线", note: "机械能 → 电能" },
            { id: "grid", name: "主变压器升压并网", hint: "一度电的终点", note: "送入电网" }
        ],
        roles: [
            {
                question: "汽轮机在能量转换中起什么作用？",
                options: [
                    { text: "把蒸汽的热能转化为机械能，带动转子旋转", ok: true },
                    { text: "把机械能转化为电能", ok: false, why: "把机械能转化为电能的是发电机。" },
                    { text: "过滤掉蒸汽中的放射性物质", ok: false, why: "一回路与二回路通过蒸汽发生器换热；汽轮机不承担过滤功能。" }
                ]
            },
            {
                question: "发电机的作用是什么？",
                options: [
                    { text: "把汽轮机传来的机械能转化为电能", ok: true },
                    { text: "把水加热成蒸汽", ok: false, why: "把水加热成蒸汽的是蒸汽发生器（或锅炉）。" },
                    { text: "把电能转化为热能", ok: false, why: "发电机是发电设备，不是电加热器。" }
                ]
            }
        ]
    },

    // 本章知识卡（扩写并加入方程式与分级）
    knowledge_cards: [
        {
            id: "kc_ce_1",
            title: "核燃料循环与裂变",
            content: "核能工业的完整链条：铀矿开采→加工浓缩→燃料制造→反应堆发电→乏燃料后处理。典型裂变方程式：U-235 + n → Ba-144 + Kr-89 + 3n + 能量。"
        },
        {
            id: "kc_ce_2",
            title: "铀与钚的分级用途",
            content: "铀-235丰度>90%为武器级（造原子弹），3%-5%为低浓铀（核电站燃料），0.71%为天然铀。钚-239丰度>93%为武器级，含量较低的则可作为反应堆燃料。浓度决定了它们的用途与危险程度。"
        },
        {
            id: "kc_ce_3",
            title: "为什么核电站不会核爆？",
            content: "核电站燃料铀浓度仅为3%-5%（像啤酒点不着），而原子弹需90%以上（如烈酒）。此外，反应堆通过控制棒吸收多余中子，使反应速率保持在可控的平稳状态。"
        },
        {
            id: "kc_ce_4",
            title: "反应堆的多重屏障体系",
            content: "第一层屏障是锆合金燃料包壳；第二层屏障是厚实的反应堆压力容器；第三层屏障是能抵御极端外力的一米厚钢筋混凝土安全壳。这三道防线共同包容放射性物质，尽可能减少其向外释放的可能；它们需要设计、建造与运行维护共同保证。"
        }
    ],

    summary: "核能不仅是国家安全的底牌，更是清洁能源的未来。从燃料循环的精密运作，到多重屏障的层层包容，核能正在更安全地照亮人类的未来。"
};

window.NEG = window.NEG || {};
window.NEG.story = window.NEG.story || {};
window.NEG.story[chapterCleanEnergyData.module_id] = chapterCleanEnergyData;
window.NEG.story.order = (window.NEG.story.order || []).concat([chapterCleanEnergyData.module_id]);
