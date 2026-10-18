/* ============================================================
   核纪元 · SVG 图形层
   plant()  —— 压水堆全厂剖面（建造实验用）
   core()   —— 反应堆堆芯剖面（控制台用）
   纯字符串生成，无外部图片依赖
   ============================================================ */
window.NEG = window.NEG || {};
(function (NEG) {
  'use strict';

  const parts = (NEG.data.plant && NEG.data.plant.parts) || [];

  function slotRect(partId, x, y, w, h, rx, labelX, labelY, anchor) {
    return (
      '<g class="slot-group" data-slot="' + partId + '">' +
        '<rect class="slot" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx || 8) + '"/>' +
        '<text class="slot-label" x="' + labelX + '" y="' + labelY + '" text-anchor="' + (anchor || 'middle') + '">' +
          (parts.find((p) => p.id === partId) || {}).short +
        '</text>' +
      '</g>'
    );
  }

  function label(partId, x, y, anchor, cls) {
    const p = parts.find((q) => q.id === partId) || {};
    return '<text class="part-label ' + (cls || '') + '" x="' + x + '" y="' + y + '" text-anchor="' + (anchor || 'middle') + '">' + (p.short || '') + '</text>';
  }

  /* ============================================================
     全厂剖面
     ============================================================ */
  function plant() {
    const hatch = [];
    for (let x = 52; x <= 1150; x += 22) {
      hatch.push('<path d="M ' + x + ' 600 l -7 9"/>');
    }

    const fuelRods = [];
    for (let i = 0; i < 7; i++) {
      fuelRods.push('<rect x="' + (278 + i * 10) + '" y="414" width="7" height="80" rx="3.5"/>');
    }

    const rodLines = [];
    for (let i = 0; i < 5; i++) {
      rodLines.push('<line x1="' + (291 + i * 9.5) + '" y1="330" x2="' + (291 + i * 9.5) + '" y2="448"/>');
    }

    return (
      '<svg class="plant-svg" viewBox="0 0 1200 680" role="img" aria-label="压水堆核电站剖面示意图：核岛包含压力容器、蒸汽发生器、主泵、稳压器与安全壳；常规岛包含汽轮机、发电机、冷凝器与冷却塔。">' +
      '<defs>' +
        '<pattern id="pl-grid" width="40" height="40" patternUnits="userSpaceOnUse">' +
          '<path d="M 40 0 H 0 V 40" fill="none" stroke="rgba(120,190,255,0.055)" stroke-width="1"/>' +
        '</pattern>' +
        '<linearGradient id="pl-fuel" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#ffe6a3"/><stop offset="1" stop-color="#ff9f1c"/>' +
        '</linearGradient>' +
        '<radialGradient id="pl-core-glow"><stop offset="0" stop-color="rgba(255,171,61,0.5)"/><stop offset="1" stop-color="rgba(255,171,61,0)"/></radialGradient>' +
        '<path id="pl-hot" d="M 362 372 H 432"/>' +
        '<path id="pl-surge" d="M 391 345 V 372"/>' +
        '<path id="pl-cold" d="M 470 540 V 580 H 250 V 430 H 258"/>' +
        '<path id="pl-steam" d="M 470 288 V 200 H 731 V 302"/>' +
        '<path id="pl-exhaust" d="M 809 368 V 424"/>' +
        '<path id="pl-feed" d="M 770 496 V 560 H 508 V 530"/>' +
        '<path id="pl-cw-in" d="M 870 452 H 950 L 990 520"/>' +
        '<path id="pl-cw-out" d="M 990 556 L 950 490 H 870"/>' +
        '<path id="pl-cable" d="M 930 310 V 208 H 945"/>' +
        '<path id="pl-gridline" d="M 1015 180 H 1096"/>' +
      '</defs>' +

      /* 背景 */
      '<rect x="0" y="0" width="1200" height="680" fill="url(#pl-grid)" opacity="0.7"/>' +

      /* 管道（底层） */
      '<g class="pipes">' +
        '<use href="#pl-hot" class="pipe l1"/><use href="#pl-hot" class="flow l1" data-loop="1"/>' +
        '<use href="#pl-surge" class="pipe l1"/>' +
        '<use href="#pl-cold" class="pipe l1"/><use href="#pl-cold" class="flow l1" data-loop="1"/>' +
        '<use href="#pl-steam" class="pipe l2"/><use href="#pl-steam" class="flow l2" data-loop="2"/>' +
        '<use href="#pl-exhaust" class="pipe l2"/>' +
        '<use href="#pl-feed" class="pipe l2"/><use href="#pl-feed" class="flow l2" data-loop="2"/>' +
        '<use href="#pl-cw-in" class="pipe l3"/><use href="#pl-cw-in" class="flow l3" data-loop="3"/>' +
        '<use href="#pl-cw-out" class="pipe l3"/><use href="#pl-cw-out" class="flow l3" data-loop="3"/>' +
        '<use href="#pl-cable" class="pipe grid-pipe"/>' +
        '<use href="#pl-gridline" class="pipe grid-pipe"/>' +
      '</g>' +

      /* 方向箭头 */
      '<g fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7">' +
        '<path d="M 396 368 l 8 4 -8 4" stroke="#ffcf8a"/>' +
        '<path d="M 306 576 l -8 4 8 4" stroke="#ffcf8a"/>' +
        '<path d="M 600 196 l 8 4 -8 4" stroke="#a5f0ff"/>' +
        '<path d="M 600 556 l -8 4 8 4" stroke="#a5f0ff"/>' +
        '<path d="M 928 448 l 8 4 -8 4" stroke="#a7fdda"/>' +
        '<path d="M 928 486 l -8 4 8 4" stroke="#a7fdda"/>' +
      '</g>' +

      /* 地面 */
      '<line x1="40" y1="600" x2="1160" y2="600" stroke="rgba(120,190,255,0.3)" stroke-width="2"/>' +
      '<g stroke="rgba(120,190,255,0.13)" stroke-width="1">' + hatch.join('') + '</g>' +

      /* 冷却塔蒸汽 */
      '<g fill="none" stroke="rgba(190,225,255,0.22)" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 9">' +
        '<path d="M 1044 300 C 1040 274 1054 262 1048 240"/>' +
        '<path d="M 1074 300 C 1082 272 1070 258 1080 232"/>' +
        '<path d="M 1104 300 C 1100 276 1110 266 1106 246"/>' +
      '</g>' +

      /* 输电塔（装饰） */
      '<g fill="none" stroke="rgba(150,180,210,0.45)" stroke-width="1.5" stroke-linecap="round">' +
        '<path d="M 1096 180 L 1110 78 L 1124 180"/>' +
        '<path d="M 1102 132 H 1118"/><path d="M 1104 152 H 1116"/><path d="M 1098 168 H 1122"/>' +
        '<path d="M 1100 180 L 1118 132 M 1120 180 L 1102 132"/>' +
        '<path d="M 1110 78 V 58"/>' +
        '<path d="M 1094 96 L 1126 96 M 1098 114 L 1122 114"/>' +
        '<path d="M 1110 58 H 1170"/>' +
      '</g>' +
      '<text x="1140" y="46" text-anchor="middle" fill="rgba(150,180,210,0.5)" font-size="10.5" letter-spacing="2">电 网</text>' +

      /* ================= 部件 ================= */
      /* 压力容器 */
      '<g class="part" data-part="vessel">' +
        '<path d="M 258 372 A 52 26 0 0 0 362 372 L 362 515 A 52 26 0 0 1 258 515 Z" fill="rgba(56,225,255,0.045)" stroke="#8fb6d9" stroke-width="2.6"/>' +
        '<path d="M 258 372 A 52 26 0 0 0 362 372" fill="none" stroke="#cfe3ff" stroke-width="3.2"/>' +
        '<rect x="270" y="405" width="80" height="100" rx="6" fill="rgba(56,225,255,0.05)" stroke="rgba(143,182,217,0.55)" stroke-width="1.4"/>' +
        '<line x1="240" y1="372" x2="258" y2="372" stroke="#8fb6d9" stroke-width="3"/>' +
        '<line x1="362" y1="372" x2="380" y2="372" stroke="#8fb6d9" stroke-width="3"/>' +
        '<line x1="310" y1="341" x2="310" y2="330" stroke="#8fb6d9" stroke-width="3"/>' +
        label('vessel', 310, 572, 'middle') +
      '</g>' +

      /* 燃料组件 */
      '<g class="part" data-part="fuel">' +
        '<rect x="272" y="408" width="76" height="94" rx="5" fill="url(#pl-core-glow)" opacity="0.9"/>' +
        '<g fill="url(#pl-fuel)" stroke="#ffc857" stroke-width="0.7">' + fuelRods.join('') + '</g>' +
        '<line x1="252" y1="450" x2="274" y2="450" stroke="rgba(143,182,217,0.45)" stroke-width="0.9"/>' +
        label('fuel', 250, 454, 'end', 'is-loop1') +
      '</g>' +

      /* 控制棒 */
      '<g class="part" data-part="rods">' +
        '<rect x="286" y="318" width="48" height="52" rx="4" fill="rgba(120,190,255,0.1)" stroke="#8fb6d9" stroke-width="1.8"/>' +
        '<rect x="278" y="312" width="64" height="8" rx="2" fill="rgba(120,190,255,0.16)" stroke="rgba(143,182,217,0.7)" stroke-width="1.2"/>' +
        '<g stroke="#cfe3ff" stroke-width="3" stroke-linecap="round">' + rodLines.join('') + '</g>' +
        label('rods', 310, 304, 'middle') +
      '</g>' +

      /* 蒸汽发生器 */
      '<g class="part" data-part="sg">' +
        '<rect x="432" y="310" width="76" height="230" rx="10" fill="rgba(56,225,255,0.045)" stroke="#8fb6d9" stroke-width="2.4"/>' +
        '<ellipse cx="470" cy="310" rx="38" ry="13" fill="rgba(56,225,255,0.08)" stroke="#8fb6d9" stroke-width="1.8"/>' +
        '<ellipse cx="470" cy="540" rx="38" ry="13" fill="rgba(56,225,255,0.06)" stroke="rgba(143,182,217,0.7)" stroke-width="1.6"/>' +
        '<g fill="none" stroke="rgba(159,233,255,0.55)" stroke-width="1.3">' +
          '<path d="M 450 392 V 342 A 11 11 0 0 1 472 342 V 392"/>' +
          '<path d="M 460 400 V 330 A 13 13 0 0 1 486 330 V 400"/>' +
          '<path d="M 438 392 V 350 A 10 10 0 0 1 458 350 V 392"/>' +
        '</g>' +
        '<rect x="462" y="286" width="16" height="24" fill="rgba(159,233,255,0.2)" stroke="#9fe9ff" stroke-width="1.4"/>' +
        '<circle cx="508" cy="470" r="5" fill="rgba(159,233,255,0.25)" stroke="#9fe9ff" stroke-width="1.4"/>' +
        label('sg', 470, 568, 'middle') +
      '</g>' +

      /* 主泵 */
      '<g class="part" data-part="pump">' +
        '<circle cx="250" cy="505" r="24" fill="rgba(255,171,61,0.09)" stroke="#ffab3d" stroke-width="2.4"/>' +
        '<circle cx="250" cy="505" r="9" fill="none" stroke="#ffc857" stroke-width="1.6"/>' +
        '<path d="M 250 493 l 6 10 -12 0 z" fill="#ffc857" stroke="none"/>' +
        label('pump', 222, 548, 'end', 'is-loop1') +
      '</g>' +

      /* 稳压器 */
      '<g class="part" data-part="pressurizer">' +
        '<rect x="373" y="250" width="36" height="95" rx="12" fill="rgba(56,225,255,0.05)" stroke="#8fb6d9" stroke-width="2"/>' +
        '<g stroke="#ffc857" stroke-width="1.6" stroke-linecap="round">' +
          '<line x1="380" y1="330" x2="402" y2="330"/><line x1="380" y1="335" x2="402" y2="335"/>' +
        '</g>' +
        label('pressurizer', 391, 240, 'middle', 'is-loop1') +
      '</g>' +

      /* 安全壳 */
      '<g class="part" data-part="containment">' +
        '<path d="M 110 600 L 110 300 A 255 255 0 0 1 620 300 L 620 600" fill="none" stroke="rgba(143,182,217,0.6)" stroke-width="7"/>' +
        '<path d="M 122 600 L 122 302 A 243 243 0 0 1 608 302 L 608 600" fill="none" stroke="rgba(143,182,217,0.26)" stroke-width="2"/>' +
        label('containment', 365, 96, 'middle') +
      '</g>' +

      /* 汽轮机 */
      '<g class="part" data-part="turbine">' +
        '<rect x="700" y="302" width="62" height="56" rx="7" fill="rgba(56,225,255,0.06)" stroke="#9fe9ff" stroke-width="2"/>' +
        '<g stroke="rgba(159,233,255,0.4)" stroke-width="1.2">' +
          '<path d="M 708 312 l 12 36"/><path d="M 722 308 l 14 44"/><path d="M 736 306 l 14 48"/><path d="M 750 306 l 12 48"/>' +
        '</g>' +
        '<rect x="766" y="292" width="86" height="76" rx="9" fill="rgba(56,225,255,0.06)" stroke="#9fe9ff" stroke-width="2"/>' +
        '<g stroke="rgba(159,233,255,0.4)" stroke-width="1.2">' +
          '<path d="M 776 300 l 16 60"/><path d="M 792 296 l 18 64"/><path d="M 810 294 l 18 66"/><path d="M 828 294 l 16 66"/>' +
        '</g>' +
        '<line x1="828" y1="330" x2="852" y2="330" stroke="#9fe9ff" stroke-width="3"/>' +
        label('turbine', 782, 280, 'middle', 'is-loop2') +
      '</g>' +

      /* 发电机 */
      '<g class="part" data-part="generator">' +
        '<rect x="852" y="308" width="88" height="44" rx="22" fill="rgba(62,240,162,0.065)" stroke="#9cf7cd" stroke-width="2"/>' +
        '<g stroke="rgba(156,247,205,0.45)" stroke-width="1.2">' +
          '<line x1="866" y1="316" x2="866" y2="344"/><line x1="880" y1="316" x2="880" y2="344"/>' +
          '<line x1="894" y1="316" x2="894" y2="344"/><line x1="908" y1="316" x2="908" y2="344"/>' +
        '</g>' +
        label('generator', 896, 298, 'middle') +
      '</g>' +

      /* 冷凝器 */
      '<g class="part" data-part="condenser">' +
        '<rect x="752" y="424" width="118" height="72" rx="10" fill="rgba(56,225,255,0.05)" stroke="#9fe9ff" stroke-width="2"/>' +
        '<g stroke="rgba(159,233,255,0.35)" stroke-width="1.2">' +
          '<path d="M 762 448 H 860"/><path d="M 762 462 H 860"/><path d="M 762 476 H 860"/>' +
        '</g>' +
        label('condenser', 811, 516, 'middle', 'is-loop2') +
      '</g>' +

      /* 冷却塔 */
      '<g class="part" data-part="cooling">' +
        '<path d="M 990 588 C 1000 480 1040 460 1050 310 L 1090 310 C 1100 460 1140 480 1150 588 Z" fill="rgba(62,240,162,0.035)" stroke="#9cf7cd" stroke-width="2.2"/>' +
        '<rect x="982" y="578" width="176" height="13" rx="4" fill="rgba(62,240,162,0.07)" stroke="rgba(156,247,205,0.5)" stroke-width="1.4"/>' +
        '<g stroke="rgba(156,247,205,0.25)" stroke-width="1">' +
          '<path d="M 1012 500 H 1128"/><path d="M 1022 440 H 1118"/>' +
        '</g>' +
        label('cooling', 1160, 468, 'start', 'is-loop3') +
      '</g>' +

      /* 主变压器 */
      '<g class="part" data-part="transformer">' +
        '<rect x="945" y="150" width="70" height="58" rx="5" fill="rgba(255,200,87,0.05)" stroke="#ffcf8a" stroke-width="1.8"/>' +
        '<g stroke="rgba(255,207,138,0.5)" stroke-width="1.2">' +
          '<line x1="957" y1="158" x2="957" y2="200"/><line x1="969" y1="158" x2="969" y2="200"/>' +
          '<line x1="981" y1="158" x2="981" y2="200"/><line x1="993" y1="158" x2="993" y2="200"/>' +
        '</g>' +
        '<g stroke="#ffcf8a" stroke-width="1.6"><line x1="975" y1="150" x2="975" y2="141"/><line x1="995" y1="150" x2="995" y2="141"/></g>' +
        label('transformer', 980, 232, 'middle') +
      '</g>' +

      /* ================= 槽位 ================= */
      '<g class="slots">' +
        '<g class="slot-group" data-slot="vessel"><rect class="slot" x="252" y="345" width="116" height="204" rx="14"/>' + label('vessel', 310, 572) + '</g>' +
        '<g class="slot-group" data-slot="fuel"><rect class="slot" x="268" y="401" width="84" height="105" rx="6"/>' + label('fuel', 250, 454, 'end') + '</g>' +
        '<g class="slot-group" data-slot="rods"><rect class="slot" x="278" y="304" width="64" height="148" rx="6"/>' + label('rods', 310, 296) + '</g>' +
        '<g class="slot-group" data-slot="sg"><rect class="slot" x="428" y="298" width="84" height="248" rx="12"/>' + label('sg', 470, 568) + '</g>' +
        '<g class="slot-group" data-slot="pump"><circle class="slot" cx="250" cy="505" r="30"/>' + label('pump', 222, 548, 'end') + '</g>' +
        '<g class="slot-group" data-slot="pressurizer"><rect class="slot" x="369" y="246" width="44" height="103" rx="12"/>' + label('pressurizer', 391, 238) + '</g>' +
        '<g class="slot-group" data-slot="containment"><path class="slot" d="M 110 600 L 110 300 A 255 255 0 0 1 620 300 L 620 600"/>' + label('containment', 365, 96) + '</g>' +
        '<g class="slot-group" data-slot="turbine"><rect class="slot" x="694" y="286" width="164" height="84" rx="10"/>' + label('turbine', 782, 280) + '</g>' +
        '<g class="slot-group" data-slot="generator"><rect class="slot" x="848" y="304" width="96" height="52" rx="22"/>' + label('generator', 896, 298) + '</g>' +
        '<g class="slot-group" data-slot="condenser"><rect class="slot" x="748" y="420" width="126" height="80" rx="10"/>' + label('condenser', 811, 516) + '</g>' +
        '<g class="slot-group" data-slot="cooling"><path class="slot" d="M 990 588 C 1000 480 1040 460 1050 310 L 1090 310 C 1100 460 1140 480 1150 588 Z"/>' + label('cooling', 1160, 468, 'start') + '</g>' +
        '<g class="slot-group" data-slot="transformer"><rect class="slot" x="941" y="146" width="78" height="66" rx="6"/>' + label('transformer', 980, 232) + '</g>' +
      '</g>' +

      /* 分区标注 */
      '<g font-size="10.5" fill="rgba(140,175,210,0.55)" letter-spacing="2">' +
        '<text x="365" y="646" text-anchor="middle">核岛 · NUCLEAR ISLAND</text>' +
        '<text x="800" y="646" text-anchor="middle">常规岛 · TURBINE HALL</text>' +
      '</g>' +
      '<line x1="90" y1="628" x2="640" y2="628" stroke="rgba(120,190,255,0.14)" stroke-width="1"/>' +
      '<line x1="690" y1="628" x2="910" y2="628" stroke="rgba(120,190,255,0.14)" stroke-width="1"/>' +
      '</svg>'
    );
  }

  /* ============================================================
     堆芯剖面（控制台）
     ============================================================ */
  function core() {
    const rods = [];
    for (let i = 0; i < 8; i++) {
      rods.push('<rect class="fuel-rod" x="' + (152 + i * 19) + '" y="128" width="9" height="106" rx="4.5"/>');
    }
    const ctrl = [];
    for (let i = 0; i < 5; i++) {
      ctrl.push('<line x1="' + (170 + i * 30) + '" y1="28" x2="' + (170 + i * 30) + '" y2="190"/>');
    }

    return (
      '<svg class="core-svg" viewBox="0 0 460 330" role="img" aria-label="反应堆堆芯剖面：控制棒插入燃料组件的深度随操作变化。">' +
      '<defs>' +
        '<radialGradient id="pl2-halo"><stop offset="0" stop-color="rgba(56,225,255,0.28)"/><stop offset="1" stop-color="rgba(56,225,255,0)"/></radialGradient>' +
        '<linearGradient id="pl2-vessel" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="rgba(20,44,72,0.9)"/><stop offset="1" stop-color="rgba(8,20,36,0.9)"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<circle class="core-halo" cx="230" cy="180" r="150" fill="url(#pl2-halo)"/>' +
      /* 冷却剂流向 */
      '<g fill="none" stroke="rgba(56,225,255,0.35)" stroke-width="2" stroke-linecap="round">' +
        '<path class="coolant-flow" d="M 96 250 V 120 A 22 22 0 0 1 118 98 H 140"/>' +
        '<path class="coolant-flow" d="M 364 250 V 120 A 22 22 0 0 0 342 98 H 320"/>' +
      '</g>' +
      /* 压力容器 */
      '<path d="M 112 92 A 118 46 0 0 1 348 92 L 348 250 A 118 46 0 0 1 112 250 Z" fill="url(#pl2-vessel)" stroke="#8fb6d9" stroke-width="3"/>' +
      '<path d="M 112 92 A 118 46 0 0 1 348 92" fill="none" stroke="#cfe3ff" stroke-width="3.4"/>' +
      /* 堆芯区 */
      '<rect x="138" y="116" width="184" height="132" rx="8" fill="rgba(4,12,22,0.75)" stroke="rgba(143,182,217,0.4)" stroke-width="1.4"/>' +
      '<g class="rod-bank" id="coreRods">' +
        '<g stroke="#dfeaff" stroke-width="4.5" stroke-linecap="round">' + ctrl.join('') + '</g>' +
        '<rect x="160" y="14" width="140" height="12" rx="3" fill="rgba(120,190,255,0.2)" stroke="#8fb6d9" stroke-width="1.2"/>' +
      '</g>' +
      '<g id="coreFuel" fill="#ffb84d" stroke="rgba(255,224,160,0.5)" stroke-width="0.8">' + rods.join('') + '</g>' +
      /* 标注 */
      '<g font-size="10.5" fill="rgba(150,180,212,0.7)" font-family="PingFang SC, Microsoft YaHei, sans-serif">' +
        '<text x="230" y="318" text-anchor="middle">反应堆压力容器 · 堆芯剖面</text>' +
        '<text x="392" y="108" text-anchor="end" fill="rgba(223,234,255,0.65)">控制棒</text>' +
        '<line x1="344" y1="104" x2="304" y2="104" stroke="rgba(143,182,217,0.35)" stroke-width="0.9"/>' +
        '<text x="104" y="180" text-anchor="end" fill="rgba(56,225,255,0.6)">冷却剂</text>' +
        '<line x1="106" y1="184" x2="120" y2="190" stroke="rgba(56,225,255,0.3)" stroke-width="0.9"/>' +
      '</g>' +
      '</svg>'
    );
  }

  NEG.svg = { plant, core };
})(window.NEG);
