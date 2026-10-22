/**
 * 模块：总览章（叙事模块）
 * 归属：数据库 / 剧情配置层
 * 用途：供 task-manager 调度和前端渲染引擎读取
 */

const chapterOverviewData = {
    module_id: "ch01_overview",
    module_type: "narrative", // 标明这是纯叙事模块，无核心玩法
    title: "总览：核科学技术的历史沿革",

    // 模块流转控制
    unlock_condition: "none",
    next_module_id: "ch02_national_security",

    // 交互配置
    interaction_rule: {
        advance_by: "click", // 点击推进
        allow_skip: true,    // 允许跳过
        skip_result: {
            completed: true,
            skipped: true
        }
    },

    // 剧情幕次与场景数据
    acts: [
        {
            act_id: "act_1",
            subtitle: "过去——成就辉煌",
            scenes: [
                {
                    scene_id: "s1_1",
                    text: "1895年，伦琴发现了X射线，人类第一次看到了自己身体内部的骨骼。紧接着，贝克勒尔发现了铀的放射性，居里夫妇提炼出了钋和镭。"
                },
                {
                    scene_id: "s1_2",
                    text: "随后，卢瑟福揭开了原子结构的奥秘，查德威克发现了中子，哈恩证实了核裂变。爱因斯坦写下了质能方程 E=mc²。探索真理，比占有真理更为可贵，这是核科学最纯粹的黄金时代。"
                },
                {
                    scene_id: "s1_3",
                    text: "从伦琴获得第一次诺贝尔物理学奖至今，有超过三分之一的诺贝尔物理学奖和化学奖，都与放射性、辐射或核科学有关。核科学技术，奠定了现代科学技术的基础。"
                },
                {
                    scene_id: "s1_4",
                    text: "不仅如此，通过人工核反应，人类合成了一系列自然界不存在的超铀元素，将元素周期表整整拓展了三分之一！"
                },
                {
                    scene_id: "s1_5",
                    text: "而在东方，1964年第一颗原子弹爆炸成功，1967年第一颗氢弹试验成功，1970年第一艘核潜艇下水。中国的‘两弹一艇’事业，挺起了大国的脊梁，打破了核垄断与核讹诈。"
                }
            ]
        },
        {
            act_id: "act_2",
            subtitle: "曾经——骄傲迷茫",
            scenes: [
                {
                    scene_id: "s2_1",
                    text: "然而，科学的突破很快被卷入了战争的阴云。1942年，费米建成了世界上第一座可控核反应堆，开启了人类利用核能的新纪元。但这同时也是‘曼哈顿计划’的一部分。"
                },
                {
                    scene_id: "s2_2",
                    text: "1945年，广岛与长崎升起了蘑菇云，人类第一次见识到了核武器毁灭性的力量，二战的硝烟以一种极其残酷的方式终结。"
                },
                {
                    scene_id: "s2_3",
                    text: "随后几十年里，核能的和平利用并非一帆风顺。1979年三英里岛核事故，1986年切尔诺贝利核电站4号反应堆发生爆炸，大量放射性物质泄漏，成为人类历史上最严重的核灾难。2011年，日本福岛核电站因地震海啸发生严重事故。"
                },
                {
                    scene_id: "s2_4",
                    text: "核事故的阴云笼罩在公众心头。当力量超出想象，人们开始恐惧：我们真的能掌控它吗？核，究竟是普罗米修斯的火种，还是潘多拉的魔盒？"
                }
            ]
        },
        {
            act_id: "act_3",
            subtitle: "现在——蒸蒸日上",
            scenes: [
                {
                    scene_id: "s3_1",
                    text: "但核科技，远不止于武器与事故。经历过阵痛与反思，人类已经掌握了驾驭它的能力。核技术早已悄然渗透进我们生活的每一个角落，成为现代社会的基石。"
                },
                {
                    scene_id: "s3_2",
                    text: "在能源领域，核能是目前可大规模替代化石燃料的重要低碳选项之一。一座百万千瓦级的核电站，每年可以减少数百万吨二氧化碳排放，为‘绿水青山’贡献力量。"
                },
                {
                    scene_id: "s3_3",
                    text: "在医疗健康上，它是精准诊断与治疗的利器。PET-CT能让病灶无处遁形，放射性同位素能定向杀灭癌细胞。同位素示踪、放射免疫分析，每天都在拯救无数生命。"
                },
                {
                    scene_id: "s3_4",
                    text: "在农业上，辐射育种让种子焕发新生，培育出高产、抗病的新品种；食品辐照技术抑制发芽、杀菌保鲜，让大蒜常温下两百天不发芽。"
                },
                {
                    scene_id: "s3_5",
                    text: "在工业与考古中，它是探索未知的慧眼。辐射探伤为飞机、高铁的焊缝做‘体检’；碳-14测年法揭开了无数历史谜团；甚至你头顶的火灾报警器，里面也有放射源在站岗放哨。"
                }
            ]
        },
        {
            act_id: "act_4",
            subtitle: "将来——前途无量",
            scenes: [
                {
                    scene_id: "s4_1",
                    text: "如今，中国核电的在运与在建机组规模已位居世界前列。从跟跑到并跑，再到领跑，我们正在走向清洁能源的未来。"
                },
                {
                    scene_id: "s4_2",
                    text: "而人类的终极目标，是‘人造太阳’。可控核聚变（如中国的东方超环EAST和国际热核聚变实验堆ITER），一旦实现，有望提供燃料资源丰富的清洁能源；但等离子体约束、材料与工程集成等挑战仍待突破。",
                    // 唯一的数据交互点：读完前面所有内容后，在这里记录初始态度
                    interaction: {
                        type: "choice",
                        prompt: "此刻，你的感受是？",
                        options: ["好奇", "害怕", "想了解真相"],
                        save_to_db_field: "attitude_baseline",
                        mandatory: false
                    }
                },
                {
                    scene_id: "s4_3",
                    text: "什么是合理的发展水平？我们该如何与这种强大的力量共存？如何建立科学的认知，消除误解与恐惧？",
                    emphasis: true
                },
                {
                    scene_id: "s4_4",
                    text: "这份厚重的【核科学认知档案】，现在交由你来整理。你准备好了吗？",
                    emphasis: true
                }
            ]
        }
    ]
};

// 导出给 task-manager 或渲染引擎使用
window.NEG = window.NEG || {};
window.NEG.story = window.NEG.story || {};
window.NEG.story[chapterOverviewData.module_id] = chapterOverviewData;
window.NEG.story.order = (window.NEG.story.order || []).concat([chapterOverviewData.module_id]);
