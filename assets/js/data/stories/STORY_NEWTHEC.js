/**
 * 模块：第三章 - 创新前沿
 * 归属：数据库 / 剧情与关卡配置层
 * 内容来源：课件（新元素发现、核素图、大科学装置）+ 第四代核电、可控核聚变
 * 玩法类型：科研委托台（选装置 → 说明理由 → 理解能力与局限）
 */

const chapterInnovationFrontierData = {
    module_id: "ch03_innovation_frontier",
    module_type: "narrative_deduction",
    title: "第三章：创新前沿",

    unlock_condition: "ch02_national_security_completed",
    next_module_id: "ch04_people_safety",

    narrative: {
        scenes: [
            {
                scene_id: "if_s1",
                text: "核科学的前沿，一边向微观极限推进，一边向能源未来探索。合成新元素、解析材料结构、治疗深部肿瘤，靠的不是“更强的核”，而是不同的装置与探测手段。"
            },
            {
                scene_id: "if_s2",
                text: "在元素周期表深处，理论预言存在“超重稳定岛”。科学家用重离子加速器把离子加速到高能量，轰击靶核合成新核素，再通过衰变链探测它们的存在。"
            },
            {
                scene_id: "if_s3",
                text: "我国利用兰州重离子加速器等装置，在多个核区首次合成和鉴定了新核素；同步辐射光源则像“超级显微镜”，用高亮度 X 射线研究原子排列与电子结构。"
            },
            {
                scene_id: "if_s4",
                text: "能源方向上，第四代核能系统追求更好的安全特性与资源利用率；可控核聚变（如 EAST）则在探索另一条路线。它们各有潜力，也都面临工程与材料上的挑战。"
            },
            {
                scene_id: "if_s5",
                text: "现在请进入“科研委托台”。三项真实研究委托，需要你为每项任务选择合适的技术或装置，并说明理由——同时看清它能解决什么、又有什么局限。"
            }
        ]
    },

    gameplay: {
        type: "research_desk",
        title: "科研委托台",
        summary_title: "合适的装置，比“更强的核”更重要",
        intro_text: "先读委托目标，再选装置，最后说明理由。选错会给出提示，可以重试。",
        commissions: [
            {
                id: "element",
                icon: "⚛️",
                client: "核物理研究所",
                task: "合成并鉴定 119 号元素，验证超重稳定岛附近核素是否存在。",
                goal: "需要高能重离子束流轰击靶核，并能探测极短寿命的衰变链。",
                devices: [
                    { name: "兰州重离子加速器", sub: "重离子束流 + 探测器", ok: true, why: "它能提供高能重离子束，配合探测系统合成并鉴定新核素。" },
                    { name: "同步辐射光源", sub: "高亮度 X 射线", ok: false, why: "它用 X 射线研究结构，不能把重离子加速成“炮弹”去合成新核。" },
                    { name: "高温气冷堆", sub: "第四代裂变堆", ok: false, why: "它是发电/供热装置，不能提供合成超重元素所需的重离子束。" },
                    { name: "EAST 托卡马克", sub: "磁约束聚变装置", ok: false, why: "它研究聚变等离子体，不是重离子加速与核素合成装置。" }
                ],
                reason: {
                    question: "为什么这项委托需要重离子加速器？",
                    options: [
                        { text: "它能提供高能重离子束并配有探测系统，适合合成与鉴定新核素", ok: true },
                        { text: "它产生的 X 射线能直接给新元素拍照", ok: false, why: "X 射线结构分析是同步辐射光源的强项；合成新元素靠的是离子束轰击靶核。" },
                        { text: "它靠核裂变直接产生新元素", ok: false, why: "合成超重元素靠核反应，不是反应堆里的裂变链式反应。" }
                    ],
                    feedbackOk: "正确。装置能力与探测手段要匹配。",
                    feedbackBad: "再对照“目标”里的两个关键词：高能重离子束、衰变链探测。"
                },
                solve: "合成超重元素、研究核素图边界与核结构。",
                limit: "合成概率极低，往往需要长期实验；新核素寿命可能只有毫秒甚至更短，探测与确认难度很大。"
            },
            {
                id: "material",
                icon: "🔬",
                client: "新能源材料实验室",
                task: "观察新型电池材料中的原子排列与电子结构，解释性能差异。",
                goal: "需要高亮度、可调波长的 X 射线，做衍射与吸收谱分析。",
                devices: [
                    { name: "同步辐射光源", sub: "高亮度、可调 X 射线", ok: true, why: "高亮度、可调波长的 X 射线适合衍射、吸收谱等结构分析。" },
                    { name: "兰州重离子加速器", sub: "重离子束流", ok: false, why: "它主要提供离子束，不是高亮度 X 射线光源。" },
                    { name: "钴-60 辐照装置", sub: "γ 射线辐照", ok: false, why: "它用于辐照加工或灭菌，不适合原子级结构解析。" },
                    { name: "核电站汽轮机", sub: "常规岛设备", ok: false, why: "这是发电设备，与材料微观结构分析无关。" }
                ],
                reason: {
                    question: "为什么材料结构分析常用同步辐射光源？",
                    options: [
                        { text: "高亮度、可调波长的 X 射线适合衍射与吸收谱，能获得原子尺度的结构信息", ok: true },
                        { text: "它能直接拍出单个原子的照片", ok: false, why: "结构分析得到的是统计平均的结构信息，不是“单原子照片”。" },
                        { text: "它能杀死材料里的细菌，让结构更清晰", ok: false, why: "材料结构分析与杀菌无关。" }
                    ],
                    feedbackOk: "正确。光源亮度与波长可调性决定了能做什么实验。",
                    feedbackBad: "再对照“目标”里的关键词：高亮度、可调波长、衍射与吸收谱。"
                },
                solve: "解析晶体结构、电子结构与材料缺陷，指导材料设计。",
                limit: "需要样品制备与复杂数据处理；强光可能损伤某些样品；结果通常是统计平均，不能简单等同于单原子图像。"
            },
            {
                id: "therapy",
                icon: "🏥",
                client: "肿瘤医院",
                task: "肿瘤紧邻重要器官，需要把能量尽量集中到靶区，减少周围组织损伤。",
                goal: "需要精确的剂量分布与可调能量，而不是只做诊断。",
                devices: [
                    { name: "重离子治疗装置", sub: "加速器 + 束流配送", ok: true, why: "重离子在射程末端形成 Bragg 峰，能量更集中，可更好保护周围组织。" },
                    { name: "普通 X 光机", sub: "诊断用 X 射线", ok: false, why: "它主要用于诊断成像，剂量分布不如重离子集中，不是治疗设备。" },
                    { name: "PET-CT", sub: "核医学显像", ok: false, why: "它是诊断性显像设备，不直接用于放射治疗。" },
                    { name: "食品辐照装置", sub: "辐照加工", ok: false, why: "它用于食品/物品辐照，不是医疗治疗装置。" }
                ],
                reason: {
                    question: "为什么重离子治疗能更好地保护周围组织？",
                    options: [
                        { text: "重离子在射程末端形成 Bragg 峰，能量集中，剂量分布更可控", ok: true },
                        { text: "重离子会像 X 光一样穿透人体而不衰减", ok: false, why: "重离子会在特定深度沉积能量；与 X 射线穿透后的剂量分布不同。" },
                        { text: "重离子治疗靠放射性药物进入体内", ok: false, why: "那是核医学内照射治疗；重离子治疗是外部束流照射。" }
                    ],
                    feedbackOk: "正确。剂量分布是放疗的核心。",
                    feedbackBad: "再对照“目标”里的关键词：能量集中、减少周围组织损伤。"
                },
                solve: "深部、邻近重要器官肿瘤的精准放疗。",
                limit: "设备昂贵、适应证有限，需要多学科评估；并非所有肿瘤都适合重离子治疗。"
            }
        ]
    },

    knowledge_cards: [
        {
            id: "kc_if_1",
            title: "大科学装置：不同的“眼睛”和“炮台”",
            content: "重离子加速器可合成新核素、模拟航天单粒子效应；同步辐射光源适合结构分析。选择装置要看任务需要的是离子束、X 射线还是其他能力。"
        },
        {
            id: "kc_if_2",
            title: "第四代核能与聚变：潜力与挑战并存",
            content: "第四代核能系统追求更好的安全特性与资源利用率；可控核聚变燃料资源丰富，但仍面临等离子体约束、材料与工程集成等挑战。"
        },
        {
            id: "kc_if_3",
            title: "技术有边界",
            content: "同一项核技术在不同场景下的能力不同：能诊断不等于能治疗，能合成新元素不等于能发电。理解装置的强项与局限，才能做出合适选择。"
        }
    ],

    summary: "创新前沿不是“更猛的核”，而是把合适的装置用在对的问题上。合成、分析、治疗各有不同的工具，也各有清晰的边界。"
};

window.NEG = window.NEG || {};
window.NEG.story = window.NEG.story || {};
window.NEG.story[chapterInnovationFrontierData.module_id] = chapterInnovationFrontierData;
window.NEG.story.order = (window.NEG.story.order || []).concat([chapterInnovationFrontierData.module_id]);
