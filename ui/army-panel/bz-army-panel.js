import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';

import { ComponentUtilities } from '/core/ui-next/utilities/component-utilities.js';
ComponentUtilities.preloadImages(
  "blp:Action_Unpack.png",
  "fs://game/bz-army-trix/icons/bz-chevrons-1.png",
  "fs://game/bz-army-trix/icons/bz-chevrons-2.png",
  "fs://game/bz-army-trix/icons/bz-chevrons-3.png",
);

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
    c.proto.onInitialize = function(...args) {
      const crv = c.onInitialize.apply(this, args);
      const arv = this.bzArmyTrix.afterInitialize();
      return crv ?? arv;
    }
    // extend component.onInitialize
    c.createArmyUnitButton = c.proto.createArmyUnitButton;
    c.proto.createArmyUnitButton = function(...args) {
      const [unitId] = args;
      const button = c.createArmyUnitButton.apply(this, args);
      this.bzArmyTrix.afterCreateArmyUnitButton(unitId, button);
      return button;
    }
  }
  beforeAttach() { }
  afterAttach() { }
  beforeDetach() { }
  afterDetach() { }
  afterInitialize() {
    this.component.Root.classList.add("bz-army-trix", "bz-army-panel");
  }
  afterCreateArmyUnitButton(unitId, button) {
    if (!ComponentID.isValid(unitId)) return;
    const unit = Units.get(unitId);
    const unitBG = button.querySelector(".army-panel__unit-health-bar-container");
    if (!unit || !unitBG) return;
    const unitInfo = GameInfo.Units.lookup(unit.type);
    const infoBG = document.createElement("div");
    infoBG.classList.value = "absolute inset-1 flex flex-col items-center font-body-sm font-bold text-shadow-br";
    const head = document.createElement("div");
    head.classList.value = "flex flex-row w-full items-start justify-between";
    infoBG.appendChild(head);
    const body = document.createElement("div");
    body.classList.value = "flex-auto flex flex-row w-full";
    infoBG.appendChild(body);
    const tail = document.createElement("div");
    tail.classList.value = "flex flex-row items-end w-full mb-2\\.5";
    infoBG.appendChild(tail);
    // promotion
    const promo = document.createElement("div");
    promo.classList.value = "-m-px bg-center bg-contain bg-no-repeat border border-black rounded-full";
    const xp = unit.Experience;
    if (xp?.canPromote) {
      const promote = GameInfo.UnitCommands.lookup("UNITCOMMAND_PROMOTE");
      const canPromote = xp.getStoredCommendations || xp.getStoredPromotionPoints;
      promo.classList.add("size-9");
      promo.style.backgroundColor = "#00ccffaa";
      promo.style.backgroundImage = `url(${promote.Icon})`;
      promo.classList.toggle("invisible", !canPromote);
    } else {
      const upgrade = GameInfo.UnitCommands.lookup("UNITCOMMAND_UPGRADE");
      const canUpgrade = Game.UnitCommands.canStart(
        unit.id, upgrade.CommandType, { X: -9999, Y: -9999 }, true
      ).Success;
      promo.classList.add("size-6");
      promo.style.backgroundColor = "#e5d2ac66";
      promo.style.backgroundImage = `url(${upgrade.Icon})`;
      promo.classList.toggle("invisible", !canUpgrade);
    }
    head.appendChild(promo);
    // movement
    const move = document.createElement("div");
    move.classList.value = "text-center text-2xs leading-none";
    const moves = unit.Movement?.movementMovesRemaining ?? 0;
    const maxMoves = unit.Movement?.maxMoves ?? 0;
    const canMove = unit.Movement?.canMove;
    const moveValue = `${moves}/${maxMoves}`;
    unitBG.classList.toggle("opacity-60", !canMove);
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
    const rank = document.createElement("div");
    if (unit.Experience?.canPromote) {
      rank.classList.value = "text-xl -mr-1";
      rank.style.filter = "saturate(0)";
      rank.innerHTML =
        Locale.stylize(`${unit.Experience.getLevel}[icon:NAR_REW_PROMOTION]`);
    } else if (unitInfo.Tier) {
      const tier = unitInfo.Tier;
      rank.classList.value = "size-8 bg-center bg-contain bg-no-repeat -mx-1\\.25";
      const chevrons = `url(fs://game/bz-army-trix/icons/bz-chevrons-${tier}.png)`;
      const yrem = GlobalScaling.pixelsToRem((tier - 3) * 4);
      rank.style.filter = "saturate(0)";
      rank.style.marginBottom = `${yrem}rem`;
      rank.style.backgroundImage = chevrons;
    }
    tail.appendChild(rank);
    unitBG.classList.add("relative");
    unitBG.appendChild(infoBG);
  }
}
Controls.decorate("army-panel", (c) => new bzArmyPanel(c));

// vim: sw=2 et
