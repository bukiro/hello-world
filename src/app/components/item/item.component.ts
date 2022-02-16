import { Component, OnInit, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { TraitsService } from 'src/app/services/traits.service';
import { ActivitiesService } from 'src/app/services/activities.service';
import { CharacterService } from 'src/app/services/character.service';
import { ItemsService } from 'src/app/services/items.service';
import { SpellsService } from 'src/app/services/spells.service';
import { ConditionsService } from 'src/app/services/conditions.service';
import { RefreshService } from 'src/app/services/refresh.service';
import { AdventuringGear } from 'src/app/classes/AdventuringGear';
import { Item } from 'src/app/classes/Item';
import { Talisman } from 'src/app/classes/Talisman';
import { SpellGain } from 'src/app/classes/SpellGain';
import { AlchemicalPoison } from 'src/app/classes/AlchemicalPoison';
import { Weapon } from 'src/app/classes/Weapon';
import { Spell } from 'src/app/classes/Spell';
import { ConditionGain } from 'src/app/classes/ConditionGain';
import { Condition } from 'src/app/classes/Condition';
import { Equipment } from 'src/app/classes/Equipment';
import { RingOfWizardrySlot, WornItem } from 'src/app/classes/WornItem';
import { Shield } from 'src/app/classes/Shield';
import { Armor } from 'src/app/classes/Armor';
import { Subscription } from 'rxjs';
import { SpellCasting } from 'src/app/classes/SpellCasting';
import { SpellChoice } from 'src/app/classes/SpellChoice';
import { EffectGain } from 'src/app/classes/EffectGain';

@Component({
    selector: 'app-item',
    templateUrl: './item.component.html',
    styleUrls: ['./item.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemComponent implements OnInit, OnDestroy {

    @Input()
    creature: string = "Character";
    @Input()
    item;
    @Input()
    allowActivate: boolean = false;
    @Input()
    armoredSkirt: AdventuringGear;
    @Input()
    itemStore: boolean = false;
    @Input()
    isSubItem: boolean = false;

    constructor(
        private changeDetector: ChangeDetectorRef,
        private traitsService: TraitsService,
        private activitiesService: ActivitiesService,
        public characterService: CharacterService,
        private refreshService: RefreshService,
        private itemsService: ItemsService,
        private spellsService: SpellsService,
        private conditionsService: ConditionsService
    ) { }

    trackByIndex(index: number, obj: any): any {
        return index;
    }

    get_Creature(type: string = this.creature) {
        return this.characterService.get_Creature(type);
    }

    get_Character() {
        return this.characterService.get_Character();
    }

    get_Traits(name: string = "") {
        return this.traitsService.get_Traits(name);
    }

    get_Activities(name: string = "") {
        return this.activitiesService.get_Activities(name);
    }

    get_Spells(name: string = "", type: string = "", tradition: string = "") {
        return this.spellsService.get_Spells(name, type, tradition);
    }

    get_HaveMatchingTalismanCord(talisman: Talisman) {
        if (this.item instanceof Equipment) {
            return this.item.talismanCords?.some(cord => cord.level <= talisman.level && cord.data.some(data => talisman.traits.includes(data.value as string)));
        }
    }

    on_TalismanUse(talisman: Talisman, index: number, preserve: boolean = false) {
        this.characterService.on_ConsumableUse(this.get_Creature(), talisman, preserve);
        if (!preserve) {
            this.item.talismans.splice(index, 1)
        }
        if (this.item instanceof Armor || this.item instanceof Shield) {
            this.refreshService.set_ToChange(this.creature, "defense");
        }
        if (this.item instanceof Weapon) {
            this.refreshService.set_ToChange(this.creature, "attacks");
        }
        this.refreshService.process_ToChange();
    }

    on_PoisonUse(poison: AlchemicalPoison) {
        this.characterService.on_ConsumableUse(this.get_Creature(), poison);
        if (this.item instanceof Weapon) {
            this.item.poisonsApplied.length = 0;
            this.refreshService.set_ToChange(this.creature, "attacks");
        }
        this.refreshService.process_ToChange();
    }

    get_DoublingRingsOptions(ring: string) {
        switch (ring) {
            case "gold":
                return this.get_Creature().inventories[0].weapons.filter(weapon => weapon.melee && weapon.potencyRune);
            case "iron":
                return this.get_Creature().inventories[0].weapons.filter(weapon => weapon.melee);
        }
    }

    on_DoublingRingsChange() {
        this.refreshService.set_ToChange(this.creature, "inventory");
        let ironItem = this.get_DoublingRingsOptions("iron").find(weapon => weapon.id == this.item.data[0].value);
        if (ironItem && this.item.invested) {
            this.refreshService.set_ItemViewChanges(this.get_Creature(), ironItem, { characterService: this.characterService });
        }
        this.refreshService.process_ToChange();
    }

    get_RingOfWizardrySlotName(wizardrySlot: RingOfWizardrySlot) {
        const spellLevels = [
            "cantrip",
            "1st-level spell",
            "2nd-level spell",
            "3rd-level spell",
            "4th-level spell",
            "5th-level spell",
            "6th-level spell",
            "7th-level spell",
            "8th-level spell",
            "9th-level spell",
            "10th-level spell",
        ]
        return (wizardrySlot.tradition ? wizardrySlot.tradition + " " : "") + spellLevels[wizardrySlot.level] + " slot";
    }

    get_RingOfWizardryOptions(wizardrySlot: RingOfWizardrySlot): string[] {
        if (this.get_Character().class) {
            return ["no spellcasting selected"]
                .concat(this.get_Character().class?.spellCasting
                    .filter(casting =>
                        !["focus", "innate"].includes(casting.castingType.toLowerCase()) &&
                        (wizardrySlot.tradition ? casting.tradition.toLowerCase() == wizardrySlot.tradition.toLowerCase() : true)
                    )
                    .map(casting => casting.className + " " + casting.tradition + " " + casting.castingType + " Spells"));
        }
    }

    on_RingOfWizardryChange(wizardrySlot: RingOfWizardrySlot, wizardrySlotIndex: number) {
        //Remove any spellgain or effectgain that comes from this ring of wizardry slot.
        const item = this.item as WornItem;
        let spellGainFound = false;
        for (let index = 0; index < item.gainSpells.length; index++) {
            if (!spellGainFound && item.gainSpells[index].ringOfWizardry == (wizardrySlotIndex + 1)) {
                spellGainFound = true;
                item.gainSpells.splice(index, 1);
                break;
            }
        }
        let effectFound = false;
        for (let index = 0; index < item.effects.length; index++) {
            if (!effectFound && item.effects[index].source == "Ring of Wizardry Slot " + (wizardrySlotIndex + 1)) {
                effectFound = true;
                item.effects.splice(index, 1);
                break;
            }
        }
        //If a new spellcasting has been selected, either add a new spellgain or effectgain.
        if (item.data[wizardrySlotIndex].value != "no spellcasting selected") {
            const dataValue = (item.data[wizardrySlotIndex].value as string)
            const className = dataValue.split(" ")[0];
            const tradition = dataValue.split(" ")[1];
            const castingType = dataValue.split(" ")[2];
            if (castingType.toLowerCase() == "prepared") {
                let newSpellGain = new SpellChoice();
                newSpellGain.available = 1;
                newSpellGain.className = className;
                newSpellGain.castingType = "Prepared";
                newSpellGain.tradition = tradition;
                newSpellGain.level = wizardrySlot.level;
                newSpellGain.ringOfWizardry = (wizardrySlotIndex + 1);
                newSpellGain.source = item.name;
                item.gainSpells.push(newSpellGain)
                this.refreshService.set_ToChange("Character", "Spells");
            } else if (castingType.toLowerCase() == "spontaneous") {
                let newEffectGain = new EffectGain();
                newEffectGain.affected = className + " " + castingType + " Level " + wizardrySlot.level + " Spell Slots";
                newEffectGain.value = "1"
                newEffectGain.source = "Ring of Wizardry Slot " + (wizardrySlotIndex + 1);
                item.effects.push(newEffectGain);
                this.refreshService.set_ToChange("Character", "effects");
            }
        }
        this.refreshService.process_ToChange();
    }

    get_TalismanCordOptions(item: WornItem, index: number) {
        return [
            "no school attuned",
            "Abjuration",
            "Conjuration",
            "Divination",
            "Enchantment",
            "Evocation",
            "Illusion",
            "Necromancy",
            "Transmutation"
        ].filter(school => school == "no school attuned" || item.data[index].value == school || !item.data.some((data, dataIndex) => dataIndex <= item.isTalismanCord && data.value == school));
    }

    get_ItemSpell(item: Item) {
        if (item.storedSpells.length && item.storedSpells[0].spells.length) {
            let spell = this.get_Spells(item.storedSpells[0].spells[0].name)[0];
            if (spell) {
                return [spell];
            } else {
                return [];
            }
        } else {
            return [];
        }
    }

    get_StoredSpells(item: Item) {
        return item.storedSpells.filter(choice => choice.available || choice.dynamicAvailable);
    }

    get_StoredSpellsTaken(item: Item) {
        return item.storedSpells.filter(choice => choice.spells.length);
    }

    get_SpellConditions(spell: Spell, spellLevel: number, gain: SpellGain) {
        //For all conditions that are included with this spell on this level, create an effectChoice on the gain and set it to the default choice, if any. Add the name for later copyChoiceFrom actions.
        let conditionSets: { gain: ConditionGain, condition: Condition }[] = [];
        spell.get_HeightenedConditions(spellLevel)
            .map(conditionGain => { return { gain: conditionGain, condition: this.conditionsService.get_Conditions(conditionGain.name)[0] } })
            .forEach((conditionSet, index) => {
                //Create the temporary list of currently available choices.
                conditionSet.condition?.get_Choices(this.characterService, true, (conditionSet.gain.heightened ? conditionSet.gain.heightened : spellLevel));
                //Add the condition to the selection list. Conditions with no choices or with automatic choices will not be displayed.
                conditionSets.push(conditionSet);
                //Then if the gain doesn't have a choice at that index or the choice isn't among the condition's choices, insert or replace that choice on the gain.
                while (!gain.effectChoices.length || gain.effectChoices.length < index - 1) {
                    gain.effectChoices.push({ condition: conditionSet.condition.name, choice: conditionSet.condition.choice });
                }
                if (!conditionSet.condition._choices.includes(gain.effectChoices?.[index]?.choice)) {
                    gain.effectChoices[index] = { condition: conditionSet.condition.name, choice: conditionSet.condition.choice };
                }
            })
        return conditionSets;
    }

    on_SpellItemUse(item: Item) {
        let spellName = item.storedSpells[0]?.spells[0]?.name || "";
        let spellChoice = item.storedSpells[0];
        if (spellChoice && spellName) {
            let spell = this.get_Spells(item.storedSpells[0]?.spells[0]?.name)[0];
            let target = "";
            if (spell.target == "self") {
                target = "Character";
            }
            if (spell) {
                let tempGain: SpellGain = new SpellGain();
                this.spellsService.process_Spell(this.get_Creature("Character"), target, this.characterService, this.itemsService, this.characterService.conditionsService, null, null, tempGain, spell, spellChoice.level, true, true, false);
            }
            spellChoice.spells.shift();
        }
        this.refreshService.set_ToChange("Character", "spellchoices")
        this.refreshService.process_ToChange();
    }

    update_Item() {
        //This updates any gridicon that has this item's id set as its update id.
        this.refreshService.set_Changed(this.item.id);
    }

    finish_Loading() {
        if (this.item.id) {
            this.changeSubscription = this.refreshService.get_Changed
                .subscribe((target) => {
                    if (target == this.item.id) {
                        this.changeDetector.detectChanges();
                    }
                });
            this.viewChangeSubscription = this.refreshService.get_ViewChanged
                .subscribe((view) => {
                    if (view.target == this.item.id) {
                        this.changeDetector.detectChanges();
                    }
                });
        }
    }

    ngOnInit() {
        if (["weaponrunes", "armorrunes", "oils"].includes(this.item.type) && !this.isSubItem) {
            this.allowActivate = false;
        }
        this.finish_Loading();
    }

    private changeSubscription: Subscription;
    private viewChangeSubscription: Subscription;

    ngOnDestroy() {
        this.changeSubscription?.unsubscribe();
        this.viewChangeSubscription?.unsubscribe();
    }

}
