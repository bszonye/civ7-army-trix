# Army Trix 1.0.1
better unit command tools

- better army portraits for packed units
- quick pack: skip commander selection when there's only one in range
- quick unpack: selecting a packed unit automatically starts deployment
- new Wake All action to quickly wake up multiple sleeping units
- new alerts for sleeping Missionary units
- new hotkey (`End`) to center the selected unit
- compatible with slothoth's Action Panel Improvements mod

## army portrait overlays
packed units show extra information to quickly assess combat readiness
and pick the unit you want.  new stat overlays include:

- movement left / maximum movement
- military unit tier and upgrade readiness
- commander level and promotion readiness
- exact unit health for damaged units

## quick pack and unpack
the Add to Commander and Leave Commander actions leave the unit selected
after packing or unpacking.  Add to Commander skips unit selection when
there's only one commander in range, and the Leave Commander interface
starts automatically after packing or selecting a unit, so you can pack
and redeploy a unit in just two clicks.

## wake all
the new Wake All action wakes up all units of the same type, canceling
any active Sleep or Skip Turn actions.  for military units, the action
also wakes all Land Military Units or all Naval Units, as appropriate.

## missionary alerts
two new Toggle Alert actions let you optionally wake up sleeping
Missionary units in response to nearby events.  the Missionary Units
alert reacts to rival units in the same settlement, and the Spread
Religion alert reacts to conversion.

## new Center Selection hotkey
the `End` key centers the camera on the selected unit.
(hotkeys are configurable in the Accessibility Options menu.)
