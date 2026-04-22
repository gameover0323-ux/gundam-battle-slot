export function showPopup(text) {
  const popup = document.getElementById("popup");
  popup.innerHTML = `
    ${text}
    <br><br>
    <button id="closePopupBtn">閉じる</button>
  `;
  popup.style.display = "block";

  document.getElementById("closePopupBtn").addEventListener("click", () => {
    popup.style.display = "none";
  });
}

export function renderSlots(slots, slotOrder, container, onSlotClick) {
  container.innerHTML = "";

  const safeSlotOrder = Array.isArray(slotOrder) ? slotOrder : [];

  safeSlotOrder.forEach((slotKey, index) => {
    const slot = slots[slotKey];
    if (!slot) return;

    const div = document.createElement("div");
    if (slot.gold) {
      div.className = "slot goldSlot";
    } else {
      div.className = slot.ex ? "slot exSlot" : "slot";
    }

    div.innerHTML = `
      <span style="color:gray;font-size:10px;">${index + 1}</span>
      ${slot.label}
    `;

    div.addEventListener("click", () => {
      onSlotClick(slot);
    });

    container.appendChild(div);
  });
}

export function renderSpecialsStateToArea(state, area, handlers) {
  area.innerHTML = "";

  state.specialOrder.forEach((specialKey) => {
    const sp = state.specials[specialKey];

    const div = document.createElement("div");
    div.className = "special";

    let title = sp.name;
    if (sp.effectType === "shield") {
      title += ` (残り:${state.shieldCount})`;
      if (state.shieldActive) {
        title += " [展開中]";
      }
    }

    const canExecute = handlers.canExecuteSpecial
      ? handlers.canExecuteSpecial(sp, specialKey)
      : false;

    let execButtonHtml = "";
    if (sp.actionType !== "auto" && canExecute) {
      execButtonHtml = `<button class="specialExecBtn">実行</button>`;
    }

    div.innerHTML = `
      <div>${title}</div>
      <button class="specialDescBtn">説明</button>
      ${execButtonHtml}
    `;

    const descBtn = div.querySelector(".specialDescBtn");
    if (descBtn) {
      descBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.onSpecialDesc(sp);
      });
    }

    const execBtn = div.querySelector(".specialExecBtn");
    if (execBtn) {
      execBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.onSpecialExec(specialKey);
      });
    }

    area.appendChild(div);
  });
}

export function renderPlayerState(state, container, label, handlers) {
  const confuseText =
    state.isConfusedTurn && state.confuseHits > 0
      ? `<div>攻撃無効蓄積:${state.confuseHits}</div>`
      : "";

  const nameStyle =
    state.formId === "bio"
      ? 'style="color:#bb66ff;font-weight:bold;"'
      : "";

  const statusHtml =
    Array.isArray(state.statusList) && state.statusList.length > 0
      ? `
        <div style="margin-top:6px;">
          ${state.statusList.map((text) => `<div style="color:#d9b3ff;">${text}</div>`).join("")}
        </div>
      `
      : "";

  const evadeHtml = state.overEvadeMode
    ? `<div style="color:#ff4d4d;font-weight:bold;">回避:${state.evade}/${state.overEvadeCap}<span style="color:white;font-weight:normal;">(${state.evadeMax})</span></div>`
    : `<div>回避:${state.evade}/${state.evadeMax}</div>`;

  container.innerHTML = `
    <h3>${label}</h3>
    <div ${nameStyle}><b>${state.name}</b></div>
    <div>HP:${state.hp}/${state.maxHp}</div>
    <div class="hpbar">
      <div class="hpfill" style="width:${Math.max(0, state.hp / state.maxHp * 100)}%"></div>
    </div>
    ${evadeHtml}
    ${statusHtml}
    ${confuseText}
    <br>
    <b>スロット</b>
    <div class="slotArea"></div>
    <br>
    <b>特殊行動</b>
    <div class="specialArea"></div>
  `;

  const slotArea = container.querySelector(".slotArea");
  const specialArea = container.querySelector(".specialArea");

  renderSlots(state.slots, state.rollableSlotOrder, slotArea, handlers.onSlotClick);
  renderSpecialsStateToArea(state, specialArea, {
    onSpecialDesc: handlers.onSpecialDesc,
    onSpecialExec: handlers.onSpecialExec,
    canExecuteSpecial: handlers.canExecuteSpecial
  });
}

function buildAttackTags(attack) {
  const tags = [];

  const renderTag = (text, isAdded = false) => {
    if (isAdded) {
      return `<span style="color:#ffd966;font-weight:bold;">${text}</span>`;
    }
    return `<span>${text}</span>`;
  };

  if (attack.type === "shoot") tags.push(renderTag("[射]"));
  if (attack.type === "melee") tags.push(renderTag("[格]"));

  if (attack.cannotEvade) {
    tags.push(renderTag("[必]", !!attack.addedCannotEvade));
  }

  if (attack.ignoreReduction) {
    tags.push(renderTag("[不]", !!attack.addedIgnoreReduction));
  }

  if (attack.beam) {
    tags.push(renderTag("[ビ]", !!attack.addedBeam));
  }

  return tags.join("");
}

export function renderPendingChoiceUI({
  title,
  choices,
  onChoose
}) {
  const attackLog = document.getElementById("attackLog");
  attackLog.innerHTML = "";

  const titleDiv = document.createElement("div");
  titleDiv.style.fontWeight = "bold";
  titleDiv.style.marginBottom = "6px";
  titleDiv.t    });

    container.appendChild(div);
  });
}

export function renderSpecialsStateToArea(state, area, handlers) {
  area.innerHTML = "";

  state.specialOrder.forEach((specialKey) => {
    const sp = state.specials[specialKey];

    const div = document.createElement("div");
    div.className = "special";

    let title = sp.name;
    if (sp.effectType === "shield") {
      title += ` (残り:${state.shieldCount})`;
      if (state.shieldActive) {
        title += " [展開中]";
      }
    }

    const canExecute = handlers.canExecuteSpecial
      ? handlers.canExecuteSpecial(sp, specialKey)
      : false;

    let execButtonHtml = "";
    if (sp.actionType !== "auto" && canExecute) {
      execButtonHtml = `<button class="specialExecBtn">実行</button>`;
    }

    div.innerHTML = `
      <div>${title}</div>
      <button class="specialDescBtn">説明</button>
      ${execButtonHtml}
    `;

    const descBtn = div.querySelector(".specialDescBtn");
    if (descBtn) {
      descBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.onSpecialDesc(sp);
      });
    }

    const execBtn = div.querySelector(".specialExecBtn");
    if (execBtn) {
      execBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.onSpecialExec(specialKey);
      });
    }

    area.appendChild(div);
  });
}

export function renderPlayerState(state, container, label, handlers) {
  const confuseText =
    state.isConfusedTurn && state.confuseHits > 0
      ? `<div>攻撃無効蓄積:${state.confuseHits}</div>`
      : "";

  const nameStyle =
    state.formId === "bio"
      ? 'style="color:#bb66ff;font-weight:bold;"'
      : "";

  const statusHtml =
    Array.isArray(state.statusList) && state.statusList.length > 0
      ? `
        <div style="margin-top:6px;">
          ${state.statusList.map((text) => `<div style="color:#d9b3ff;">${text}</div>`).join("")}
        </div>
      `
      : "";

  const evadeHtml = state.overEvadeMode
    ? `<div style="color:#ff4d4d;font-weight:bold;">回避:${state.evade}/${state.overEvadeCap}<span style="color:white;font-weight:normal;">(${state.evadeMax})</span></div>`
    : `<div>回避:${state.evade}/${state.evadeMax}</div>`;

  container.innerHTML = `
    <h3>${label}</h3>
    <div ${nameStyle}><b>${state.name}</b></div>
    <div>HP:${state.hp}/${state.maxHp}</div>
    <div class="hpbar">
      <div class="hpfill" style="width:${Math.max(0, state.hp / state.maxHp * 100)}%"></div>
    </div>
    ${evadeHtml}
    ${statusHtml}
    ${confuseText}
    <br>
    <b>スロット</b>
    <div class="slotArea"></div>
    <br>
    <b>特殊行動</b>
    <div class="specialArea"></div>
  `;

  const slotArea = container.querySelector(".slotArea");
  const specialArea = container.querySelector(".specialArea");

  renderSlots(state.slots, state.rollableSlotOrder, slotArea, handlers.onSlotClick);
  renderSpecialsStateToArea(state, specialArea, {
    onSpecialDesc: handlers.onSpecialDesc,
    onSpecialExec: handlers.onSpecialExec,
    canExecuteSpecial: handlers.canExecuteSpecial
  });
}

function buildAttackTags(attack) {
  const tags = [];

  const renderTag = (text, isAdded = false) => {
    if (isAdded) {
      return `<span style="color:#ffd966;font-weight:bold;">${text}</span>`;
    }
    return `<span>${text}</span>`;
  };

  if (attack.type === "shoot") tags.push(renderTag("[射]"));
  if (attack.type === "melee") tags.push(renderTag("[格]"));

  if (attack.cannotEvade) {
    tags.push(renderTag("[必]", !!attack.addedCannotEvade));
  }

  if (attack.ignoreReduction) {
    tags.push(renderTag("[不]", !!attack.addedIgnoreReduction));
  }

  if (attack.beam) {
    tags.push(renderTag("[ビ]", !!attack.addedBeam));
  }

  return tags.join("");
}

export function renderPendingChoiceUI({
  title,
  choices,
  onChoose
}) {
  const attackLog = document.getElementById("attackLog");
  attackLog.innerHTML = "";

  const titleDiv = document.createElement("div");
  titleDiv.style.fontWeight = "bold";
  titleDiv.style.marginBottom = "6px";
  titleDiv.textContent = titl}

export function renderSpecialsStateToArea(state, area, handlers) {
  area.innerHTML = "";

  state.specialOrder.forEach((specialKey) => {
    const sp = state.specials[specialKey];

    const div = document.createElement("div");
    div.className = "special";

    let title = sp.name;
    if (sp.effectType === "shield") {
      title += ` (残り:${state.shieldCount})`;
      if (state.shieldActive) {
        title += " [展開中]";
      }
    }

    const canExecute = handlers.canExecuteSpecial
      ? handlers.canExecuteSpecial(sp, specialKey)
      : false;

    let execButtonHtml = "";
    if (sp.actionType !== "auto" && canExecute) {
      execButtonHtml = `<button class="specialExecBtn">実行</button>`;
    }

    div.innerHTML = `
      <div>${title}</div>
      <button class="specialDescBtn">説明</button>
      ${execButtonHtml}
    `;

    const descBtn = div.querySelector(".specialDescBtn");
    if (descBtn) {
      descBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.onSpecialDesc(sp);
      });
    }

    const execBtn = div.querySelector(".specialExecBtn");
    if (execBtn) {
      execBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.onSpecialExec(specialKey);
      });
    }

    area.appendChild(div);
  });
}

export function renderPlayerState(state, container, label, handlers) {
  const confuseText =
    state.isConfusedTurn && state.confuseHits > 0
      ? `<div>攻撃無効蓄積:${state.confuseHits}</div>`
      : "";

  const nameStyle =
    state.formId === "bio"
      ? 'style="color:#bb66ff;font-weight:bold;"'
      : "";

  const statusHtml =
    Array.isArray(state.statusList) && state.statusList.length > 0
      ? `
        <div style="margin-top:6px;">
          ${state.statusList.map((text) => `<div style="color:#d9b3ff;">${text}</div>`).join("")}
        </div>
      `
      : "";

  const evadeHtml = state.overEvadeMode
    ? `<div style="color:#ff4d4d;font-weight:bold;">回避:${state.evade}/${state.overEvadeCap}<span style="color:white;font-weight:normal;">(${state.evadeMax})</span></div>`
    : `<div>回避:${state.evade}/${state.evadeMax}</div>`;

  container.innerHTML = `
    <h3>${label}</h3>
    <div ${nameStyle}><b>${state.name}</b></div>
    <div>HP:${state.hp}/${state.maxHp}</div>
    <div class="hpbar">
      <div class="hpfill" style="width:${Math.max(0, state.hp / state.maxHp * 100)}%"></div>
    </div>
    ${evadeHtml}
    ${statusHtml}
    ${confuseText}
    <br>
    <b>スロット</b>
    <div class="slotArea"></div>
    <br>
    <b>特殊行動</b>
    <div class="specialArea"></div>
  `;

  const slotArea = container.querySelector(".slotArea");
  const specialArea = container.querySelector(".specialArea");

  renderSlots(state.slots, state.rollableSlotOrder, slotArea, handlers.onSlotClick);
  renderSpecialsStateToArea(state, specialArea, {
    onSpecialDesc: handlers.onSpecialDesc,
    onSpecialExec: handlers.onSpecialExec,
    canExecuteSpecial: handlers.canExecuteSpecial
  });
}

function buildAttackTags(attack) {
  const tags = [];

  const renderTag = (text, isAdded = false) => {
    if (isAdded) {
      return `<span style="color:#ffd966;font-weight:bold;">${text}</span>`;
    }
    return `<span>${text}</span>`;
  };

  if (attack.type === "shoot") tags.push(renderTag("[射]"));
  if (attack.type === "melee") tags.push(renderTag("[格]"));

  if (attack.cannotEvade) {
    tags.push(renderTag("[必]", !!attack.addedCannotEvade));
  }

  if (attack.ignoreReduction) {
    tags.push(renderTag("[不]", !!attack.addedIgnoreReduction));
  }

  if (attack.beam) {
    tags.push(renderTag("[ビ]", !!attack.addedBeam));
  }

  return tags.join("");
}

export function renderPendingChoiceUI({
  title,
  choices,
  onChoose
}) {
  const attackLog = document.getElementById("attackLog");
  attackLog.innerHTML = "";

  const titleDiv = document.createElement("div");
  titleDiv.style.fontWeight = "bold";
  titleDiv.style.marginBottom = "6px";
  titleDiv.textContent = title;
  attackLog.appendChild(titleDiv);

  const wrap = document.createElement("div");

  choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.textContent = choice.label;
    btn.addEventListener("click", () => {
      onChoose(choice.value);
    });
    wrap.appendChild(btn);
  });

  attackLog.appendChild(wrap);
}

export function renderAttackChoicesUI({
  currentAttack,
  battleNotice,
  currentActionHeader,
  currentActionLabel,
  onHit,
  onEvade
}) {
  const attackLog = document.getElementById("attackLog");
  attackLog.innerHTML = "";

  if (battleNotice) {
    const notice = document.createElement("div");
    notice.style.color = "#ff6666";
    notice.style.fontWeight = "bold";
    notice.style.marginBottom = "4px";
    notice.innerHTML = battleNotice;
    attackLog.appendChild(notice);
  }

  if (currentActionHeader) {
    const header = document.createElement("div");
    header.style.fontWeight = "bold";
    header.textContent = currentActionHeader;
    attackLog.appendChild(header);
  }

  if (currentActionLabel) {
    const label = document.createElement("div");
    label.style.marginBottom = "4px";
    label.textContent = currentActionLabel;
    attackLog.appendChild(label);
  }

  currentAttack.forEach((attack, index) => {
    const row = document.createElement("div");
    const tags = buildAttackTags(attack);

    row.innerHTML = `
      ${index + 1}発目：${attack.damage}ダメージ ${tags}
      <button class="hitBtn">被弾</button>
      <button class="evadeBtn">回避</button>
    `;

    const hitBtn = row.querySelector(".hitBtn");
    if (hitBtn) {
      hitBtn.addEventListener("click", () => {
        onHit(index);
      });
    }

    const evadeBtn = row.querySelector(".evadeBtn");
    if (evadeBtn) {
      evadeBtn.addEventListener("click", () => {
        onEvade(index);
      });
    }

    attackLog.appendChild(row);
  });

  if (currentAttack.length === 0 && !battleNotice && !currentActionHeader && !currentActionLabel) {
    attackLog.textContent = "攻撃解決済み";
  }
}
