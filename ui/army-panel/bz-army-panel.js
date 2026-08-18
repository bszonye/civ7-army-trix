import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';

Controls.loadStyle("fs://game/bz-army-trix/ui/army-panel/bz-army-panel.css");

class bzArmyPanel {
  static c = null;
  constructor(component) {
    this.component = component;
    component.bzArmyTrix = this;
    this.patchPrototype(Object.getPrototypeOf(component));
  }
  patchPrototype(proto) {
    if (bzArmyPanel.c) return;  // one-time initialization
    // patch PanelCityDetails methods & properties
    const c = bzArmyPanel.c = { proto };
    // extend component.onInitialize
    c.onInitialize = c.proto.onInitialize;
    c.proto.onInitialize = function() {
      c.onInitialize.call(this);
      this.bzArmyTrix.afterInitialize();
    }
    // extend component.onInitialize
    c.createArmyUnitButton = c.proto.createArmyUnitButton;
    c.proto.createArmyUnitButton = function(unitId) {
      const button = c.createArmyUnitButton.call(this, unitId);
      this.bzArmyTrix.afterCreateArmyUnitButton(unitId, button);
      return button;
    }
  }
  beforeAttach() { }
  afterAttach() { }
  beforeDetach() { }
  afterDetach() { }
  afterInitialize() {
    this.component.Root.classList.add("bz-army-trix");
  }
  afterCreateArmyUnitButton(unitId, button) {
    if (!ComponentID.isValid(unitId)) return;
    const unit = Units.get(unitId);
    const unitBG = button.querySelector(".army-panel__unit-health-bar-container");
    if (!unit || !unitBG) return;
    const unitInfo = GameInfo.Units.lookup(unit.type);
    const infoBG = document.createElement("div");
    infoBG.classList.value = "absolute inset-1 flex flex-col items-center font-body-xs font-bold text-shadow-br";
    const head = document.createElement("div");
    head.classList.value = "flex flex-row w-full justify-between";
    infoBG.appendChild(head);
    const body = document.createElement("div");
    body.classList.value = "flex-auto flex flex-row w-full";
    infoBG.appendChild(body);
    const tail = document.createElement("div");
    tail.classList.value = "flex flex-row w-full mb-2\\.5";
    infoBG.appendChild(tail);
    // promotion
    const promo = document.createElement("div");
    promo.classList.value = "size-5 -m-px bg-center bg-contain bg-no-repeat border border-black rounded-full";
    const xp = unit.Experience;
    if (xp?.canPromote) {
      const promote = GameInfo.UnitCommands.lookup("UNITCOMMAND_PROMOTE");
      const canPromote = xp.getStoredCommendations || xp.getStoredPromotionPoints;
      promo.classList.add("bg-info");
      promo.style.backgroundImage = `url(${promote.Icon})`;
      promo.classList.toggle("invisible", !canPromote);
    } else {
      const upgrade = GameInfo.UnitCommands.lookup("UNITCOMMAND_UPGRADE");
      const canUpgrade = Game.UnitCommands.canStart(
        unit.id, upgrade.CommandType, { X: -9999, Y: -9999 }, true
      ).Success;
      promo.classList.add("bg-secondary-2");
      promo.style.backgroundImage = `url(${upgrade.Icon})`;
      promo.classList.toggle("invisible", !canUpgrade);
    }
    head.appendChild(promo);
    // movement
    const move = document.createElement("div");
    move.classList.value = "text-center text-2xs";
    const moves = unit.Movement?.movementMovesRemaining ?? 0;
    const maxMoves = unit.Movement?.maxMoves ?? 0;
    const canMove = unit.Movement?.canMove;
    const moveValue = `${moves}/${maxMoves}`;
    move.classList.toggle("text-accent-4", !canMove);
    // move.innerHTML = Locale.stylize(`[icon:Action_Move][n]${moveValue}`);
    move.textContent = moveValue;
    head.appendChild(move);
    // health
    const health = document.createElement("div");
    health.classList.value = "flex-auto";
    const healthValue = unit.Health.maxDamage - unit.Health.damage;
    health.textContent = unit.Health.damage ? healthValue : "";
    tail.appendChild(health);
    // unit level or tier
    // TODO: better tier icons?
    const rank = document.createElement("div");
    const rankValue = unit.Experience?.canPromote ?
      unit.Experience.getLevel :
      unitInfo.Tier || null;
    if (rankValue) {
      rank.innerHTML = Locale.stylize(`[icon:NAR_REW_PROMOTION]${rankValue}`);
    }
    tail.appendChild(rank);
    unitBG.classList.add("relative");
    unitBG.appendChild(infoBG);
  }
}
Controls.decorate("army-panel", (c) => new bzArmyPanel(c));

// vim: sw=2 et
