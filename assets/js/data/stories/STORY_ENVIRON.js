/**
 * 模块：第六章 - 绿水青山（核废物安全处置）
 * 归属：数据库 / 剧情与关卡配置层
 * 内容来源：课件（乏燃料后处理、玻璃固化、高放处置、三废治理、马王堆、奥克洛）
 * 玩法类型：剧情引入 -> 流程排序 + 拖拽模拟
 */

const chapterClearWatersData = {
    module_id: "ch06_waste_process",
    module_type: "narrative_pipeline",
    title: "第六章：绿水青山",

    unlock_condition: "ch05_clean_energy_completed",
    next_module_id: "ch07_radiation_protection",

    narrative: {
        scenes: [
            {
                scene_id: "cw_s1",
                text: "核电虽然清洁，但反应堆里“燃烧”过的乏燃料具有极强的放射性。很多人问：这些核废料怎么处理？难道直接埋掉吗？"
            },
            {
                scene_id: "cw_s2",
                text: "其实，乏燃料是个“宝库”。里面含有高达95%的未反应铀、约1%的钚，以及4%的裂变产物。直接扔掉太浪费，所以我们首先要进行【乏燃料后处理】。"
            },
            {
                scene_id: "cw_s3",
                text: "通过先进的化学溶剂萃取技术（如PUREX流程），我们把铀和钚分离出来，重新制成核燃料，实现资源的闭式循环。对于剩下的长寿命高放射性核素，科学家还在研发【分离-嬗变】技术，用中子轰击它们，把“万年毒”变成“百年毒”甚至稳定元素，大大减轻处置负担。"
            },
            {
                scene_id: "cw_s4",
                text: "但无论如何提取，最后剩下的高放废液依然极度危险。此时必须采用【玻璃固化】：在1200度高温下，将废液与玻璃基料熔融，让放射性核素死死锁在玻璃的分子网络骨架中。这就像把猛兽关进了坚不可摧的铁笼子，极难溶解。"
            },
            {
                scene_id: "cw_s5",
                text: "固化后的废液变成玻璃体，封装进特制金属罐，进入最终的【核废料处置】。中低放废物只需在近地表处置库隔离几百年；而高放废物，则必须进行深地质处置。看看两千年前的长沙马王堆，古人用多重棺椁隔水绝氧保存女尸；看看20亿年前的非洲奥克洛天然反应堆，裂变产物只迁移了几厘米。大自然证明了地质层极佳的阻滞能力。"
            },
            {
                scene_id: "cw_s6",
                text: "在我国甘肃北山，我们将建在500-1000米深的花岗岩体中。玻璃固化体、金属罐、膨润土回填，加上稳定的地质岩体，多重屏障能确保放射性物质在万年甚至十万年内不进入生物圈。"
            },
            {
                scene_id: "cw_s7",
                text: "至于核设施运转中产生的【废气、废液和固体废物（三废）】，我们也有成熟的处理办法：废气通过衰变箱和高效过滤后高空排放；废液通过蒸发、离子交换净化；固废则通过超级压缩机压缩或焚烧来大幅减容。放射性物质被彻底拦截，环境是安全的。"
            },
            {
                scene_id: "cw_s8",
                text: "现在，请你作为工程师，在北山处置库中，布设多重屏障，完成最后的深埋闭环！"
            }
        ]
    },

    gameplay: {
        type: "multi_barrier_sort",
        title: "深地质处置多重屏障",
        intro_text: "高放废物的安全依托于多重屏障。请按从内到外（人工到天然）的顺序，将材料拖拽进处置孔中。",

        correct_order: [
            { step: 1, id: "glass", name: "玻璃固化体（锁死核素）" },
            { step: 2, id: "canister", name: "特制耐腐蚀金属罐（不锈钢或钛合金）" },
            { step: 3, id: "bentonite", name: "膨润土回填材料（吸水膨胀，吸附核素）" },
            { step: 4, id: "rock", name: "稳定的地质岩体（500-1000米深地下）" }
        ],

        pieces: [
            { id: "rock", name: "稳定的地质岩体" },
            { id: "glass", name: "玻璃固化体" },
            { id: "bentonite", name: "膨润土回填材料" },
            { id: "canister", name: "耐腐蚀金属罐" }
        ]
    },

    knowledge_cards: [
        {
            id: "kc_cw_1",
            title: "乏燃料后处理与分离-嬗变",
            content: "乏燃料中95%的铀和1%的钚可提取再利用。对于剩余的长寿命高放射性核素，可通过分离-嬗变技术，用中子轰击将其转变为短寿命或稳定核素。"
        },
        {
            id: "kc_cw_2",
            title: "玻璃固化与核废料分类处置",
            content: "高放废液经1200度高温熔融制成玻璃固化体。中低放废物一般进行近地表处置；高放废物必须在500-1000米深的稳定地质层中进行深地质处置（如我国甘肃北山）。"
        },
        {
            id: "kc_cw_3",
            title: "多重屏障与三废治理",
            content: "高放废物采用玻璃固化体、金属罐、膨润土和地质岩体组成的多重屏障确保上万年安全。核设施产生的废气、废液、固废经净化、减容、过滤后，达标排放。"
        }
    ],

    summary: "核废物并非无解。通过乏燃料后处理回收资源，再通过玻璃固化与深地质多重屏障，配合严格的废气废液治理，我们可以把危险永远封存，还自然一片绿水青山。"
};

window.NEG = window.NEG || {};
window.NEG.story = window.NEG.story || {};
window.NEG.story[chapterClearWatersData.module_id] = chapterClearWatersData;
window.NEG.story.order = (window.NEG.story.order || []).concat([chapterClearWatersData.module_id]);
