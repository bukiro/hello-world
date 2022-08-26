import { Injectable } from '@angular/core';
import { Trait } from 'src/app/classes/Trait';
import { Creature } from 'src/app/classes/Creature';
import { TraitsDataService } from 'src/app/core/services/data/traits-data.service';
import { Feat } from 'src/app/character-creation/definitions/models/Feat';
import { Activity } from 'src/app/classes/Activity';
import { ActivityGain } from 'src/app/classes/ActivityGain';
import { AnimalCompanionAncestry } from 'src/app/classes/AnimalCompanionAncestry';
import { AnimalCompanionSpecialization } from 'src/app/classes/AnimalCompanionSpecialization';
import { Armor } from 'src/app/classes/Armor';
import { ArmorRune } from 'src/app/classes/ArmorRune';
import { ConditionSet } from 'src/app/classes/ConditionSet';
import { Equipment } from 'src/app/classes/Equipment';
import { ItemActivity } from 'src/app/classes/ItemActivity';
import { Shield } from 'src/app/classes/Shield';
import { Specialization } from 'src/app/classes/Specialization';
import { Weapon } from 'src/app/classes/Weapon';
import { WeaponRune } from 'src/app/classes/WeaponRune';
import { WornItem } from 'src/app/classes/WornItem';
import { HintShowingItem } from '../../definitions/Types/hintShowingItem';
import { ConditionsDataService } from 'src/app/core/services/data/conditions-data.service';
import { FamiliarsDataService } from 'src/app/core/services/data/familiars-data.service';
import { ActivityGainPropertiesService } from '../activity-gain-properties/activity-gain-properties.service';
import { ArmorPropertiesService } from '../armor-properties/armor-properties.service';
import { CharacterFeatsService } from '../character-feats/character-feats.service';
import { CreatureActivitiesService } from '../creature-activities/creature-activities.service';
import { CreatureConditionsService } from '../creature-conditions/creature-conditions.service';
import { CreatureEquipmentService } from '../creature-equipment/creature-equipment.service';
import { CreatureFeatsService } from '../creature-feats/creature-feats.service';
import { CharacterService } from 'src/app/services/character.service';

@Injectable({
    providedIn: 'root',
})
export class HintShowingObjectsService {

    constructor(
        private readonly _characterService: CharacterService,
        private readonly _traitsDataService: TraitsDataService,
        private readonly _conditionsDataService: ConditionsDataService,
        private readonly _creatureConditionsService: CreatureConditionsService,
        private readonly _familiarsDataService: FamiliarsDataService,
        private readonly _armorPropertiesService: ArmorPropertiesService,
        private readonly _activityGainPropertyService: ActivityGainPropertiesService,
        private readonly _creatureActivitiesService: CreatureActivitiesService,
        private readonly _characterFeatsService: CharacterFeatsService,
        private readonly _creatureFeatsService: CreatureFeatsService,
        private readonly _creatureEquipmentService: CreatureEquipmentService,
    ) { }

    public traitsShowingHintsOnThis(creature: Creature, name: string): Array<Trait> {
        if (!this._traitsDataService.stillLoading) {
            // Return all traits that are set to SHOW ON this named object and that are on any equipped equipment in your inventory.
            // Uses the itemsWithThisTrait() method of Trait that returns any equipment that has this trait.
            return this._traitsDataService.traits().filter(trait =>
                trait.hints.some(hint =>
                    hint.showon.split(',').some(showon =>
                        showon.trim().toLowerCase() === name.toLowerCase() ||
                        showon.trim().toLowerCase() === (`${ creature.type }:${ name }`).toLowerCase() ||
                        (
                            name.toLowerCase().includes('lore') &&
                            showon.trim().toLowerCase() === 'lore'
                        ),
                    ),
                )
                && !!trait.itemsWithThisTrait(creature).length,
            );
        } else {
            return [];
        }
    }

    public characterFeatsShowingHintsOnThis(objectName = 'all'): Array<Feat> {
        const character = this._characterService.character;

        return this._characterFeatsService.characterFeatsAndFeatures().filter(feat =>
            feat.hints.find(hint =>
                (hint.minLevel ? character.level >= hint.minLevel : true) &&
                hint.showon?.split(',').find(showon =>
                    objectName.toLowerCase() === 'all' ||
                    showon.trim().toLowerCase() === objectName.toLowerCase() ||
                    (
                        (
                            objectName.toLowerCase().includes('lore:') ||
                            objectName.toLowerCase().includes(' lore')
                        ) &&
                        showon.trim().toLowerCase() === 'lore'
                    ),
                ),
            ) && this._characterFeatsService.characterHasFeat(feat.name),
        );
    }

    public companionElementsShowingHintsOnThis(objectName = 'all'): Array<AnimalCompanionAncestry | AnimalCompanionSpecialization | Feat> {
        const character = this._characterService.character;
        const companion = this._characterService.companion;

        //Get showon elements from Companion Ancestry and Specialization
        return []
            .concat(
                [companion.class.ancestry]
                    .filter(ancestry =>
                        ancestry.hints
                            .find(hint =>
                                (hint.minLevel ? character.level >= hint.minLevel : true) &&
                                hint.showon?.split(',')
                                    .find(showon =>
                                        objectName === 'all' ||
                                        showon.trim().toLowerCase() === objectName.toLowerCase(),
                                    ),
                            ),
                    ),
            )
            .concat(
                companion.class.specializations
                    .filter(spec =>
                        spec.hints
                            .find(hint =>
                                (hint.minLevel ? character.level >= hint.minLevel : true) &&
                                hint.showon?.split(',')
                                    .find(showon =>
                                        objectName === 'all' ||
                                        showon.trim().toLowerCase() === objectName.toLowerCase(),
                                    ),
                            ),
                    ),
            )
            //Return any feats that include e.g. Companion:Athletics
            .concat(
                this.characterFeatsShowingHintsOnThis(`Companion:${ objectName }`),
            );
    }

    public familiarElementsShowingHintsOnThis(objectName = 'all'): Array<Feat> {
        const character = this._characterService.character;
        const familiar = this._characterService.familiar;

        //Get showon elements from Familiar Abilities
        return this._familiarsDataService.familiarAbilities().filter(feat =>
            feat.hints.find(hint =>
                (hint.minLevel ? character.level >= hint.minLevel : true) &&
                hint.showon?.split(',').find(showon =>
                    objectName.toLowerCase() === 'all' ||
                    showon.trim().toLowerCase() === objectName.toLowerCase() ||
                    (
                        (
                            objectName.toLowerCase().includes('lore:') ||
                            objectName.toLowerCase().includes(' lore')
                        ) &&
                        showon.trim().toLowerCase() === 'lore'
                    ),
                ),
            ) && this._creatureFeatsService.creatureHasFeat(feat, { creature: familiar }),
            //Return any feats that include e.g. Companion:Athletics
        )
            .concat(this.characterFeatsShowingHintsOnThis(`Familiar:${ objectName }`));
    }

    public creatureConditionsShowingHintsOnThis(creature: Creature, objectName = 'all'): Array<ConditionSet> {
        const character = this._characterService.character;

        return this._creatureConditionsService.currentCreatureConditions(creature)
            .filter(conditionGain => conditionGain.apply)
            .map(conditionGain =>
                Object.assign(
                    new ConditionSet(),
                    { gain: conditionGain, condition: this._conditionsDataService.conditionFromName(conditionGain.name) },
                ),
            )
            .filter(conditionSet =>
                conditionSet.condition?.hints.find(hint =>
                    (hint.minLevel ? character.level >= hint.minLevel : true) &&
                    hint.showon?.split(',').find(showon =>
                        objectName.trim().toLowerCase() === 'all' ||
                        showon.trim().toLowerCase() === objectName.toLowerCase() ||
                        (
                            (
                                objectName.toLowerCase().includes('lore:') ||
                                objectName.toLowerCase().includes(' lore')
                            ) &&
                            showon.trim().toLowerCase() === 'lore'
                        ),
                    ),
                ),
            );
    }

    public creatureActivitiesShowingHintsOnThis(creature: Creature, objectName = 'all'): Array<Activity> {
        return this._creatureActivitiesService.creatureOwnedActivities(creature)
            //Conflate ActivityGains and their respective Activities into one object...
            .map(gain => ({ gain, activity: this._activityGainPropertyService.originalActivity(gain) }))
            //...so that we can find the activities where the gain is active or the activity doesn't need to be toggled...
            .filter((gainAndActivity: { gain: ActivityGain | ItemActivity; activity: Activity }) =>
                gainAndActivity.activity &&
                (
                    gainAndActivity.gain.active || !gainAndActivity.activity.toggle
                ),
            )
            //...and then keep only the activities.
            .map((gainAndActivity: { gain: ActivityGain | ItemActivity; activity: Activity }) => gainAndActivity.activity)
            .filter(activity =>
                activity?.hints.find(hint =>
                    hint.showon?.split(',').find(showon =>
                        objectName.trim().toLowerCase() === 'all' ||
                        showon.trim().toLowerCase() === objectName.toLowerCase() ||
                        (
                            (
                                objectName.toLowerCase().includes('lore:') ||
                                objectName.toLowerCase().includes(' lore')
                            ) &&
                            showon.trim().toLowerCase() === 'lore'
                        ),
                    ),
                ),
            );
    }

    public creatureItemsShowingHintsOnThis(creature: Creature, objectName = 'all'): Array<HintShowingItem> {
        const returnedItems: Array<HintShowingItem> = [];

        //Prepare function to add items whose hints match the objectName.
        const addItemIfHintsMatch = (item: HintShowingItem, allowResonant: boolean): void => {
            if (item.hints
                .some(hint =>
                    (allowResonant || !hint.resonant) &&
                    hint.showon?.split(',').find(showon =>
                        objectName.trim().toLowerCase() === 'all' ||
                        showon.trim().toLowerCase() === objectName.toLowerCase() ||
                        (
                            objectName.toLowerCase().includes('lore') &&
                            showon.trim().toLowerCase() === 'lore'
                        ) ||
                        (
                            //Show Emblazon Energy or Emblazon Antimagic Shield Block hint on Shield Block if the shield's blessing applies.
                            item instanceof Shield && item.emblazonArmament.length &&
                            (
                                (
                                    item.$emblazonEnergy &&
                                    objectName === 'Shield Block' &&
                                    showon === 'Emblazon Energy Shield Block'
                                ) || (
                                    item.$emblazonAntimagic &&
                                    objectName === 'Shield Block' &&
                                    showon === 'Emblazon Antimagic Shield Block'
                                )
                            )
                        ),
                    ),
                )
            ) {
                returnedItems.push(item);
            }
        };

        const hasTooManySlottedAeonStones = this._creatureEquipmentService.hasTooManySlottedAeonStones(creature);

        creature.inventories.forEach(inventory => {
            inventory.allEquipment()
                .filter(item =>
                    (item.equippable ? item.equipped : true) &&
                    item.amount &&
                    !item.broken &&
                    (item.canInvest() ? item.invested : true),
                )
                .forEach(item => {
                    addItemIfHintsMatch(item, false);
                    item.oilsApplied.forEach(oil => {
                        addItemIfHintsMatch(oil, false);
                    });

                    if (!hasTooManySlottedAeonStones && item instanceof WornItem) {
                        item.aeonStones.forEach(stone => {
                            addItemIfHintsMatch(stone, true);
                        });
                    }

                    if ((item instanceof Weapon || (item instanceof WornItem && item.isHandwrapsOfMightyBlows)) && item.propertyRunes) {
                        item.propertyRunes.forEach(rune => {
                            addItemIfHintsMatch(rune as WeaponRune, false);
                        });
                    }

                    if (item instanceof Armor && item.propertyRunes) {
                        (item as Equipment).propertyRunes.forEach(rune => {
                            addItemIfHintsMatch(rune as ArmorRune, false);
                        });
                    }

                    if (item instanceof Equipment && item.moddable && item.material) {
                        item.material.forEach(material => {
                            addItemIfHintsMatch(material, false);
                        });
                    }
                });
        });

        return returnedItems;
    }

    public creatureArmorSpecializationsShowingHintsOnThis(creature: Creature, objectName = 'all'): Array<Specialization> {
        if (creature.isCharacter()) {
            const equippedArmor = creature.inventories[0].armors.find(armor => armor.equipped);

            return equippedArmor
                ? this._armorPropertiesService
                    .armorSpecializations(equippedArmor, creature)
                    .filter(spec =>
                        spec?.hints
                            .find(hint =>
                                hint.showon.split(',')
                                    .find(showon =>
                                        objectName.trim().toLowerCase() === 'all' ||
                                        showon.trim().toLowerCase() === objectName.toLowerCase() ||
                                        (
                                            (
                                                objectName.toLowerCase().includes('lore:') ||
                                                objectName.toLowerCase().includes(' lore')
                                            ) &&
                                            showon.trim().toLowerCase() === 'lore'
                                        ),
                                    ),
                            ),
                    )
                : [];
        } else {
            return [];
        }
    }

}
