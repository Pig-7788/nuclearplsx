/**
 * 模块：第八章 - 最终总结（结业与答辩）
 * 归属：数据库 / 剧情与关卡配置层
 * 内容来源：综合前七章知识点与全局数据
 * 玩法类型：数据结算 + 终极答辩 + 结业证书
 */

const chapterFinalSummaryData = {
    module_id: "ch08_epilogue",
    module_type: "final_summary",
    title: "终章：核科学认知档案", // 去除了原兰大标语

    unlock_condition: "ch07_radiation_protection_completed",
    next_module_id: null, // 游戏结束

    narrative: {
        scenes: [
            {
                scene_id: "fs_s1",
                text: "历时数日的整理，这份【核科学认知档案】终于迎来了最后一页。",
                visual_hint: "发光的档案袋缓缓打开，飞出无数光点"
            },
            {
                scene_id: "fs_s2",
                text: "你已不再是那个对核一无所知的旁观者。现在，作为优秀的核科普助理，请面对公众的提问，完成最后的结业答辩。",
                visual_hint: "切换至发布会现场/答辩大厅界面"
            }
        ]
    },

    // 阶段一：数据结算（Agent 需要从全局数据库读取这些数据渲染）
    phase_1_stats: {
        title: "你的核科学认知档案",
        fields: [
            { key: "attitude_baseline", label: "初始态度记录", default: "好奇" },
            { key: "rumors_debunked_count", label: "粉碎核谣言", unit: "条" },
            { key: "knowledge_cards_collected", label: "收集知识卡", unit: "张" },
            { key: "modules_completed", label: "完成主线章节", unit: "章" }
        ]
    },

    // 阶段二：终极科普答辩（实战判断）
    phase_2_defense: {
        title: "终极科普答辩",
        intro_text: "面对公众的疑虑和尖锐问题，请选择最科学、最符合核安全观的回答。",
        questions: [
            {
                id: "q1",
                role: "焦虑的市民",
                question: "听说福岛排海了，我们吃的海鲜是不是都被核污染了？核电站是不是每天都在往外排毒？",
                options: [
                    {
                        text: "核电站正常运行有严格的排放标准。放射性废液经过净化、监测，远低于限值才允许排放，其带来的剂量微乎其微。",
                        is_correct: true,
                        feedback: "回答正确！我们在‘绿水青山’章学过，废气废液必须净化且受严格监测，绝不是随意排放。"
                    },
                    {
                        text: "确实很危险，大家最好这辈子都别吃海鲜了，核电站就是个大炸弹。",
                        is_correct: false,
                        feedback: "错啦。核电站有多重屏障保护，不会像原子弹一样爆炸，离开剂量谈毒性是不科学的。"
                    }
                ]
            },
            {
                id: "q2",
                role: "硬核网友",
                question: "我看网上说，孕妇穿了银纤维防辐射服，就能挡掉手机和电脑辐射，甚至能防X光？",
                options: [
                    {
                        text: "银纤维防辐射服确实能防X光，孕妇一定要多穿。",
                        is_correct: false,
                        feedback: "错啦。X光等电离辐射穿透力极强，防它需要铅板。银纤维只能屏蔽部分非电离辐射（电磁波），不能防电离辐射。"
                    },
                    {
                        text: "电脑手机是非电离辐射，日常不用防；如果是医院X光，得用铅衣。多肉植物和银纤维服都是智商税。",
                        is_correct: true,
                        feedback: "满分回答！你在‘辐射防护’章掌握了屏蔽材料的核心知识，没有掉进商业陷阱。"
                    }
                ]
            },
            {
                id: "q3",
                role: "环保志愿者",
                question: "你们搞核电，那几万年都有毒的核废料到底怎么处理？难道留给子孙后代吗？",
                options: [
                    {
                        text: "把它们发射到太空中，或者直接倒进最深的海沟里。",
                        is_correct: false,
                        feedback: "这是极其危险且被国际严禁的做法。核废料绝不能随意处置。"
                    },
                    {
                        text: "经过玻璃固化后装入特制金属罐，再埋入地下数百米深的稳定地质层。利用多重屏障实现万年级别的安全隔离。",
                        is_correct: true,
                        feedback: "回答完美！在‘绿水青山’章，你成功建造了深地质处置库的多重屏障，这正是现实中的科学解法。"
                    }
                ]
            }
        ]
    },

    // 阶段三：结业证书（触发最终UI）
    phase_3_certificate: {
        title: "结业认证",
        cert_name: "核科学认知档案管理员",
        motto: "科学认知 · 理性看待", // 已替换为中立通用口号
        description: "恭喜你完成了全部核科学科普挑战。愿你带着理性的目光，看待核科学，传递真理，不再谈‘核’色变。",
        buttons: [
            { text: "保存档案并退出", action: "exit_game" }
        ]
    },

    // 最终全局知识卡（作为整个游戏的压轴）
    knowledge_cards: [
        {
            id: "kc_final_1",
            title: "科学与理性",
            content: "核科学技术是一把双刃剑，它既能保家卫国、提供清洁能源，也能造福百姓。掌握科学认知，它便能成为人类文明的强大助力。"
        }
    ]
};

window.NEG = window.NEG || {};
window.NEG.story = window.NEG.story || {};
window.NEG.story[chapterFinalSummaryData.module_id] = chapterFinalSummaryData;
window.NEG.story.order = (window.NEG.story.order || []).concat([chapterFinalSummaryData.module_id]);
