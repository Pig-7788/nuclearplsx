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
                text: "化石燃料终有枯竭的一天。核能，是目前唯一能取代化石燃料的高效、清洁、经济的能源。1千克铀-235完全裂变释放的能量，相当于270万千克标准煤。但在变成电能之前，它需要经历一段漫长的旅程。"
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
                text: "很多公众担心：核电站会不会像原子弹一样爆炸？绝对不会。这涉及到一个关键概念——‘浓缩’。天然铀中铀-235的丰度仅0.71%；原子弹需要丰度大于90%的‘武器级铀’（像95度烈酒，一点就着）；而核电站使用的‘低浓铀’丰度仅3%-5%（像啤酒，根本点不着）。此外，反应堆里插着一排排由硼或镉制成的‘控制棒’，它们像海绵吸水一样吸收多余的中子，让反应按‘计划生育’平稳进行。"
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
            content: "第一层屏障是锆合金燃料包壳；第二层屏障是厚实的反应堆压力容器；第三层屏障是能抵御极端外力的一米厚钢筋混凝土安全壳。这三道防线彻底隔绝了放射性物质向外释放的可能。"
        }
    ],

    summary: "核能不仅是国家安全的底牌，更是清洁能源的未来。从燃料循环的精密运作，到多重屏障的绝对守护，核能正在安全地照亮人类的未来。"
};

window.NEG = window.NEG || {};
window.NEG.story = window.NEG.story || {};
window.NEG.story[chapterCleanEnergyData.module_id] = chapterCleanEnergyData;
window.NEG.story.order = (window.NEG.story.order || []).concat([chapterCleanEnergyData.module_id]);
