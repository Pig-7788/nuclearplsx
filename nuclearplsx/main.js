// ==================== 音效引擎 (Web Audio API) ====================
const SoundEngine = (() => {
  let ctx = null;

  function init() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // 短促点击音
  function playClick() {
    const c = init();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // 成功音 (上升三连音)
  function playSuccess() {
    const c = init();
    const now = c.currentTime;
    [0, 0.12, 0.24].forEach((delay, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      const freq = [523, 659, 784][i]; // C5, E5, G5
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);
      osc.connect(gain).connect(c.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.25);
    });
  }

  // 失败音 (下降嗡嗡声)
  function playFail() {
    const c = init();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.35);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  // 完成/庆祝音
  function playFanfare() {
    const c = init();
    const now = c.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.15;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
      gain.gain.setValueAtTime(0.2, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  }

  // 拖拽放下音
  function playDrop() {
    const c = init();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  return { playClick, playSuccess, playFail, playFanfare, playDrop };
})();

// ==================== 游戏状态 ====================
let currentMode = null;
let currentRumorIndex = 0;
let score = 0;

const randomComments = [
  "这条消息是真的吗？我有点怀疑……",
  "我觉得应该查证一下，不要轻信网络传言。",
  "我邻居也说过类似的，但我感觉不太靠谱。",
  "这听起来有点夸张吧？",
  "有没有官方来源？我想看看。",
  "别吓人了，这种说法我以前没听过。",
  "感觉像是有人故意带节奏。",
  "我觉得应该科学一点，不要乱传。",
  "这条消息我在别的地方也看到过，但说法不一样。",
  "建议大家冷静，不要被带偏。"
];

const cityCards = [
  { id: 1, name: "压力容器", structure: "pressure", info: "压力容器用于容纳堆芯并维持高压环境。" },
  { id: 2, name: "一回路", structure: "loop1", info: "一回路将热量从堆芯带到蒸汽发生器。" },
  { id: 3, name: "二回路", structure: "loop2", info: "二回路通过蒸汽驱动汽轮机发电。" },
  { id: 4, name: "三回路", structure: "loop3", info: "三回路负责冷却冷凝器，维持循环效率。" },
  { id: 5, name: "安全壳", structure: "containment", info: "安全壳用于隔离放射性物质，确保安全。" }
];

const fakeNames = [
  "辅助泵站",
  "冷却塔外管道",
  "化学加药系统",
  "通风过滤单元",
  "不明设备",
  "辅助换热器",
  "施工队的午饭"
];

// ==================== 界面流转 ====================
function crossfade(hideEl, showEl, displayType, callback) {
  hideEl.style.transition = "opacity 0.2s ease-out, transform 0.2s ease-out";
  hideEl.style.opacity = "0";
  hideEl.style.transform = "translateY(8px)";
  setTimeout(() => {
    hideEl.style.display = "none";
    hideEl.style.transition = "";
    hideEl.style.opacity = "";
    hideEl.style.transform = "";
    showEl.style.display = displayType || "flex";
    showEl.style.opacity = "0";
    showEl.style.transform = "translateY(8px)";
    requestAnimationFrame(() => {
      showEl.style.transition = "opacity 0.35s ease-out, transform 0.35s ease-out";
      showEl.style.opacity = "1";
      showEl.style.transform = "translateY(0)";
    });
    if (callback) setTimeout(callback, 50);
  }, 200);
}

function startGame() {
  SoundEngine.playClick();
  crossfade(
    document.getElementById("welcome"),
    document.getElementById("modeSelect"),
    "flex"
  );
}

function enterMode(mode) {
  SoundEngine.playClick();
  currentMode = mode;
  crossfade(
    document.getElementById("modeSelect"),
    document.getElementById("gameUI"),
    "flex",
    () => { updateTopBar(); loadMode(); }
  );
}

function switchMode() {
  SoundEngine.playClick();
  currentMode = currentMode === "rumor" ? "city" : "rumor";
  cityProgress = 0; // 切换模式时重置进度

  const mainArea = document.getElementById("mainArea");
  const cardArea = document.getElementById("cardArea");

  mainArea.style.transition = "opacity 0.15s ease-out, transform 0.15s ease-out";
  cardArea.style.transition = "opacity 0.15s ease-out, transform 0.15s ease-out";
  mainArea.style.opacity = "0";
  mainArea.style.transform = "translateY(8px)";
  cardArea.style.opacity = "0";
  cardArea.style.transform = "translateY(8px)";

  setTimeout(() => {
    loadMode();
    requestAnimationFrame(() => {
      mainArea.style.transition = "opacity 0.3s ease-out, transform 0.3s ease-out";
      cardArea.style.transition = "opacity 0.3s ease-out, transform 0.3s ease-out";
      mainArea.style.opacity = "1";
      mainArea.style.transform = "";
      cardArea.style.opacity = "1";
      cardArea.style.transform = "";
    });
  }, 150);
  updateTopBar();
}

function updateTopBar() {
  const scoreText = document.getElementById("scoreText");
  if (scoreText) {
    scoreText.textContent = `⚡ 分数：${score}`;
  }

  // 更新切换按钮图标
  const switchBtn = document.getElementById("switchModeBtn");
  if (switchBtn) {
    if (currentMode === "rumor") {
      switchBtn.innerHTML = "🏗️ 切换至市长模式";
    } else {
      switchBtn.innerHTML = "🔍 切换至打假模式";
    }
  }
}

// ==================== 加载模式 ====================
function loadMode() {
  const mainArea = document.getElementById("mainArea");
  const cardArea = document.getElementById("cardArea");
  cardArea.innerHTML = "";

  if (currentMode === "rumor") {
    mainArea.classList.remove("city-mode");

    const rumor = rumors[currentRumorIndex];

    mainArea.innerHTML = `
      <div class="rumor-post">
        <div class="rumor-avatar">👤</div>
        <div class="rumor-text">${rumor.text}</div>
      </div>
    `;

    let commentPool = [...randomComments];

    for (let i = 0; i < 3; i++) {
      const index = Math.floor(Math.random() * commentPool.length);
      const commentText = commentPool.splice(index, 1)[0];

      const commentDiv = document.createElement("div");
      commentDiv.className = "rumor-post";

      commentDiv.innerHTML = `
        <div class="rumor-avatar">👤</div>
        <div class="rumor-text">${commentText}</div>
      `;

      commentDiv.style.animation = `fadeInDelayed 0.35s ease-out ${i * 0.15}s forwards`;
      commentDiv.style.opacity = "0";

      mainArea.appendChild(commentDiv);
    }

    const correctCard = {
      id: rumor.id,
      text: rumor.card,
      knowledge: rumor.knowledge,
      correct: true
    };

    let wrongIndex;
    do {
      wrongIndex = Math.floor(Math.random() * rumors.length);
    } while (wrongIndex === currentRumorIndex);

    const wrongRumor = rumors[wrongIndex];
    const wrongCard = {
      id: wrongRumor.id,
      text: wrongRumor.card,
      knowledge: wrongRumor.knowledge,
      correct: false
    };

    const cards = [correctCard, wrongCard].sort(() => Math.random() - 0.5);

    cards.forEach((c, i) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerText = c.text;
      card.draggable = true;
      card.style.opacity = "0";
      card.style.animation = `fadeInUp 0.35s ease-out ${i * 0.1}s both`;

      card.ondragstart = () => {
        card.style.opacity = "0.6";
      };

      card.ondragend = () => {
        card.style.opacity = "1";
        card.style.animation = "";
        SoundEngine.playDrop();
        if (c.correct) {
          score += 10;
          showPopup("✅ 打假成功！\n\n" + c.knowledge, "success");
          SoundEngine.playSuccess();
        } else {
          score -= 5;
          showPopup("❌ 打假失败！\n\n" + c.knowledge, "error");
          SoundEngine.playFail();
        }
        updateTopBar();
      };

      cardArea.appendChild(card);
    });

  } else {
    // ===== 市长模式 =====
    mainArea.classList.add("city-mode");
    mainArea.innerHTML = `
      <h3>🏭 核电站建设视图</h3>
      <div id="reactorDisplay">
        <div id="reactorInner"></div>
      </div>
      <div class="build-progress">
        建设进度：<span id="buildCount">0</span> / 5
      </div>
    `;

    const inner = document.getElementById("reactorInner");

    cityStructures.forEach(s => {
      const img = document.createElement("img");
      img.src = s.img;
      img.className = "structure-img inactive";
      img.id = "img-" + s.name;

      img.style.left = s.x + "px";
      img.style.top = s.y + "px";
      img.style.zIndex = s.z;
      img.style.width = s.w + "px";

      inner.appendChild(img);
    });

    // ===== 市长模式卡牌生成 =====
    let deck = [];

    cityCards.forEach(c => deck.push({ ...c, correct: true }));

    for (let i = 0; i < 7; i++) {
      const name = fakeNames[i];
      deck.push({
        id: 0,
        name: name,
        structure: null,
        info: "这不是核电站的主要结构。",
        correct: false
      });
    }

    deck.sort(() => Math.random() - 0.5);

    deck.forEach((c, i) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerText = c.name;
      card.draggable = true;
      card.style.opacity = "0";
      card.style.animation = `fadeInUp 0.35s ease-out ${i * 0.05}s both`;

      card.ondragstart = () => {
        card.style.opacity = "0.6";
      };

      card.ondragend = () => {
        card.style.opacity = "1";
        card.style.animation = "";
        SoundEngine.playDrop();
        handleCityCardDrop(c, card);
      };

      cardArea.appendChild(card);
    });
  }
}

// ==================== 弹框 ====================
function showPopup(text, type) {
  const popup = document.getElementById("popup");
  const content = document.getElementById("popupContent");

  content.innerText = text;

  // 设置弹框类型样式
  popup.classList.remove("success", "error", "complete");
  if (type) {
    popup.classList.add(type);
  }

  // 使用 transition（始终保持 translate(-50%,-50%) 居中，不会偏移）
  popup.style.display = "block";
  popup.style.transition = "none";
  popup.style.opacity = "0";
  popup.style.transform = "translate(-50%, -50%) scale(0.85)";
  popup.offsetHeight; // 强制 reflow
  popup.style.transition =
    "opacity 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)";
  popup.style.opacity = "1";
  popup.style.transform = "translate(-50%, -50%) scale(1)";
}

function hidePopup(callback) {
  const popup = document.getElementById("popup");
  // 始终保留 translate(-50%,-50%) 居中
  popup.style.transition = "opacity 0.18s ease-out, transform 0.18s ease-out";
  popup.style.opacity = "0";
  popup.style.transform = "translate(-50%, -50%) scale(0.9)";
  setTimeout(() => {
    popup.style.display = "none";
    popup.style.transition = "";
    popup.style.opacity = "";
    popup.style.transform = "";
    if (callback) callback();
  }, 180);
}

function nextLevel() {
  SoundEngine.playClick();
  hidePopup(() => {
    if (currentMode === "rumor") {
      currentRumorIndex++;
      if (currentRumorIndex >= rumors.length) {
        SoundEngine.playFanfare();
        showPopup(`🏆 打假模式全部通关！\n\n最终分数：${score}`, "complete");
        currentRumorIndex = 0;
        score = 0;
        updateTopBar();
        return;
      }
      loadMode();
    }
  });
}

// ==================== 市长模式拖拽逻辑 ====================
let cityProgress = 0;

function handleCityCardDrop(cardData, cardElement) {
  // 干扰卡：扣 10 分
  if (!cardData.correct) {
    score = Math.max(0, score - 10);
    updateTopBar();
    showPopup("❌ 错误：这不是核电站主要结构。\n\n" + cardData.info + "\n\n⚡ -10 分", "error");
    SoundEngine.playFail();
    return;
  }

  // 顺序不对：扣 10 分
  if (cardData.id !== cityProgress + 1) {
    score = Math.max(0, score - 10);
    updateTopBar();
    const need = cityCards[cityProgress].name;
    showPopup("❌ 顺序错误，请先建设：\n" + need + "\n\n⚡ -10 分", "error");
    SoundEngine.playFail();
    return;
  }

  // 正确：加 10 分
  cityProgress++;
  score += 10;
  updateTopBar();
  SoundEngine.playSuccess();

  // 更新进度显示
  const buildCount = document.getElementById("buildCount");
  if (buildCount) {
    buildCount.textContent = cityProgress;
  }

  // 点亮图片（带过渡动画）
  const img = document.getElementById("img-" + cardData.structure);
  if (img) {
    img.classList.remove("inactive");
    // 点亮闪烁效果
    img.style.filter = "drop-shadow(0 0 12px rgba(57, 255, 20, 0.8))";
    setTimeout(() => {
      img.style.filter = "drop-shadow(0 0 8px rgba(57, 255, 20, 0.5))";
    }, 500);
  }

  // 弹出功能介绍
  showPopup("✅ 建设成功：" + cardData.name + "\n\n" + cardData.info + "\n\n⚡ +10 分", "success");

  // 移除卡牌（带消失动画）
  cardElement.style.transition = "all 0.3s ease-out";
  cardElement.style.transform = "scale(0.5)";
  cardElement.style.opacity = "0";
  setTimeout(() => cardElement.remove(), 300);

  // 全部完成
  if (cityProgress === 5) {
    SoundEngine.playFanfare();
    setTimeout(() => {
      showPopup("🎉 恭喜！核电站全部建设完成！\n\n你已了解核电站的五大核心结构。", "complete");
      // 重置进度以便重新游玩
      cityProgress = 0;
      const bc = document.getElementById("buildCount");
      if (bc) bc.textContent = "0";

      // 重新加载以显示完整结构图
      setTimeout(() => {
        loadMode();
      }, 2000);
    }, 600);
  }
}
