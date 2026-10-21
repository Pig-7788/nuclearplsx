/**
 * 模块：第四章 - 百姓平安
 * 归属：数据库 / 剧情与关卡配置层
 * 内容来源：课件（辐射源、医学应用、食品农业、工业应用）
 * 玩法类型：触发独立打假模块
 */

const chapterPeopleSafetyData = {
    module_id: "ch04_people_safety",
    module_type: "narrative_trigger",
    title: "第四章：百姓平安",

    unlock_condition: "ch03_innovation_frontier_completed",
    // 解锁打假模块的全局入口
    unlock_system_feature: "rumor_debunking_mode",
    next_module_id: "ch05_clean_energy",

    narrative: {
        scenes: [
            {
                scene_id: "ps_s1",
                text: "在很多人的印象里，核等同于危险。但实际上，核技术早已在默默守护着我们的平安与健康。这要从‘辐射源’说起。人类利用加速器（机械源）和钴源（核素源），制造出各种射线，它们成为了现代科技的超级工具。"
            },
            {
                scene_id: "ps_s2",
                text: "走进医院，核技术是治病救人的利器。X光和CT能精准透视身体内部；钴-60和电子加速器能发出高能射线，像导弹一样精准杀灭癌细胞（放射治疗）；碘-131或米粒大小的‘种子源’甚至能直接放入体内进行近距离治疗。PET/SPECT等核医学显像技术，更能在分子水平上让病灶无处遁形。"
            },
            {
                scene_id: "ps_s3",
                text: "走进超市和农田，核技术同样大显身手。经过‘食品辐照’处理的土豆、大蒜，在常温下放两百天都不发芽，这是因为射线抑制了细胞发育；它还能杀死粮食里的虫卵，且绝不会让食物带放射性。在农业上，利用射线照射种子诱发基因突变（辐射育种），我国培育出了‘鲁棉1号’等大量高产抗病的新品种。"
            },
            {
                scene_id: "ps_s4",
                text: "在工业生产中，辐射探伤是给飞机、高铁焊缝做‘体检’的无损检测；辐射加工能让电线电缆耐高温、抗老化；同位素示踪剂还能注入油井，帮我们寻找石油。甚至你头顶的火灾报警器，里面也有一点点放射源，在时刻站岗放哨。"
            },
            {
                scene_id: "ps_s5",
                text: "面对这些身边的核技术，网络上的谣言却从未停止。现在，请进入‘核谣言粉碎机’模块，运用科学知识击碎它们！",
                // 触发独立的打假模块
                action: {
                    type: "launch_module",
                    target_module: "rumor_debunking_game",
                    payload: {
                        rumor_pack_id: "pack_people_safety" // 传入要加载的题库ID
                    }
                }
            }
        ]
    },

    // 这里不再写具体的打假逻辑，只留接口说明，说明此章调用了哪个独立模块
    module_trigger_interface: {
        triggered_module: "rumor_debunking_game",
        data_source: "RUMOR_DB.js", // 指示去谣言库读取
        pack_id: "pack_people_safety"
    },

    knowledge_cards: [
        {
            id: "kc_ps_1",
            title: "核技术的四大民用领域",
            content: "核技术广泛应用于辐射源制造、医学诊疗（放疗、显像）、食品农业（辐照保鲜、辐射育种）以及工业（探伤、加工、示踪）。"
        },
        {
            id: "kc_ps_2",
            title: "食品辐照",
            content: "利用射线杀菌、抑制发芽，是安全无残留的物理保鲜手段，认准Radura标志，可放心食用。"
        }
    ],

    summary: "面对核技术，我们不应盲目恐惧。科学认识、打破谣言，才能让核科技更好地造福百姓平安。"
};

window.NEG = window.NEG || {};
window.NEG.story = window.NEG.story || {};
window.NEG.story[chapterPeopleSafetyData.module_id] = chapterPeopleSafetyData;
window.NEG.story.order = (window.NEG.story.order || []).concat([chapterPeopleSafetyData.module_id]);
