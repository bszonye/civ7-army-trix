import { Audio } from '/core/ui/audio-base/audio-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import CommanderInteract from '/base-standard/ui/commander-interact/model-commander-interact.js';
import { UnitActionsPanelModel } from '/base-standard/ui/unit-actions/unit-actions.js';
import bzArmyTrixData from '/bz-army-trix/ui/bz-data/bz-army-trix-data.js';

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
    engine.on("LocalPlayerTurnBegin", this.onLocalPlayerTurnBegin, this);
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
  filterUnitType(unit) {
    // get all units of the same type (or same domain, for military)
    const player = Players.get(unit.owner);
    const type = unit.type;
    const info = GameInfo.Units.lookup(type);
    if (info.CoreClass != "CORE_CLASS_MILITARY") {
      return player.Units.getUnits().filter(u => u.type == type);
    }
    const fclass = info.FormationClass;
    return player.Units.getUnits().filter(u => {
      if (u.type == type) return true;
      const info = GameInfo.Units.lookup(u.type);
      if (info.FormationClass == fclass) return true;
    });
  }
  filterWakeableMissionaries(player) {
    player ??= Players.get(GameContext.localPlayerID);
    const units = player.Units.getUnits().filter(u => u.Religion?.spreadCharges ?? 0);
    return this.filterWakeableUnits(units);
  }
  filterWakeableUnits(units) {
    // get all units of the same type with a Wake command ready
    return units.filter(u => Game.UnitCommands?.canStart(
      u.id,
      "UNITCOMMAND_WAKE",
      { X: -9999, Y: -9999 },
      false
    ).Success);
  }
  wakeUnitsForMissionary(units) {
    units ??= this.filterWakeableMissionaries();
    units = units.filter(u => {
      const cityID = GameplayMap.getOwningCityFromXY(u.location.x, u.location.y);
      if (!cityID) return false;
      const city = Cities.get(cityID);
      if (!city) return false;
      const plots = city.getPurchasedPlots();
      for (const plot of plots) {
        const loc = GameplayMap.getLocationFromIndex(plot);
        const plotUnits = MapUnits.getUnits(loc.x, loc.y);
        for (const id of plotUnits) {
          const pu = Units.get(id);
          if (pu.owner == u.owner) continue;
          if (pu.Religion?.spreadCharges ?? 0) return true;
        }
      }
      return false;
    });
    this.wakeUnits(units);
  }
  wakeUnitsForReligion(units) {
    units ??= this.filterWakeableMissionaries();
    units = units.filter(u => {
      const cityID = GameplayMap.getOwningCityFromXY(u.location.x, u.location.y);
      if (!cityID) return false;
      const city = Cities.get(cityID);
      if (!city?.Religion) return false;
      const cityReligion = city.Religion?.majorityReligion ?? -1;
      const player = Players.get(u.owner);
      const playerReligion = player.Religion?.getReligionType();
      return cityReligion != playerReligion;
    });
    this.wakeUnits(units);
  }
  wakeUnits(units) {
    // wake a list of units
    const parameters = { X: -9999, Y: -9999 };
    for (const u of units) {
      Game.UnitCommands?.sendRequest(u.id, "UNITCOMMAND_WAKE", parameters);
    }
  }
  onLocalPlayerTurnBegin() {
    const autoAlert = (type, wake) => {
      const value = bzArmyTrixData.get(type) ?? true;
      if (value) wake();
    }
    autoAlert("bz-alert-missionary", this.wakeUnitsForMissionary.bind(this));
    autoAlert("bz-alert-religion", this.wakeUnitsForReligion.bind(this));
  }
  afterInitialize() {
    this.component.Root.classList.add("bz-army-trix", "bz-unit-actions");
  }
  afterRealizeButtons() {
    const buttons = this.component.hiddenContainer;
    const realizeFlag = (type, icon) => {
      const button = this.findButton(buttons, icon);
      if (button) {
        const value = bzArmyTrixData.get(type) ?? true;
        button.classList.add(`${type}-button`, "relative");
        const flag = document.createElement("div");
        flag.classList.add(`${type}-flag`);
        flag.classList.toggle("bz-alert-flag", value);
        flag.classList.toggle("bz-sleep-flag", !value);
        button.appendChild(flag);
      }
    };
    realizeFlag("bz-alert-missionary", "blp:unitflag_missionary.png");
    realizeFlag("bz-alert-religion", "blp:action_spreadreligion.png");
  }
  afterGetUnitActions(unit) {
    const units = this.filterUnitType(unit);
    const actions = [];
    const actionName = (op) => {
      const name = `LOC_${op}_NAME`;
      const desc = `LOC_${op}_DESCRIPTION`;
      const text =
        `[STYLE:unit-action__tooltip-title]${Locale.compose(name)}[/STYLE]` +
        `[n]${Locale.compose(desc)}`;
      return text;
    };
    if (!unit.isAutomated && this.filterWakeableUnits(units).length) actions.push(
      {
        // wake all units of the same formation class
        name: actionName("UNITOPERATION_BZ_WAKE_ALL"),
        icon: "blp:action_showall.png",
        type: "UNITOPERATION_BZ_WAKE_ALL",
        annotation: "",
        active: true,
        requireConfirm: false,
        confirmTitle: "",
        confirmBody: "",
        UICategory: 3,
        priority: -1,
        hotkeyId: "bzWakeAll",
        callback: (_location) => {
          this.wakeUnits(this.filterWakeableUnits(units));
          UI.sendAudioEvent(Audio.getSoundTag("data-audio-cancel-action", "interact-unit"));
          delayByFrame(() => {
            this.component.realizeButtons();
            this.component.updateFocusGate.call(`getUnitActions-bz-wake-all`);
          }, 5);
        }
      },
    );
    const toggleAlert = (type, wake) => {
      // toggle value
      const newValue = !(bzArmyTrixData.get(type) ?? true);
      bzArmyTrixData.set(type, newValue);
      // if toggle was set, wake units
      if (newValue) wake();
      UI.sendAudioEvent(
        Audio.getSoundTag("data-audio-ability-cancel-action", "interact-unit")
      );
      // reload panel
      delayByFrame(() => {
        this.component.realizeButtons();
        this.component.updateFocusGate.call(`getUnitActions-${type}`);
      }, 5);
    };
    if (unit.Religion?.spreadCharges ?? 0) actions.push(
      {
        name: actionName("UNITOPERATION_BZ_ALERT_MISSIONARY"),
        icon: "blp:unitflag_missionary.png",
        type: "UNITOPERATION_BZ_ALERT_MISSIONARY",
        annotation: "",
        active: true,
        requireConfirm: false,
        confirmTitle: "",
        confirmBody: "",
        UICategory: 3,
        priority: -1,
        hotkeyId: "bzAlertMissionary",
        callback: (_location) => {
          toggleAlert(
            "bz-alert-missionary",
            this.wakeUnitsForMissionary.bind(this)
          );
        }
      },
      {
        name: actionName("UNITOPERATION_BZ_ALERT_RELIGION"),
        icon: "blp:action_spreadreligion.png",
        type: "UNITOPERATION_BZ_ALERT_RELIGION",
        annotation: "",
        active: true,
        requireConfirm: false,
        confirmTitle: "",
        confirmBody: "",
        UICategory: 3,
        priority: -1,
        hotkeyId: "bzAlertReligion",
        callback: (_location) => {
          toggleAlert(
            "bz-alert-religion",
            this.wakeUnitsForReligion.bind(this)
          );
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
      const TODO = false;
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
