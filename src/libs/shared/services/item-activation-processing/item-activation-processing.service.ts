import { Injectable } from '@angular/core';
import { CharacterService } from 'src/app/services/character.service';
import { ConditionGain } from 'src/app/classes/ConditionGain';
import { Consumable } from 'src/app/classes/Consumable';
import { Creature } from 'src/app/classes/Creature';
import { Oil } from 'src/app/classes/Oil';
import { SpellCast } from 'src/app/classes/SpellCast';
import { CreatureConditionsService } from 'src/libs/shared/services/creature-conditions/creature-conditions.service';
import { ItemGrantingService } from 'src/libs/shared/services/item-granting/item-granting.service';
import { SpellsDataService } from 'src/app/core/services/data/spells-data.service';
import { SpellProcessingService } from 'src/libs/shared/services/spell-processing/spell-processing.service';
import { SettingsService } from 'src/app/core/services/settings/settings.service';

@Injectable({
    providedIn: 'root',
})
export class ItemActivationProcessingService {

    constructor(
        private readonly _creatureConditionsService: CreatureConditionsService,
        private readonly _itemGrantingService: ItemGrantingService,
        private readonly _spellsDataService: SpellsDataService,
        private readonly _spellProcessingService: SpellProcessingService,
        private readonly _characterService: CharacterService,
        private readonly _settingsService: SettingsService,
    ) { }

    public processConsumableActivation(
        creature: Creature,
        item: Consumable,
    ): void {

        //Consumables don't do anything in manual mode, except be used up.
        if (!this._settingsService.isManualMode) {

            //One time effects
            if (item.onceEffects) {
                item.onceEffects.forEach(effect => {
                    this._characterService.processOnceEffect(creature, effect);
                });
            }

            //Apply conditions
            item.gainConditions.forEach(gain => {
                const newConditionGain = Object.assign(new ConditionGain(), gain).recast();

                this._creatureConditionsService.addCondition(creature, newConditionGain, {}, { noReload: true });
            });

            //Cast Spells
            if (item instanceof Oil) {
                item.castSpells.forEach((cast: SpellCast) => {
                    cast.spellGain.duration = cast.duration;

                    const librarySpell = this._spellsDataService.spellFromName(cast.name);

                    if (librarySpell) {
                        this._spellProcessingService.processSpell(
                            librarySpell,
                            true,
                            { creature, target: creature.type, gain: cast.spellGain, level: cast.level },
                            { manual: true },
                        );
                    }
                });
            }

            //Gain Items on Activation
            if (item.gainItems.length) {
                item.gainItems.forEach(gainItem => {
                    this._itemGrantingService.grantGrantedItem(
                        gainItem,
                        creature,
                        { sourceName: item.effectiveName(), grantingItem: item },
                    );
                });
            }

        }

    }

}