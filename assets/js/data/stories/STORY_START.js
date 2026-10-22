/**
 * 模块：第一章 - 总览
 * 归属：数据库 / 剧情与关卡配置层
 * 玩法类型：开场前测（三道诊断题 + 初始态度）→ 学习路线 → 压缩版历史叙事
 */

const chapterOverviewData = {
    module_id: "ch01_overview",
    module_type: "narrative",
    title: "第一章：总览",

    unlock_condition: "none",
    next_module_id: "ch02_national_security",

    /* 开场关卡：在正文之前启动，只记录起点，不评分 */
    opening_gameplay: {
        type: "cognition_pretest",
        title: "开卷前测",
        intro_text: "在学习开始前，先记录你的判断与态度。前测不公布答案，也不影响成绩。",
        note: "凭第一反应作答即可，不公布答案。",
        attitude_prompt: "开始前，你对核能的态度更接近？",
        attitude_options: ["好奇", "害怕", "想了解真相"],
        questions: [
            {
                id: "pre_1",
                text: "手机、Wi-Fi 和微波炉产生的辐射，属于哪一类？",
                options: [
                    { text: "非电离辐射，能量不足以电离原子", ok: true },
                    { text: "电离辐射，和 X 光、γ 射线一样", ok: false },
                    { text: "核辐射，来自放射性核素", ok: false }
                ]
            },
            {
                id: "pre_2",
                text: "核电站正常运行时，周围居民受到的额外辐射剂量通常怎样？",
                options: [
                    { text: "远低于天然本底，但仍需持续监测", ok: true },
                    { text: "明显高于天然本底，属于高风险", ok: false },
                    { text: "大致相当于每天做一次 CT", ok: false }
                ]
            },
            {
                id: "pre_3",
                text: "对高放核废料，目前国际上更主流的科学处置方向是？",
                options: [
                    { text: "玻璃固化 + 多重屏障 + 深地质处置，并长期监测", ok: true },
                    { text: "直接排入深海，让海水稀释", ok: false },
                    { text: "发射到太空，彻底离开地球", ok: false }
                ]
            }
        ]
    },

    /* 前测之后先给读者一张八章地图 */
    learning_route: true,

    acts: [
        {
            act_id: "act_1",
            subtitle: "过去——发现与担当",
            scenes: [
                {
                    scene_id: "s1_1",
                    text: "1895 年，伦琴发现 X 射线；随后贝克勒尔发现铀的放射性，居里夫妇提炼出钋和镭。卢瑟福揭开原子结构，查德威克发现中子，哈恩证实核裂变——人类第一次真正看见原子内部。"
                },
                {
                    scene_id: "s1_2",
                    text: "1964 年第一颗原子弹爆炸成功，1967 年第一颗氢弹试验成功，1970 年第一艘核潜艇下水。‘两弹一艇’挺起了大国的脊梁，也让中国在世界核科学版图上有了自己的位置。"
                }
            ]
        },
        {
            act_id: "act_2",
            subtitle: "曾经——力量与恐惧",
            scenes: [
                {
                    scene_id: "s2_1",
                    text: "1945 年，广岛与长崎的蘑菇云让人类第一次见识核武器的毁灭性力量。此后，三哩岛、切尔诺贝利、福岛三次严重事故，又把‘核’与恐惧紧紧绑在一起。"
                },
                {
                    scene_id: "s2_2",
                    text: "当力量超出想象，人们开始追问：我们真的能掌控它吗？核，究竟是普罗米修斯的火种，还是潘多拉的魔盒？这份档案，就是从这里开始整理的。"
                }
            ]
        },
        {
            act_id: "act_3",
            subtitle: "现在——科学与生活",
            scenes: [
                {
                    scene_id: "s3_1",
                    text: "核技术远不止武器与事故：PET-CT 在分子层面寻找病灶，辐射育种培育高产抗病品种，食品辐照抑制发芽，射线探伤给高铁焊缝做‘体检’。它已经悄悄进入医院、农田和工厂。"
                },
                {
                    scene_id: "s3_2",
                    text: "在能源上，核能是可大规模替代化石燃料的重要低碳选项之一；在探索上，重离子加速器、同步辐射光源与可控核聚变，正把人类推向微观极限与能源未来。"
                },
                {
                    scene_id: "s3_3",
                    text: "八章之后，你会再次面对三道前测题。不必急着记住每个数字，先学会判断来源、剂量、证据与边界——这才是这份认知档案真正要留下的东西。",
                    emphasis: true
                }
            ]
        }
    ],

    knowledge_cards: [],

    summary: "从历史沿革到生活应用，用八章建立对核科学技术的整体判断，并在终章回看自己的认知变化。"
};

window.NEG = window.NEG || {};
window.NEG.story = window.NEG.story || {};
window.NEG.story[chapterOverviewData.module_id] = chapterOverviewData;
window.NEG.story.order = (window.NEG.story.order || []).concat([chapterOverviewData.module_id]);
