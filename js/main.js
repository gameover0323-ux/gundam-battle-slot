import { unitList } from "./units/js_units_index.js";
import {
  createBattleState,
  applyUnitDerivedState,
  getSlotByKey,
  getRandomSlotKey,
  getPredictableSlotKeys,
  getSlotNumberFromKey,
  getRollableSlotKeys,
  executeUnitSpecial,
  executeUnitCanUseSpecial,
  executeUnitResolveChoice,
  executeUnitTurnEnd,
  executeUnitBeforeSlot,
  executeUnitEnemyBeforeSlot,
  executeUnitAfterSlotResolved,
  executeUnitActionResolved,
  executeUnitOnDamaged,
  executeUnitModifyTakenDamage,
  executeUnitModifyEvadeAttempt
} from "./js_unit_runtime.js";
import {
  takeHit as resolveTakeHit,
  evadeAttack as resolveEvadeAttack
} from "./js_battle_system.js";
import { resolveSlotEffect } from "./js_slot_effects.js";
import { executeCommonSpecial } from "./js_special_actions.js";
import {
  showPopup,
  renderPlayerState,
  renderAttackChoicesUI,
  renderPendingChoiceUI
} from "./ui/ui.js";

const screens = {
  title: document.getElementById("title"),
  select: document.getElementById("select"),
  battle: document.getElementById("battle")
};

function showScreen(screenId) {
  Object.values(screens).forEach(screen => {
    screen.classList.remove("active");
  });

  screens[screenId].classList.add("active");
}

document.getElementById("start1v1Btn").addEventListener("click", () => {
  showScreen("select");
});

document.getElementById("start2v2Btn").addEventListener("click", () => {
  alert("2on2は準備中です");
});

const units = unitList;

const unitButtons = document.getElementById("unitButtons");
const playerABox = document.getElementById("playerA");
const playerBBox = document.getElementById("playerB");
const selectGuide = document.getElementById("selectGuide");
const selectedUnitsPreview = document.getElementById("selectedUnitsPreview");

let selectingPlayer = "A";
let selectedUnitA = null;
let selectedUnitB = null;

let currentTurn = 1;
let currentPlayer = "A";

let playerAState = null;
let playerBState = null;

let currentAttack = [];
let currentAttackContext = null;

let battleNotice = "";
let currentActionHeader = "";
let currentActionLabel = "";
let pendingChoice = null;

function getPlayerState(playerKey) {
  return playerKey === "A" ? playerAState : playerBState;
}

function getOpponentPlayer(playerKey) {
  return playerKey === "A" ? "B" : "A";
}

function setBattleNotice(text) {
  battleNotice = text || "";
}

function clearBattleNotice() {
  battleNotice = "";
}

function appendBattleNotice(text) {
  if (!text) return;

  if (!battleNotice) {
    battleNotice = text;
    return;
  }

  battleNotice += `<br>${text}`;
}

function setCurrentAction(header, label) {
  currentActionHeader = header || "";
  currentActionLabel = label || "";
}

function clearCurrentAction() {
  currentActionHeader = "";
  currentActionLabel = "";
  currentAttackContext = null;
}
function clearPendingChoice() {
  pendingChoice = null;
}

function startSlotAction(ownerPlayer, slotKey, slotOverride = null) {
  const enemyPlayer = getOpponentPlayer(ownerPlayer);

  const actor = getPlayerState(ownerPlayer);
  const defender = getPlayerState(enemyPlayer);

  if (!actor) return false;

  const slot = slotOverride || getSlotByKey(actor, slotKey);
  if (!slot) return false;

  const slotNumber = getSlotNumberFromKey(slotKey);

  actor.lastSlotKey = slotKey;

  const beforeResult = executeUnitBeforeSlot(actor, slotNumber, {
    ownerPlayer,
    enemyPlayer,
    enemyPlayerLabel: `PLAYER ${enemyPlayer}`,
    enemyState: defender
  });

  if (beforeResult.redraw) {
    redrawBattleBoards();
  }
  if (beforeResult.message) {
    appendBattleNotice(beforeResult.message);
  }

  if (defender) {
    const enemyBeforeResult = executeUnitEnemyBeforeSlot(defender, slotNumber, {
      ownerPlayer: enemyPlayer,
      enemyPlayer: ownerPlayer,
      enemyPlayerLabel: `PLAYER ${ownerPlayer}`,
      enemyRolledSlotKey: slotKey,
      enemyState: actor
    });

    if (enemyBeforeResult.redraw) {
      redrawBattleBoards();
    }
    if (enemyBeforeResult.message) {
      appendBattleNotice(enemyBeforeResult.message);
    }
  }

  setCurrentAction(
    `PLAYER ${ownerPlayer} の行動`,
    `${slotNumber}. ${slot.label}`
  );

  redrawBattleBoards();

  resolveSlot(slot, {
    ownerPlayer,
    enemyPlayer,
    slotKey,
    slotNumber
  });

  return true;
}

function canExecuteSpecialForPlayer(playerKey, special) {
  if (!special || special.actionType === "auto") {
    return false;
  }

  if (pendingChoice) {
    return false;
  }

  const timing = special.timing || "self";

  let timingAllowed = false;

  if (timing === "self") {
    timingAllowed = playerKey === currentPlayer && currentAttack.length === 0;
  } else if (timing === "reaction") {
    timingAllowed = playerKey !== currentPlayer && currentAttack.length > 0;
  } else if (timing === "attack") {
    timingAllowed = playerKey === currentPlayer && currentAttack.length > 0;
  }

  if (!timingAllowed) {
    return false;
  }

  const actor = getPlayerState(playerKey);
  if (!actor) return false;

  const availability = executeUnitCanUseSpecial(actor, special.key, {
    ownerPlayer: playerKey,
    enemyPlayer: getOpponentPlayer(playerKey),
    currentAttackContext,
    currentAttack
  });

  return availability.allowed !== false;
}

function renderAttackLogText(message) {
  const attackLog = document.getElementById("attackLog");
  attackLog.innerHTML = "";

  if (battleNotice) {
    attackLog.innerHTML += `
      <div style="color:#ff6666;font-weight:bold;margin-bottom:4px;">
        ${battleNotice}
      </div>
    `;
    clearBattleNotice();
  }

  if (currentActionHeader) {
    attackLog.innerHTML += `
      <div style="font-weight:bold;">${currentActionHeader}</div>
    `;
  }

  if (currentActionLabel) {
    attackLog.innerHTML += `
      <div style="margin-bottom:4px;">${currentActionLabel}</div>
    `;
  }

  attackLog.innerHTML += `<div>${message}</div>`;
}

function renderPendingChoice() {
  if (!pendingChoice) return;

  const choices =
    Array.isArray(pendingChoice.choices) && pendingChoice.choices.length > 0
      ? pendingChoice.choices
      : (pendingChoice.slotKeys || []).map((slotKey) => ({
          label: String(getSlotNumberFromKey(slotKey)),
          value: slotKey
        }));

  renderPendingChoiceUI({
    title: pendingChoice.title,
    choices,
    onChoose: (value) => resolvePendingChoice(value)
  });
}

function loadUnitButtons() {
  unitButtons.innerHTML = "";

  units.forEach(unit => {
    const btn = document.createElement("button");
    btn.textContent = unit.name;

    btn.addEventListener("click", () => {
      selectUnit(unit);
    });

    unitButtons.appendChild(btn);
  });

  updateSelectUi();
}

function updateSelectUi() {
  if (selectGuide) {
    selectGuide.textContent =
      selectingPlayer === "A"
        ? "PLAYER A の機体を選択"
        : "PLAYER B の機体を選択";
  }

  if (selectedUnitsPreview) {
    const aText = selectedUnitA ? `PLAYER A: ${selectedUnitA.name}` : "PLAYER A: 未選択";
    const bText = selectedUnitB ? `PLAYER B: ${selectedUnitB.name}` : "PLAYER B: 未選択";
    selectedUnitsPreview.innerHTML = `${aText}<br>${bText}`;
  }
}

function selectUnit(unit) {
  if (selectingPlayer === "A") {
    selectedUnitA = unit;
    selectingPlayer = "B";
    updateSelectUi();
    return;
  }

  selectedUnitB = unit;
  updateSelectUi();
  startBattlePreview(selectedUnitA, selectedUnitB);
}

function startBattlePreview(unitA, unitB) {
  playerAState = createBattleState(unitA);
  playerBState = createBattleState(unitB);

  currentTurn = 1;
  currentPlayer = "A";
  currentAttack = [];
  currentAttackContext = null;
  clearBattleNotice();
  clearCurrentAction();
  clearPendingChoice();

  selectingPlayer = "A";
  selectedUnitA = null;
  selectedUnitB = null;

  redrawBattleBoards();
  document.getElementById("attackLog").textContent = "バトル開始待機中";

  showScreen("battle");
}
function clampEvadeToMax(state) {
  if (typeof state.evadeMax !== "number") return;

  let clampMax = state.evadeMax;

  if (state.overEvadeMode) {
    const redCap =
      typeof state.overEvadeCap === "number"
        ? state.overEvadeCap
        : state.evadeMax;

    clampMax = Math.max(state.evadeMax, redCap);
  }

  if (state.evade > clampMax) {
    state.evade = clampMax;
  }

  if (state.evade < 0) {
    state.evade = 0;
  }

  if (state.overEvadeMode) {
    const currentRedCap =
      typeof state.overEvadeCap === "number"
        ? state.overEvadeCap
        : state.evadeMax;

    const absoluteMax =
      typeof state.overEvadeAbsoluteMax === "number"
        ? state.overEvadeAbsoluteMax
        : null;

    if (state.evade <= state.evadeMax) {
      state.overEvadeMode = false;
      state.overEvadeCap = state.evadeMax;
      state.overEvadeBaseMax = state.evadeMax;
      return;
    }

    state.overEvadeCap =
      absoluteMax !== null
        ? Math.min(currentRedCap, state.evade, absoluteMax)
        : Math.min(currentRedCap, state.evade);
  }
}

function runAfterSlotResolvedHook(actor, slotNumber, resolveResult, slotMeta = {}) {
  const afterResult = executeUnitAfterSlotResolved(actor, slotNumber, {
    ...slotMeta,
    resolveResult
  });

  if (afterResult.redraw) {
    redrawBattleBoards();
  }

  if (afterResult.message) {
    appendBattleNotice(afterResult.message);
  }
}

function resolveSlot(slot, slotMeta = {}) {
  currentAttack = [];

  const actor = getPlayerState(currentPlayer);
  const result = resolveSlotEffect({
    slot,
    actor
  });

  if (
    result.kind === "evade" ||
    result.kind === "heal" ||
    result.kind === "none" ||
    result.kind === "custom"
  ) {
    runAfterSlotResolvedHook(actor, slotMeta.slotNumber, result, slotMeta);
    redrawBattleBoards();

    if (result.message) {
      renderAttackLogText(result.message);
      return;
    }

    renderAttackLogText("行動完了");
    return;
  }

  if (result.kind === "attack") {
    currentAttack = result.attacks;
    currentAttackContext = {
      ownerPlayer: slotMeta.ownerPlayer,
      enemyPlayer: slotMeta.enemyPlayer,
      slotKey: slotMeta.slotKey,
      slotNumber: slotMeta.slotNumber,
      slotLabel: slot.label,
      slotDesc: slot.desc,
      totalCount: result.attacks.length,
      hitCount: 0,
      evadeCount: 0
    };

    redrawBattleBoards();
    renderAttackChoices();
    return;
  }

  renderAttackLogText("この行動はまだ未対応");
}

function redrawBattleBoards() {
  if (playerAState) {
    applyUnitDerivedState(playerAState);
  }

  if (playerBState) {
    applyUnitDerivedState(playerBState);
  }

  renderPlayerState(playerAState, playerABox, "PLAYER A", {
    onSlotClick: (slot) => showPopup(slot.desc),
    onSpecialDesc: (special) => showPopup(special.desc),
    onSpecialExec: (specialKey) => executeSpecial("A", specialKey),
    canExecuteSpecial: (special) => canExecuteSpecialForPlayer("A", special)
  });

  renderPlayerState(playerBState, playerBBox, "PLAYER B", {
    onSlotClick: (slot) => showPopup(slot.desc),
    onSpecialDesc: (special) => showPopup(special.desc),
    onSpecialExec: (specialKey) => executeSpecial("B", specialKey),
    canExecuteSpecial: (special) => canExecuteSpecialForPlayer("B", special)
  });

  document.getElementById("turnText").textContent = `TURN ${currentTurn}`;
  document.getElementById("turnCounterValue").textContent = String(currentTurn);
  document.getElementById("currentPlayer").textContent = `PLAYER ${currentPlayer}`;
}
function handleChoiceRequest(requestChoice) {
  if (!requestChoice) return;

  pendingChoice = {
    ...requestChoice
  };

  redrawBattleBoards();
  renderPendingChoice();
}

function executeSpecial(ownerPlayer, specialKey) {
  const actor = getPlayerState(ownerPlayer);
  const special = actor?.specials?.[specialKey];

  if (!actor || !special) {
    showPopup("特殊行動データが見つからない");
    return;
  }

  const availability = executeUnitCanUseSpecial(actor, specialKey, {
    ownerPlayer,
    enemyPlayer: getOpponentPlayer(ownerPlayer),
    currentAttackContext,
    currentAttack
  });

  if (availability.allowed === false) {
    showPopup(availability.message || "このタイミングでは実行できない");
    return;
  }

  if (!canExecuteSpecialForPlayer(ownerPlayer, special)) {
    showPopup("このタイミングでは実行できない");
    return;
  }

  const commonResult = executeCommonSpecial(actor, specialKey);

  if (commonResult.handled) {
    if (commonResult.redraw) {
      redrawBattleBoards();
    }

    if (commonResult.message) {
      showPopup(commonResult.message);
    }
    return;
  }

  const unitResult = executeUnitSpecial(actor, specialKey, {
    ownerPlayer,
    enemyPlayer: getOpponentPlayer(ownerPlayer),
    enemyState: getPlayerState(getOpponentPlayer(ownerPlayer)),
    currentAttackContext,
    currentAttack
  });

  if (unitResult.handled) {
    if (unitResult.requestChoice) {
      handleChoiceRequest(unitResult.requestChoice);
      return;
    }

    if (unitResult.appendAttacks && unitResult.appendAttacks.length > 0) {
      currentAttack.push(...unitResult.appendAttacks);

      if (currentAttackContext) {
        currentAttackContext.totalCount += unitResult.appendAttacks.length;
      }

      if (unitResult.redraw) {
        redrawBattleBoards();
      } else {
        redrawBattleBoards();
      }

      if (unitResult.message) {
        appendBattleNotice(unitResult.message);
      }

      renderAttackChoices();
      return;
    }

    if (unitResult.startSlotAction) {
      if (unitResult.redraw) {
        redrawBattleBoards();
      }

      if (unitResult.message) {
        appendBattleNotice(unitResult.message);
      }

      startSlotAction(
        ownerPlayer,
        unitResult.startSlotAction.slotKey,
        unitResult.startSlotAction.slotData || null
      );
      return;
    }

    if (unitResult.forcedSlotDesc) {
      currentAttack = [];
      setCurrentAction(
        `PLAYER ${ownerPlayer} の行動`,
        unitResult.forcedSlotLabel || special.name
      );

      resolveSlot(
        {
          label: unitResult.forcedSlotLabel || special.name,
          desc: unitResult.forcedSlotDesc
        },
        {
          ownerPlayer,
          enemyPlayer: getOpponentPlayer(ownerPlayer),
          slotKey: null,
          slotNumber: null
        }
      );
      return;
    }

    if (unitResult.redraw) {
      redrawBattleBoards();
    }

    if (unitResult.message) {
      showPopup(unitResult.message);
    }

    return;
  }
}

function resolvePendingChoice(selectedValue) {
  if (!pendingChoice) return;

  const choice = pendingChoice;
  const ownerPlayer = choice.ownerPlayer;
  const enemyPlayer = choice.enemyPlayer || getOpponentPlayer(ownerPlayer);

  const actor = getPlayerState(ownerPlayer);
  const defender = getPlayerState(enemyPlayer);

  if (!actor) {
    clearPendingChoice();
    return;
  }

  const result = executeUnitResolveChoice(actor, choice, selectedValue, {
    ownerPlayer,
    enemyPlayer,
    enemyState: defender,
    currentAttackContext,
    currentAttack
  });

  clearPendingChoice();

  if (!result.handled) {
    redrawBattleBoards();
    renderAttackLogText("選択完了");
    return;
  }

  if (result.requestChoice) {
    handleChoiceRequest(result.requestChoice);
    return;
  }

  if (result.startSlotAction) {
    if (result.redraw) {
      redrawBattleBoards();
    }

    if (result.message) {
      appendBattleNotice(result.message);
    }

    startSlotAction(
      ownerPlayer,
      result.startSlotAction.slotKey,
      result.startSlotAction.slotData || null
    );
    return;
  }

  if (result.redraw) {
    redrawBattleBoards();
  } else {
    redrawBattleBoards();
  }

  renderAttackLogText(result.message || "選択完了");
}
function renderAttackChoices() {
  renderAttackChoicesUI({
    currentAttack,
    battleNotice,
    currentActionHeader,
    currentActionLabel,
    onHit: (index) => takeHit(index),
    onEvade: (index) => evadeAttack(index)
  });

  clearBattleNotice();
}

function finishCurrentAttackResolution() {
  if (!currentAttackContext) {
    redrawBattleBoards();
    renderAttackLogText("攻撃解決済み");
    return;
  }

  const context = currentAttackContext;
  const attacker = getPlayerState(context.ownerPlayer);
  const defender = getPlayerState(context.enemyPlayer);

  currentAttackContext = null;

  const actionResult = executeUnitActionResolved(attacker, defender, {
    ...context,
    allEvaded: context.totalCount > 0 && context.hitCount === 0 && context.evadeCount === context.totalCount
  });

  redrawBattleBoards();

  if (actionResult.message) {
    appendBattleNotice(actionResult.message);
  }

  if (actionResult.requestChoice) {
    handleChoiceRequest(actionResult.requestChoice);
    return;
  }

  if (actionResult.startSlotAction) {
    startSlotAction(
      context.ownerPlayer,
      actionResult.startSlotAction.slotKey,
      actionResult.startSlotAction.slotData || null
    );
    return;
  }

  renderAttackLogText("攻撃解決済み");
}

function takeHit(index) {
  const defender = currentPlayer === "A" ? playerBState : playerAState;
  const attacker = currentPlayer === "A" ? playerAState : playerBState;
  const attack = currentAttack[index];
  const damagePreview = attack ? attack.damage : 0;

  const hitResult = resolveTakeHit({
    currentPlayer,
    playerAState,
    playerBState,
    currentAttack,
    attackIndex: index,
    modifyTakenDamage: (hitDefender, hitAttacker, hitAttack, damage) =>
      executeUnitModifyTakenDamage(hitDefender, hitAttacker, hitAttack, damage)
  });

  if (hitResult && hitResult.cancelled) {
    appendBattleNotice("攻撃無効");

    if (currentAttack.length === 0) {
      finishCurrentAttackResolution();
      return;
    }

    redrawBattleBoards();
    renderAttackChoices();
    return;
  }

  defender.lastDamageTaken =
    typeof hitResult?.finalDamage === "number" ? hitResult.finalDamage : damagePreview;

  if (hitResult?.damageMessage) {
    appendBattleNotice(hitResult.damageMessage);
  }

  if (currentAttackContext) {
    currentAttackContext.hitCount++;
  }

  const damagedResult = executeUnitOnDamaged(defender, attacker);

  if (currentAttack.length === 0) {
    if (damagedResult.message) {
      appendBattleNotice(damagedResult.message);
    }
    finishCurrentAttackResolution();
    return;
  }

  redrawBattleBoards();
  renderAttackChoices();

  if (damagedResult.message) {
    showPopup(damagedResult.message);
  }
}

function evadeAttack(index) {
  const defender = currentPlayer === "A" ? playerBState : playerAState;
  const attacker = currentPlayer === "A" ? playerAState : playerBState;
  const attack = currentAttack[index];

  const customEvade = executeUnitModifyEvadeAttempt(defender, attacker, attack, {
    currentPlayer,
    playerAState,
    playerBState,
    currentAttack,
    attackIndex: index
  });

  if (customEvade && customEvade.handled) {
    if (!customEvade.ok) {
      appendBattleNotice(
        customEvade.message ||
          (customEvade.reason === "noEvade"
            ? "回避が足りない"
            : "この攻撃は通常回避できない！")
      );
      redrawBattleBoards();
      renderAttackChoices();
      return;
    }

    const consumeEvade = Math.max(0, Number(customEvade.consumeEvade || 0));
    defender.evade = Math.max(0, defender.evade - consumeEvade);

    currentAttack.splice(index, 1);

    if (currentAttackContext) {
      currentAttackContext.evadeCount++;
    }

    if (customEvade.message) {
      appendBattleNotice(customEvade.message);
    }

    if (currentAttack.length === 0) {
      finishCurrentAttackResolution();
      return;
    }

    redrawBattleBoards();
    renderAttackChoices();
    return;
  }

  const result = resolveEvadeAttack({
    currentPlayer,
    playerAState,
    playerBState,
    currentAttack,
    attackIndex: index
  });

  if (!result.ok) {
    if (result.reason === "cannotEvade") {
      appendBattleNotice("この攻撃は通常回避できない！");
      redrawBattleBoards();
      renderAttackChoices();
      return;
    }

    if (result.reason === "noEvade") {
      appendBattleNotice("回避が足りない");
      redrawBattleBoards();
      renderAttackChoices();
      return;
    }
  }

  if (currentAttackContext) {
    currentAttackContext.evadeCount++;
  }

  if (currentAttack.length === 0) {
    finishCurrentAttackResolution();
    return;
  }

  redrawBattleBoards();
  renderAttackChoices();
}

function executeSlot() {
  if (pendingChoice) {
    renderPendingChoice();
    return;
  }

  const attacker = getPlayerState(currentPlayer);
  const rollableSlotKeys = getRollableSlotKeys(attacker);
  const rolledIndex = Math.floor(Math.random() * rollableSlotKeys.length);
  const slotKey = rollableSlotKeys[rolledIndex];

  startSlotAction(currentPlayer, slotKey);
}


function simulateSlot() {
  const attacker = getPlayerState(currentPlayer);
  const slotKey = getRandomSlotKey(attacker);
  const slot = getSlotByKey(attacker, slotKey);

  attacker.lastSlotKey = slotKey;

  showPopup(`出目: ${slot.label}`);
}

function endTurn() {
  if (pendingChoice) {
    renderPendingChoice();
    return;
  }

  const actorPlayer = currentPlayer;
  const enemyPlayer = getOpponentPlayer(actorPlayer);
  const actor = getPlayerState(actorPlayer);
  const enemyState = getPlayerState(enemyPlayer);

  actor.shieldActive = false;
  enemyState.shieldActive = false;

  clampEvadeToMax(actor);
  actor.lastSlotKey = null;

  const turnEndResult = executeUnitTurnEnd(actor, {
    ownerPlayer: actorPlayer,
    enemyPlayer,
    enemyPlayerLabel: `PLAYER ${enemyPlayer}`,
    enemyPredictableSlotKeys: getPredictableSlotKeys(enemyState)
  });

  actor.isConfusedTurn = false;
  actor.confuseHits = 0;

  clearBattleNotice();
  clearCurrentAction();
  clearPendingChoice();
  currentAttack = [];
  currentAttackContext = null;

  currentPlayer = enemyPlayer;
  if (currentPlayer === "A") {
    currentTurn++;
  }

  const nextActor = getPlayerState(currentPlayer);

  if (nextActor.confuseStock > 0) {
    nextActor.isConfusedTurn = true;
    nextActor.confuseHits = nextActor.confuseStock;
    nextActor.confuseStock = 0;
  }

  document.getElementById("attackLog").textContent = "バトル開始待機中";
  redrawBattleBoards();

  if (turnEndResult.requestChoice) {
    handleChoiceRequest(turnEndResult.requestChoice);
    return;
  }

  if (turnEndResult.message) {
    showPopup(turnEndResult.message);
  }
}

document.getElementById("executeSlotBtn").addEventListener("click", executeSlot);
document.getElementById("simulateSlotBtn").addEventListener("click", simulateSlot);
document.getElementById("endTurnBtn").addEventListener("click", endTurn);

loadUnitButtons();
