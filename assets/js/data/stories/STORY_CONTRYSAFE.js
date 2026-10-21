/* 第二章：历史科普与外观展示，不包含内部结构、装配或工程参数。 */
const chapterNationalSecurityData = {
    module_id: 'ch02_national_security',
    module_type: 'narrative',
    title: '第二章：国家安全',
    unlock_condition: 'ch01_overview_completed',
    next_module_id: 'ch03_innovation_frontier',
    narrative: {
        scenes: [
            { scene_id: 'ns_s1', text: '1964年10月16日，中国首次原子弹试验成功。这是中国核科学技术发展历程中的重要历史节点。' },
            { scene_id: 'ns_s2', text: '认识这段历史，也要认识科学研究背后的责任。核武器的使用会带来严重的人道与环境后果，和平利用核能和防止核扩散同样重要。' },
            { scene_id: 'ns_s3', text: '核科学的价值远不止于国防。在电力、医学、农业与材料研究中，核技术也在为日常生活服务。' },
            { scene_id: 'ns_s4', text: '接下来进入历史科普展台。你可以旋转一个抽象的封闭外观展品，阅读三张知识卡，梳理历史、和平用途与科学责任。展品不对应真实武器设计。' }
        ]
    },
    gameplay: {
        type: 'nuclear_history_exhibit',
        title: '核科学历史展台',
        intro_text: '旋转查看外观示意，阅读三张知识卡后完成本节。',
        exhibits: [
            { id: 'milestone', title: '历史节点 · 1964', text: '1964年10月16日，中国首次原子弹试验成功。这一历史节点，反映了当时核科学研究和相关科研组织的发展。' },
            { id: 'peaceful', title: '和平用途 · 走进生活', text: '核技术还应用于核能发电、医学诊断与治疗、农业育种和材料研究。理解核科学，应同时看到这些和平用途。' },
            { id: 'responsibility', title: '科学责任 · 安全与和平', text: '核武器会造成严重的人道与环境后果。学习相关历史，也应关注核安全、辐射防护、核不扩散与和平利用。' }
        ]
    },
    knowledge_cards: [
        { id: 'kc_ns_1', title: '核科学历史与科学责任', content: '1964年10月16日，中国首次原子弹试验成功。理解这段历史，也需要关注核安全、核不扩散与和平利用。' },
        { id: 'kc_ns_2', title: '核技术的和平用途', content: '核技术应用于电力、医学、农业和材料研究。具体技术需要相应的安全管理与防护。' }
    ],
    summary: '从历史中理解核科学，在安全与责任的前提下认识它的和平用途。'
};
window.NEG = window.NEG || {};
window.NEG.story = window.NEG.story || {};
window.NEG.story[chapterNationalSecurityData.module_id] = chapterNationalSecurityData;
window.NEG.story.order = (window.NEG.story.order || []).concat([chapterNationalSecurityData.module_id]);
