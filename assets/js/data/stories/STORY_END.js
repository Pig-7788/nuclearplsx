/**
 * 模块：第八章 - 最终总结（公众回应 + 结业认证）
 * 归属：数据库 / 剧情与关卡配置层
 * 内容来源：综合前七章知识点
 * 玩法类型：公众科普回应（先选结论，再选支持依据；错题解释后可纠正）
 */

const chapterFinalSummaryData = {
    module_id: "ch08_epilogue",
    module_type: "final_summary",
    title: "终章：核科学认知档案",

    unlock_condition: "ch07_radiation_protection_completed",
    next_module_id: null,

    narrative: {
        scenes: [
            {
                scene_id: "fs_s1",
                text: "八章学习走到最后一页。这一次，不是再做一遍选择题，而是像科普工作者一样，面对公众的具体疑问。"
            },
            {
                scene_id: "fs_s2",
                text: "每道题都要给出两个判断：你的结论是什么，以及哪条依据能支持这个结论。答错会看到解释，并允许你纠正——理解比一次答对更重要。"
            }
        ]
    },

    phase_1_stats: {
        title: "你的核科学认知档案",
        fields: [
            { key: "attitude_baseline", label: "初始态度", default: "未记录" },
            { key: "pretest_correct", label: "前测答对" },
            { key: "knowledge_cards_collected", label: "收集知识卡", unit: "张" },
            { key: "modules_completed", label: "完成主线章节" },
            { key: "games_completed", label: "完成互动关卡", unit: "个" }
        ],
        attitude_prompt: "学完八章，再选一次：现在的你更接近哪种态度？",
        attitude_options: ["好奇", "害怕", "想了解真相", "更理性地看待"]
    },

    phase_2_response: {
        title: "公众科普回应",
        intro_text: "先选结论，再选支持结论的依据。两步都正确才算真正掌握；答错会给出解释，可以纠正。",
        questions: [
            {
                id: "q1",
                role: "焦虑的市民",
                context: "福岛核污染水排海后，社交平台上出现两种说法：一种认为“所有核电站每天都在排毒”，另一种认为“核电站完全不排放任何放射性物质”。",
                question: "核电站正常运行排放与福岛事故污染水，是一回事吗？",
                conclusions: [
                    { text: "不是。两者来源不同：正常运行排放经过净化、稀释、监测；事故污染水是事故后的特殊处置，不能混为一谈", ok: true },
                    { text: "是一回事，所有核电站每天都在排高浓度核废水", ok: false, why: "把正常运行排放与事故污染水混为一谈，是常见误解。" },
                    { text: "核电站完全不排放任何放射性物质", ok: false, why: "正常运行会有少量经过处理的流出物，受严格限值与监测；“完全不排放”也不准确。" }
                ],
                evidence: [
                    { text: "正常运行废液经净化、稀释、监测，排放量远低于限值；事故污染水的来源、处理路径与监管框架不同，需要分别评估", ok: true },
                    { text: "海水很大，所以排多少都无所谓", ok: false, why: "环境容量不是无限的；排放是否可接受，要基于剂量评估与持续监测。" },
                    { text: "核电站的放射性废水直接来自堆芯，没有任何处理", ok: false, why: "正常运行废液来自一回路等系统，经过处理与监测，不是直接排放堆芯水。" }
                ],
                explain: "把“正常运行排放”和“事故污染水”分开讨论，才能判断具体风险。判断排放是否可接受，要看来源、处理、剂量评估、监测数据与监管框架，而不是只看“排海”两个字。",
                review: "正常运行排放 ≠ 事故污染水；判断风险要看来源、处理、剂量与监测。",
                review_tag: "排放与剂量"
            },
            {
                id: "q2",
                role: "硬核网友",
                context: "某防辐射服广告称：银纤维面料可以挡住手机、电脑，甚至医院的 X 光。",
                question: "银纤维防辐射服能防 X 光吗？",
                conclusions: [
                    { text: "不能。银纤维主要屏蔽部分非电离电磁波，不能替代铅衣屏蔽 X 射线", ok: true },
                    { text: "能，银纤维可以吸收所有射线", ok: false, why: "没有任何面料能“吸收所有射线”；屏蔽 X 射线需要高密度、高原子序数材料。" },
                    { text: "不能，但日常手机、电脑辐射也需要严格防护", ok: false, why: "手机、电脑属于非电离辐射，日常无需特殊防护；关键是不要被营销话术制造焦虑。" }
                ],
                evidence: [
                    { text: "X 射线属电离辐射，屏蔽需要高密度材料（如铅）；日常电磁波属非电离辐射，能量不足以电离原子", ok: true },
                    { text: "穿得越厚，防 X 光效果越好", ok: false, why: "屏蔽 X 射线主要靠材料密度与原子序数，普通衣物增加厚度帮助有限。" },
                    { text: "医院 X 光没有辐射", ok: false, why: "医疗 X 光有辐射，但剂量受控，检查获益通常大于风险。" }
                ],
                explain: "把“电离辐射”和“非电离辐射”分开：前者需要专业屏蔽与剂量管理，后者在合规强度下无需恐慌。防辐射服不能替代医院的专业防护。",
                review: "电离辐射需高密度屏蔽；非电离辐射无需“防辐射服”。",
                review_tag: "辐射防护"
            },
            {
                id: "q3",
                role: "环保志愿者",
                context: "有人问：高放核废料毒性持续很久，是不是只能“永远封存”，或者干脆倒进海沟、发射到太空？",
                question: "高放核废料怎么处理才科学？",
                conclusions: [
                    { text: "经玻璃固化、金属容器、缓冲回填与稳定围岩多重屏障，进行深地质处置，长期隔离并持续监测；方案仍在持续优化", ok: true },
                    { text: "直接倒进海沟或发射到太空，一劳永逸", ok: false, why: "这两种做法风险高、成本高，且被国际实践所否定。" },
                    { text: "高放废料问题已经完全解决，不需要再研究", ok: false, why: "深地质处置仍在工程化推进，需要长期监测、安全评估与国际合作。" }
                ],
                evidence: [
                    { text: "玻璃固化把废料固定在稳定基体中；多重屏障 + 深地质处置是国际主流技术路线，需要长期监测与安全评估", ok: true },
                    { text: "稀释后排放即可，不需要隔离", ok: false, why: "高放废料需要长期隔离，不能简单稀释排放。" },
                    { text: "深地质处置意味着从此不再管理", ok: false, why: "处置库需要长期监测与制度化管理，“封存”不等于“忘记”。" }
                ],
                explain: "“多重屏障 + 深地质处置”不是一句“永远封存”就能概括：它是一套工程与制度安排，需要长期监测、安全评估和社会共识。科学的态度是承认不确定性，并持续改进。",
                review: "高放废料靠多重屏障与深地质处置长期隔离，需要监测与持续研究。",
                review_tag: "核废料处置"
            }
        ]
    },

    phase_3_certificate: {
        title: "结业认证",
        cert_name: "核科学认知档案管理员",
        motto: "科学认知 · 理性看待",
        description: "你已完成八章学习，并对公众问题完成“结论 + 依据”的判断。证书记录一次答对与经纠正后掌握的内容，愿你把理性的目光带给更多人。",
        buttons: [
            { text: "保存档案并退出", action: "exit_game" }
        ]
    },

    knowledge_cards: [
        {
            id: "kc_final_1",
            title: "科学与理性",
            content: "核科学技术既能保家卫国、提供清洁能源，也能造福百姓。掌握科学认知，它便能成为人类文明的助力；把“核”神秘化或妖魔化，都不利于公共讨论。"
        }
    ]
};

window.NEG = window.NEG || {};
window.NEG.story = window.NEG.story || {};
window.NEG.story[chapterFinalSummaryData.module_id] = chapterFinalSummaryData;
window.NEG.story.order = (window.NEG.story.order || []).concat([chapterFinalSummaryData.module_id]);
