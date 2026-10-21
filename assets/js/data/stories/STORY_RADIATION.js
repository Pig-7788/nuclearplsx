/**
 * 模块：第七章 - 辐射防护
 * 归属：数据库 / 剧情与关卡配置层
 * 内容来源：课件（辐射来源、外照射三原则、内照射防护、常见误区）
 * 玩法类型：剧情引入 -> 触发独立打假模块
 */

const chapterRadiationProtectionData = {
    module_id: "ch07_radiation_protection",
    module_type: "narrative_trigger",
    title: "第七章：辐射防护",

    unlock_condition: "ch06_waste_process_completed",
    next_module_id: "ch08_epilogue",

    narrative: {
        scenes: [
            {
                scene_id: "rp_s1",
                text: "提到辐射，许多人会觉得害怕。但其实，辐射无处不在。自古以来，人类就在天然辐射的环境中繁衍生息。我们每天呼吸的空气（含有氡气）、吃的食物（富含钾-40）、住的房子，甚至我们的身体本身，都是一个微小的辐射源。天然辐射占了人类所受辐射的75%左右。"
            },
            {
                scene_id: "rp_s2",
                text: "人类所受的另外25%来源于人工辐射。你可能想不到，这里面约80%来源于医疗照射（如X光、CT检查）。相比之下，核电站带给周围居民的额外辐射剂量，不到天然本底的1%。从数值上看，坐一次飞机、甚至吃一根香蕉的辐射，都完全在安全范围内。"
            },
            {
                scene_id: "rp_s3",
                text: "面对需要接触的真正高强度辐射，我们有一整套成熟的防护措施。对于【外照射】，牢记三原则：时间（尽量缩短）、距离（越远越好）、屏蔽（加入阻挡物）。α射线用一张纸就能挡住，β射线用铝片，而穿透力极强的γ射线和中子，则需要厚厚的混凝土或含铅材料才能有效衰减。"
            },
            {
                scene_id: "rp_s4",
                text: "对于【内照射】，危险的是放射性物质通过吸入、食入或伤口进入体内。所以我们采用通风降低浓度、穿戴防护气衣（保持正压），甚至在密封的手套箱或负压环境下操作。在放射性工作场所，还会划分绿区、橙区、红区来严格管理。"
            },
            {
                scene_id: "rp_s5",
                text: "然而，网络上充斥着各种防辐射的“小妙招”。比如吃碘盐、多肉植物防辐射、银纤维防辐射服……这些其实统统是伪科学！现在，请进入打假模式，用刚刚学到的物理常识击碎它们！",
                // 触发独立打假模块
                action: {
                    type: "launch_module",
                    target_module: "rumor_debunking_game",
                    payload: {
                        rumor_pack_id: "pack_radiation_protection"
                    }
                }
            }
        ]
    },

    module_trigger_interface: {
        triggered_module: "rumor_debunking_game",
        data_source: "RUMOR_DB.js",
        pack_id: "pack_radiation_protection"
    },

    knowledge_cards: [
        {
            id: "kc_rp_1",
            title: "辐射的来源与剂量",
            content: "天然辐射占75%（宇宙射线、土壤、食物、氡气等），人工辐射占25%（80%来自医疗）。核电站增加的剂量极微，无需谈“核”色变。"
        },
        {
            id: "kc_rp_2",
            title: "外照射与内照射防护",
            content: "外照射防护靠时间、距离、屏蔽（α用纸，β用铝，γ用混凝土/铅）。内照射防护靠防止吸入和食入（通风、穿防护气衣、保持正压）。"
        },
        {
            id: "kc_rp_3",
            title: "被误解的防辐射方法",
            content: "吃碘盐防辐射、多肉植物防辐射、银纤维防辐射服等均为谣言。防电离辐射真正有效的是铅制品或厚重的混凝土。"
        }
    ],

    summary: "辐射不可怕，无知才可怕。掌握了科学的防护方法，了解了真实的辐射来源，核辐射完全可以被有效隔绝。"
};

window.NEG = window.NEG || {};
window.NEG.story = window.NEG.story || {};
window.NEG.story[chapterRadiationProtectionData.module_id] = chapterRadiationProtectionData;
window.NEG.story.order = (window.NEG.story.order || []).concat([chapterRadiationProtectionData.module_id]);
