import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import CommanderInteract from '/base-standard/ui/commander-interact/model-commander-interact.js';
import { UnitActionsPanelModel } from '/base-standard/ui/unit-actions/unit-actions.js';

import { ComponentUtilities } from '/core/ui-next/utilities/component-utilities.js';
ComponentUtilities.preloadImages(
  // deselect button
  "blp:action_deselect.png",
  // missionary toggle buttons
  "blp:unitflag_missionary.png",
  "blp:action_spreadreligion.png",
  "blp:Action_Sleep.png",
  "blp:Action_Wake.png",
  "blp:action_showall.png",
  // unit statistic labels
  "fs://game/Action_Attack.png",
  "fs://game/Action_Construct.png",
  "fs://game/Action_Defend.png",
  "fs://game/Action_Ranged.png",
  "fs://game/action_bombard.png",
  "fs://game/action_rangedattack.png",
  "fs://game/action_treasure_fleet.png",
);

Controls.loadStyle("fs://game/bz-army-trix/ui/unit-actions/bz-unit-actions.css");

class bzUnitActions {
  static c = null;
  constructor(component) {
    this.component = component;
    component.bzArmyTrix = this;
    this.patchPrototype(Object.getPrototypeOf(component));
  }
  patchPrototype(proto) {
    if (bzUnitActions.c) return;  // one-time initialization
    // patch PanelCityDetails methods & properties
    const c = bzUnitActions.c = { proto };
    // override component.currentState property
    c.currentState = Object.getOwnPropertyDescriptor(c.proto, "currentState");
    const currentState = {
      ...c.currentState,
      set(value) {
        c.currentState.set.apply(this, [value]);
        this.bzArmyTrix.startQuickUnpack();
      },
    };
    Object.defineProperty(c.proto, "currentState", currentState);
    // extend component.onInitialize
    c.onInitialize = c.proto.onInitialize;
    c.proto.onInitialize = function() {
      const crv = c.onInitialize.call(this);
      const arv = this.bzArmyTrix.afterInitialize();
      return crv ?? arv;
    }
    // extend component.realizeButtons
    c.realizeButtons = c.proto.realizeButtons;
    c.proto.realizeButtons = function(...args) {
      const crv = c.realizeButtons.apply(this, args);
      const arv = this.bzArmyTrix.afterRealizeButtons();
      return crv ?? arv;
    }
    // extend component.getUnitActions
    c.getUnitActions = c.proto.getUnitActions;
    c.proto.getUnitActions = function(...args) {
      const [unit] = args;
      const crv = c.getUnitActions.apply(this, args);
      const arv = this.bzArmyTrix.afterGetUnitActions(unit);
      return crv ?? arv;
    }
    // patch component.createButtons to fix a bug
    c.createButtons = c.proto.createButtons;
    c.proto.createButtons = function(...args) {
      const [actions] = args;
      const crv = c.createButtons.apply(this, args);
      const arv = this.bzArmyTrix.afterCreateButtons(actions);
      return crv ?? arv;
    }
    // replace component.updateShelf to fix a bug
    c.updateShelf = c.proto.updateShelf;
    c.proto.updateShelf = function() {
      this.bzArmyTrix.updateShelf.call(this);
    }
  }
  beforeAttach() { }
  afterAttach() { }
  beforeDetach() { }
  afterDetach() { }
  findButton(container, url) {
    const buttons = [...container.querySelectorAll(".unit-actions__action-button")];
    const icons = buttons.map(e => e.style.getPropertyValue("--button-icon"));
    const index = icons.indexOf(`url("${url}")`);
    return index == -1 ? null : buttons[index];
  }
  afterInitialize() {
    this.component.Root.classList.add("bz-army-trix", "bz-unit-actions");
  }
  afterRealizeButtons() {
    const buttons = this.component.hiddenContainer;
    const missionaryButton = this.findButton(buttons, "blp:unitflag_missionary.png");
    const alertFlag = (type) => {
      const flag = document.createElement("div");
      flag.classList.add(type);
      return flag;
    }
    if (missionaryButton) {
      missionaryButton.classList.add("bz-missionary-alert-button", "relative");
      const flag = alertFlag("bz-missionary-alert-flag");
      flag.classList.add("bz-sleep-flag");
      missionaryButton.appendChild(flag);
    }
    const religionButton = this.findButton(buttons, "blp:action_spreadreligion.png");
    if (religionButton) {
      religionButton.classList.add("bz-religion-alert-button", "relative");
      const flag = alertFlag("bz-religion-alert-flag");
      flag.classList.add("bz-alert-flag");
      religionButton.appendChild(flag);
    }
  }
  afterGetUnitActions(unit) {
    const actions = [];
    if (!unit.isAutomated) actions.push(
      {
        // wake all units of the same formation class
        name: "Wake All",  // TODO
        icon: "blp:action_showall.png",  // TODO
        type: "UNITOPERATION_BZ_WAKE_ALL",  // TODO
        annotation: "",
        active: true,  // TODO
        requireConfirm: false,
        confirmTitle: "",
        confirmBody: "",
        UICategory: 3,
        priority: -1,
        hotkeyId: "WakeAll",  // TODO
        callback: (_location) => {
          // TODO
          console.warn(`TRIX WAKE`);
          this.component.switchToDefault();
        }
      },
    );
    if (unit.Religion?.spreadCharges ?? 0) actions.push(
      {
        name: "Alert (Missionary Units)",  // TODO
        icon: "blp:unitflag_missionary.png",  // TODO
        type: "UNITOPERATION_BZ_ALERT_UNIT_MISSIONARY",  // TODO
        annotation: "",
        active: true,  // TODO
        requireConfirm: false,
        confirmTitle: "",
        confirmBody: "",
        UICategory: 3,
        priority: -1,
        hotkeyId: "AlertUnits",  // TODO
        callback: (_location) => {
          // TODO
          console.warn(`TRIX ALERT (Missionary Units)`);
          this.component.switchToDefault();
        }
      },
      {
        name: "Alert (Spread Religion)",  // TODO
        icon: "blp:action_spreadreligion.png",  // TODO
        type: "UNITOPERATION_BZ_ALERT_SPREAD_RELIGION",  // TODO
        annotation: "",
        active: true,  // TODO
        requireConfirm: false,
        confirmTitle: "",
        confirmBody: "",
        UICategory: 3,
        priority: -1,
        hotkeyId: "AlertSpreadReligion",  // TODO
        callback: (_location) => {
          // TODO
          console.warn(`TRIX ALERT (Spread Religion)`);
          this.component.switchToDefault();
        }
      },
    );
    this.component.actions.unshift(...actions);
  }
  startQuickUnpack() {
    if (this.component._currentState != 3) return;
    const unpackAction = this.component.standardActions
      .find(a => a.type == "UNITCOMMAND_REMOVE_FROM_ARMY");
    if (unpackAction) this.component.onActionChosen(unpackAction);
  }
  afterCreateButtons(actions) {
    if (actions == this.component.hiddenActions) {
      const buttons = this.component.hiddenContainer;

      // add Deselect button
      const TODO = true;
      if (TODO) {
        if (!this.findButton(buttons, "blp:action_deselect.png")) {
          this.component.createDeselectUnitAction(buttons.children.length + 1);
        }
      }
      // fix button alignment
      buttons.classList.replace("flex-wrap", "flex-wrap-reverse");
      const vspacer = "mb-2";
      const hspacer = "ml-2";
      const rows = UI.getViewExperience() == UIViewExperience.Mobile ? 2 : 3;
      const size = buttons.children.length;
      for (let i = 0; i < size; ++i) {
        const button = buttons.children[i];
        button.classList.toggle(vspacer, (i + 1) % rows != 0);
        button.classList.toggle(hspacer, rows <= i);
      }
    }
  }
  updateShelf() {
    if (UnitActionsPanelModel.isShelfOpen) {
      this.shelfButton.removeAttribute("tabindex");
    } else {
      this.shelfButton.setAttribute("tabindex", "-1");
    }
    const rows = UI.getViewExperience() == UIViewExperience.Mobile ? 2 : 3;
    const columns = Math.ceil(this.hiddenContainer.children.length / rows);
    console.warn(`TRIX ${this.hiddenContainer.children.length} ${rows} ${columns}`);
    this.Root.querySelector(".unit-actions__hidden-column-bg")?.classList.toggle(
      "no-col",
      !UnitActionsPanelModel.isShelfOpen
    );
    this.Root.querySelector(".unit-actions__hidden-column-bg")?.classList.toggle(
      "single-col",
      UnitActionsPanelModel.isShelfOpen && columns < 2
    );
    this.Root.querySelector(".unit-actions__hidden-column-bg")?.classList.toggle(
      "double-col",
      UnitActionsPanelModel.isShelfOpen && columns == 2
    );
    this.shelfButton.classList.toggle("flip", UnitActionsPanelModel.isShelfOpen);
    this.Root.querySelector(".unit-actions__hidden-column-bg")?.classList.toggle(
      "triple-col",
      UnitActionsPanelModel.isShelfOpen && columns == 3
    );
    this.Root.querySelector(".unit-actions__hidden-column-bg")?.classList.toggle(
      "quad-col",
      UnitActionsPanelModel.isShelfOpen && columns == 4
    );
    this.shelfButton.classList.toggle("flip", UnitActionsPanelModel.isShelfOpen);
  }
}
Controls.decorate("unit-actions", (c) => new bzUnitActions(c));

// patch add-to-army interface mode
import '/base-standard/ui/interface-modes/interface-mode-add-to-army.js';
const ATA = InterfaceMode.getInterfaceModeHandler("INTERFACEMODE_ADD_TO_ARMY");

// patch initialize method to support single-click selection
const ATA_initialize = ATA.initialize;
ATA.initialize = function() {
  this.autoSelectSinglePlots = true;
  const rv = ATA_initialize.call(this);
  if (this.validPlots.size == 1) {
    const it = this.validPlots.values();
    const plotIndex = it.next().value;
    if (plotIndex) {
      this.singlePlotCoord = GameplayMap.getLocationFromIndex(plotIndex);
      return true;
    } else {
      console.error(`${this.constructor.name}: single-plot auto-select failed`);
      return false;
    }
  }
  return rv;
};

// patch commitPlot method to select unit after packing
const ATA_commitPlot = ATA.commitPlot;
ATA.commitPlot = function(plot) {
  const rv = ATA_commitPlot.call(this, plot);
  // select unit within army
  const unitID = this.Context.UnitID;
  const commanders = MapUnits.getUnits(plot.x, plot.y)
    .map(id => Units.get(id)).filter(u => u.isCommanderUnit);
  function selectArmyUnit() {
    const unit = Units.get(unitID);
    const commander = commanders.find(u => u.armyId.id == unit.armyId.id);
    if (commander) {
      CommanderInteract.setArmyCommander(commander.id);
      UI.Player.selectUnit(unit.id);
    }
    engine.off("UnitAddedToArmy", selectArmyUnit);
  }
  engine.on("UnitAddedToArmy", selectArmyUnit);
  return rv;
}

// vim: sw=2 et
