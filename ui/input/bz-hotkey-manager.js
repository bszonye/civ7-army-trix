import HotkeyManager from '/core/ui/input/hotkey-manager.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';

function getArmyCommander(player, id) {
    for (const uid of player.Units.getUnitIds()) {
        const unit = Units.get(uid);
        if (unit.isCommanderUnit && unit.armyId.id == id) return unit;
    }
    return null;
}

const HM_handleInput = HotkeyManager.handleInput;
HotkeyManager.handleInput = function(...args) {
    const [inputEvent] = args;
    const status = inputEvent.detail.status;
    if (status == InputActionStatuses.FINISH) {
        const name = inputEvent.detail.name;
        switch (name) {
            case "bz-center-selection": {
                const id = UI.Player.getHeadSelectedUnit();
                if (!ComponentID.isValid(id))  break;
                const unit = Units.get(id);
                const isCommander = unit.isCommanderUnit;
                const player = Players.get(GameContext.localPlayerID);
                const reinforcementArmyId = player.Armies
                    .getUnitReinforcementCommanderId(unit.id, player.id);
                const isReinforcement = reinforcementArmyId != -1;
                const armyId = isReinforcement ? reinforcementArmyId : unit.armyId.id;
                const isPacked = armyId != -1 && !isCommander;
                if (isPacked) {
                    const commander = getArmyCommander(player, armyId);
                    Camera.lookAtPlot(commander.location);
                } else {
                    Camera.lookAtPlot(unit.location);
                }
                return false;
            }
        }
    }
    // default handler
    return HM_handleInput.apply(this, args);
}
