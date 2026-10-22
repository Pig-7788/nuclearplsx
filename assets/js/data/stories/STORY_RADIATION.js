/**
 * 模块：第七章 - 辐射防护
 * 归属：数据库 / 剧情与关卡配置层
 * 内容来源：课件（辐射来源、外照射三原则、内照射防护）
 * 玩法类型：防护原理体验（外照射调控 + 内照射判断 + 解释）
 */

const chapterRadiationProtectionData = {
    module_id: "ch07_radiation_protection",
    module_type: "narrative_pipeline",
    title: "第七章：辐射防护",

    unlock_condition: "ch06_waste_process_completed",
    next_module_id: "ch08_epilogue",

    narrative: {
        scenes: [
            {
                scene_id: "rp_s1",
                text: "辐射并不神秘。我们每天都会接触到天然辐射：宇宙射线、土壤与建材中的放射性核素、食物中的钾-40，以及呼吸的空气中的氡。全球平均天然本底约为每年 2.4 毫西弗。"
            },
            {
                scene_id: "rp_s2",
                text: "人工辐射中，医疗照射占绝大多数。相比之下，核电站周围居民受到的额外剂量通常远低于天然本底。判断风险的关键不是“有没有辐射”，而是剂量、时间和防护条件。"
            },
            {
                scene_id: "rp_s3",
                text: "防护要分两种情形：源在体外叫外照射，靠时间、距离、屏蔽；放射性物质进入体内叫内照射，靠通风、负压、防护装备和规范操作。二者不能用同一套办法。"
            }
        ]
    },

    gameplay: {
        type: "protection_lab",
        title: "防护原理体验",
        summary_title: "外照射和内照射，是两套不同的防护逻辑",
        intro_text: "外照射靠时间、距离、屏蔽；内照射靠阻止进入体内。先动手把剂量降下来，再解释为什么。",
        goal: 10,
        external: {
            setup: "工业探伤现场有一个未屏蔽的钴-60 γ 源，需要在 10 分钟内完成近距离操作。请把相对剂量降到 10% 以下，并选择对 γ 射线有效的屏蔽。",
            shields: [
                { id: "none", name: "无屏蔽", factor: 1, ok: false, why: "没有屏蔽时，只能靠时间和距离降低剂量。" },
                { id: "paper", name: "一张纸", factor: 1, ok: false, why: "纸可以挡住 α 粒子，但钴-60 的 γ 射线穿透力很强，纸几乎没有衰减作用。" },
                { id: "aluminum", name: "铝板", factor: 0.95, ok: false, why: "铝板对 β 粒子有效，对 γ 射线几乎无效。" },
                { id: "concrete", name: "混凝土", factor: 0.35, ok: true, why: "混凝土密度较高，可以显著衰减 γ 射线。" },
                { id: "lead", name: "铅板", factor: 0.08, ok: true, why: "铅密度高、原子序数大，是屏蔽 γ 射线的常用材料。" }
            ],
            quiz: {
                question: "钴-60 发出的 γ 射线，为什么纸和铝板几乎挡不住，而混凝土、铅板有效？",
                options: [
                    { text: "γ 射线穿透力强，需要高密度、高原子序数材料才能有效衰减", ok: true },
                    { text: "只要材料足够厚，纸也能完全挡住 γ 射线", ok: false, why: "纸的密度太低，靠增加厚度来屏蔽 γ 射线并不现实；“完全挡住”也不是防护设计的常用表述。" },
                    { text: "γ 射线在空气中会被吸收，所以不需要屏蔽", ok: false, why: "空气对 γ 射线的衰减很弱；不屏蔽就要靠距离和时间，不能当作“不需要防护”。" }
                ],
                feedbackOk: "正确。屏蔽效果取决于材料密度、原子序数和厚度，而不是“有没有东西挡着”。",
                feedbackBad: "再对照“屏蔽材料”的提示想一想：纸、铝和混凝土、铅的差别在哪里？"
            }
        },
        internal: {
            setup: "某实验室发生少量放射性粉尘洒落，你需要进入现场处理。请选择 3 项正确的防护措施。",
            need: 3,
            actions: [
                { text: "开启通风并保持负压", ok: true },
                { text: "穿戴正压防护服或气衣", ok: true },
                { text: "不在控制区饮食、吸烟", ok: true },
                { text: "戴普通医用口罩就够了", ok: false, why: "普通医用口罩不能可靠过滤放射性气溶胶或粉尘，需要根据危害选择呼吸防护。", },
                { text: "先吃碘盐预防", ok: false, why: "碘盐中的碘含量很低，达不到阻断放射性碘的剂量，盲目多吃还可能造成碘摄入过量。" },
                { text: "打开门窗自然通风", ok: false, why: "这会让污染空气扩散到其他区域；应维持负压并经高效过滤后排放。" }
            ],
            feedbackOk: "正确。内照射防护的核心是阻止放射性物质进入体内。",
            feedbackBad: "还有不正确或漏选的动作，看看每项的提示，再试一次。",
            quiz: {
                question: "内照射防护的核心是什么？",
                options: [
                    { text: "阻止放射性物质通过吸入、食入或伤口进入体内", ok: true },
                    { text: "多穿衣服，把体外的射线挡住", ok: false, why: "这是外照射防护的思路；内照射的危险来自进入体内的放射性物质。" },
                    { text: "吃碘盐，让甲状腺“吃饱”", ok: false, why: "碘盐不能替代稳定碘片，也不能阻止其他放射性核素进入体内。" }
                ],
                feedbackOk: "正确。外照射与内照射的防护重点不同。",
                feedbackBad: "回顾一下：外照射防护的是“射线”，内照射防护的是“物质进入”。"
            }
        }
    },

    knowledge_cards: [
        {
            id: "kc_rp_1",
            title: "辐射的来源与剂量",
            content: "全球平均天然本底约每年 2.4 mSv；人工辐射中医疗照射占绝大多数。核电站周围居民的额外剂量通常远低于天然本底，但仍需持续监测。"
        },
        {
            id: "kc_rp_2",
            title: "外照射防护：时间、距离、屏蔽",
            content: "缩短受照时间、增大距离、加入合适屏蔽。γ 射线穿透力强，需要混凝土、铅等高密度材料；α、β 射线的屏蔽要求不同。"
        },
        {
            id: "kc_rp_3",
            title: "内照射防护：阻止进入",
            content: "通过通风、负压、正压防护服、手套箱和规范操作，防止放射性物质经吸入、食入或伤口进入体内。"
        }
    ],

    summary: "外照射靠时间、距离、屏蔽；内照射靠阻止进入体内。掌握两者的区别，才能把辐射风险控制在可接受范围内，而不是被“核”字吓住。"
};

window.NEG = window.NEG || {};
window.NEG.story = window.NEG.story || {};
window.NEG.story[chapterRadiationProtectionData.module_id] = chapterRadiationProtectionData;
window.NEG.story.order = (window.NEG.story.order || []).concat([chapterRadiationProtectionData.module_id]);
