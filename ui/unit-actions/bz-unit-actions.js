import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import CommanderInteract from '/base-standard/ui/commander-interact/model-commander-interact.js';
import { UnitActionsPanelModel } from '/base-standard/ui/unit-actions/unit-actions.js';

Controls.loadStyle("fs://game/bz-army-trix/ui/unit-actions/bz-unit-actions.css");

import { ComponentUtilities } from '/core/ui-next/utilities/component-utilities.js';
ComponentUtilities.preloadImages(
  "blp:action_deselect.png",
  "fs://game/Action_Attack.png",
  "fs://game/Action_Construct.png",
  "fs://game/Action_Defend.png",
  "fs://game/Action_Ranged.png",
  "fs://game/action_bombard.png",
  "fs://game/action_rangedattack.png",
  "fs://game/action_treasure_fleet.png",
);

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
    // extend component.onInitialize
    c.onInitialize = c.proto.onInitialize;
    c.proto.onInitialize = function() {
      c.onInitialize.call(this);
      this.bzArmyTrix.afterInitialize();
    }
    // patch component.createButtons to fix a bug
    c.createButtons = c.proto.createButtons;
    c.proto.createButtons = function(actions) {
      c.createButtons.call(this, actions);
      this.bzArmyTrix.afterCreateButtons.call(this, actions);
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
  afterInitialize() {
    this.component.Root.classList.add("bz-army-trix", "bz-unit-actions");
  }
  afterCreateButtons(actions) {
    if (actions == this.hiddenActions) {
      const container = this.hiddenContainer;

      // add Deselect button
      const TODO = false;
      if (TODO && container.children.length < 6) {
        const buttons = [...container.querySelectorAll(".unit-actions__action-button")];
        const icons = buttons.map(e => e.style.getPropertyValue("--button-icon"));
        if (!icons.includes('url("blp:action_deselect.png")')) {
          this.createDeselectUnitAction(container.children.length + 1);
        }
      }
      // fix button alignment
      container.classList.replace("flex-wrap", "flex-wrap-reverse");
      const vspacer = "mb-2";
      const hspacer = "ml-2";
      const size = container.children.length;
      for (let i = 0; i < size; ++i) {
        const button = container.children[i];
        button.classList.toggle(vspacer, (i + 1) % 3 != 0);
        button.classList.toggle(hspacer, 3 <= i);
      }
    }
  }
  updateShelf() {
    if (UnitActionsPanelModel.isShelfOpen) {
      this.shelfButton.removeAttribute("tabindex");
    } else {
      this.shelfButton.setAttribute("tabindex", "-1");
    }
    const numActionsForDouble = UI.getViewExperience() == UIViewExperience.Mobile ? 3 : 4;
    const isDouble = this.hiddenContainer.children.length >= numActionsForDouble;
    this.Root.querySelector(".unit-actions__hidden-column-bg")?.classList.toggle(
      "no-col",
      !UnitActionsPanelModel.isShelfOpen
    );
    this.Root.querySelector(".unit-actions__hidden-column-bg")?.classList.toggle(
      "single-col",
      UnitActionsPanelModel.isShelfOpen && !isDouble
    );
    this.Root.querySelector(".unit-actions__hidden-column-bg")?.classList.toggle(
      "double-col",
      UnitActionsPanelModel.isShelfOpen && isDouble
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
