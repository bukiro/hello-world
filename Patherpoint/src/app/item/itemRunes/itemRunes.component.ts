import { Component, OnInit, Input } from '@angular/core';
import { CharacterService } from 'src/app/character.service';
import { ItemsService } from 'src/app/items.service';
import { WeaponRune } from 'src/app/WeaponRune';
import { Equipment } from 'src/app/Equipment';
import { LoreChoice } from 'src/app/LoreChoice';
import { Rune } from 'src/app/Rune';
import { ArmorRune } from 'src/app/ArmorRune';
import { ItemCollection } from 'src/app/ItemCollection';
import { WornItem } from 'src/app/WornItem';
import { Weapon } from 'src/app/Weapon';
import { TimeService } from 'src/app/time.service';

@Component({
    selector: 'app-itemRunes',
    templateUrl: './itemRunes.component.html',
    styleUrls: ['./itemRunes.component.css']
})
export class ItemRunesComponent implements OnInit {

    @Input()
    item: Equipment;
    @Input()
    itemStore: boolean = false;

    public newPropertyRune: { rune: Rune, inv: ItemCollection, disabled?: boolean }[];
    public inventories: string[] = [];

    constructor(
        public characterService: CharacterService,
        private itemsService: ItemsService,
        private timeService: TimeService
    ) { }

    trackByIndex(index: number, obj: any): any {
        return index;
    }

    get_Character() {
        return this.characterService.get_Character();
    }

    get_CleanItems() {
        return this.itemsService.get_CleanItems();
    }

    get_WeaponPotencyRunes() {
        if (this.itemStore) {
            return [0].concat(this.get_CleanItems().weaponrunes.filter(rune => rune.potency > 0).map(rune => rune.potency));
        } else {
            let runes: number[] = [0, this.item.potencyRune];
            this.get_Character().inventories.forEach(inv => {
                runes.push(...inv.weaponrunes.filter(rune => rune.potency > 0).map(rune => rune.potency));
            })
            return Array.from(new Set(runes));
        }
    }

    get_ArmorPotencyRunes() {
        if (this.itemStore) {
            return [0].concat(this.get_CleanItems().armorrunes.filter(rune => rune.potency > 0).map(rune => rune.potency));
        } else {
            let runes: number[] = [0, this.item.potencyRune];
            this.get_Character().inventories.forEach(inv => {
                runes.push(...inv.armorrunes.filter(rune => rune.potency > 0).map(rune => rune.potency));
            })
            return Array.from(new Set(runes));
        }
    }

    get_StrikingRunes() {
        if (this.itemStore) {
            return [0].concat(this.get_CleanItems().weaponrunes.filter(rune => rune.striking > 0 && rune.striking <= this.item.potencyRune).map(rune => rune.striking));
        } else {
            let runes: number[] = [0, this.item.strikingRune];
            this.get_Character().inventories.forEach(inv => {
                runes.push(...inv.weaponrunes.filter(rune => rune.striking > 0 && rune.striking <= this.item.potencyRune).map(rune => rune.striking));
            })
            return Array.from(new Set(runes));
        }
    }

    get_ResilientRunes() {
        if (this.itemStore) {
            return [0].concat(this.get_CleanItems().armorrunes.filter(rune => rune.resilient > 0 && rune.resilient <= this.item.potencyRune).map(rune => rune.resilient));
        } else {
            let runes: number[] = [0, this.item.resilientRune];
            this.get_Character().inventories.forEach(inv => {
                runes.push(...inv.armorrunes.filter(rune => rune.resilient > 0 && rune.resilient <= this.item.potencyRune).map(rune => rune.resilient));
            })
            return Array.from(new Set(runes));
        }
    }

    get_PropertyRunes() {
        let indexes: number[] = [];
        //For each rune with the Saggorak trait, provide one less field.
        let saggorak = this.item.propertyRunes.filter(rune => rune.traits.includes("Saggorak")).length
        for (let index = 0; index < this.item.potencyRune - saggorak; index++) {
            indexes.push(index);
        }
        return indexes;
    }

    get_RuneCooldown(rune: Rune) {
        //If any activity on this rune has a cooldown, return the lowest of these in a human readable format.
        if (rune.activities && rune.activities.length && rune.activities.filter(activity => activity.activeCooldown).length) {
            let lowestCooldown = Math.min(...rune.activities.filter(activity => activity.activeCooldown).map(activity => activity.activeCooldown));
            return " (Cooldown "+this.timeService.get_Duration(lowestCooldown)+")";
        } else {
            return "";
        }
    }

    get_Inventories() {
        if (this.itemStore) {
            return [this.get_CleanItems()];
        } else {
            return this.get_Character().inventories;
        }
    }

    get_InitialPropertyRunes(index: number) {
        let weapon = this.item;
        //Start with one empty rune to select nothing.
        let allRunes: { rune: Rune, inv: ItemCollection, disabled?: boolean }[] = [{ rune: new WeaponRune(), inv: null }];
        allRunes[0].rune.name = "";
        //Add the current choice, if the item has a rune at that index.
        if (weapon.propertyRunes[index]) {
            allRunes.push(this.newPropertyRune[index] as { rune: WeaponRune, inv: ItemCollection });
        }
        return allRunes;
    }

    get_WeaponPropertyRunes(index: number, inv: ItemCollection) {
        let weapon = this.item;
        //In the case of Handwraps of Mighty Blows, we need to compare the rune's requirements with the Fist weapon, but its potency rune requirements with the Handwraps.
        //For this purpose, we use two different "weapon"s.
        let weapon2 = this.item;
        if ((weapon as WornItem).isHandwrapsOfMightyBlows) {
            weapon2 = this.get_CleanItems().weapons.filter(weapon => weapon.name == "Fist")[0];
        }
        let allRunes: { rune: Rune, inv: ItemCollection, disabled?: boolean }[] = [];
        //Add all runes either from the item store or from the inventories.
        if (this.itemStore) {
            inv.weaponrunes.forEach(rune => {
                allRunes.push({ rune: rune, inv: null });
            });
        } else {
            inv.weaponrunes.forEach(rune => {
                allRunes.push({ rune: rune, inv: inv });
            });
        }
        //Set all runes to disabled that have the same name as any that is already equipped.
        allRunes.forEach((rune: { rune: WeaponRune, inv: ItemCollection, disabled?: boolean }) => {
            if (weapon.propertyRunes
                .map(propertyRune => propertyRune.name)
                .includes(rune.rune.name)) {
                rune.disabled = true;
            }
        });
        //Filter all runes whose requirements are not met.
        return allRunes
            .filter((rune: { rune: WeaponRune, inv: ItemCollection, disabled?: boolean }, $index) =>
                //Don't show potency and striking runes.
                !rune.rune.potency &&
                !rune.rune.striking &&
                (
                    //Show runes that can only be applied to this item (by name).
                    rune.rune.namereq ?
                        weapon2.name == rune.rune.namereq
                        : true
                ) && (
                    //Don't show runes whose opposite runes are equipped.
                    rune.rune.runeblock ?
                        !weapon.propertyRunes
                            .map(propertyRune => propertyRune.name)
                            .includes(rune.rune.runeblock)
                        : true
                ) && (
                    //Show runes that require a trait if that trait is present on the weapon.
                    rune.rune.traitreq ?
                        weapon2.traits
                            .filter(trait => trait.includes(rune.rune.traitreq)).length
                        : true
                ) && (
                    //Show runes that require a range if the weapon has a value for that range.
                    rune.rune.rangereq ?
                        weapon2[rune.rune.rangereq] > 0
                        : true
                ) && (
                    //Show runes that require a damage type if the weapon's dmgType contains either of the letters in the requirement.
                    rune.rune.damagereq ?
                        (
                            (weapon2 as Weapon).dmgType &&
                            (
                                rune.rune.damagereq.split("")
                                    .filter(req => (weapon2 as Weapon).dmgType.includes(req)).length ||
                                (weapon2 as Weapon).dmgType == "modular"
                            )
                        )
                        : true
                ) && (
                    //Show Saggorak runes only if there are 2 rune slots available,
                    //  or if one is available and this slot is taken (so you can replace the rune in this slot).
                    rune.rune.traits.includes("Saggorak") ?
                        (
                            weapon.freePropertyRunes > 1 ||
                            (
                                weapon.propertyRunes[index] &&
                                weapon.freePropertyRunes == 1
                            ) ||
                            (
                                weapon.propertyRunes[index] &&
                                $index == 1
                            )
                        )
                        : true
                )
            );
    }

    on_WeaponRuneChange(runeType: string, previousRune: number) {
        let weapon: Equipment = this.item;
        switch (runeType) {
            case "potency":
                //If the rune has changed, the old one needs to be added to the inventory, and the new one needs to be removed from the inventory
                //If a stack exists, change the amount instead.
                //Don't do any of that if we're in the item store instead of the inventory.
                if (!this.itemStore && previousRune != weapon.potencyRune) {
                    if (previousRune > 0) {
                        let extractedRune: WeaponRune = this.get_CleanItems().weaponrunes.filter(rune => rune.potency == previousRune)[0];
                        this.characterService.grant_InventoryItem(this.get_Character(), this.get_Character().inventories[0], extractedRune, false, false, false, 1);
                    }
                    if (weapon.potencyRune > 0) {
                        let insertedRune: WeaponRune = this.get_Character().inventories[0].weaponrunes.filter(rune => rune.potency == weapon.potencyRune)[0];
                        this.characterService.drop_InventoryItem(this.get_Character(), this.get_Character().inventories[0], insertedRune, false, false, false, 1);
                    }
                }
                //If the potency rune has been lowered and the striking rune has become invalid, throw out the striking rune
                if (weapon.potencyRune < weapon.strikingRune) {
                    let oldStriking: number = weapon.strikingRune;
                    weapon.strikingRune = 0;
                    this.on_WeaponRuneChange("striking", oldStriking);
                }
                //As long as there are more property Runes assigned than allowed, throw out the last property rune
                while (weapon.freePropertyRunes < 0) {
                    if (!this.itemStore) {
                        this.remove_WeaponPropertyRune(weapon.propertyRunes.length - 1);
                    }
                    weapon.propertyRunes.splice(weapon.propertyRunes.length - 1, 1);
                }
                break;
            case "striking":
                //If the rune has changed, the old one needs to be added to the inventory, and the new one needs to be removed from the inventory
                //If a stack exists, change the amount instead.
                //Don't do any of that if we're in the item store instead of the inventory.
                if (!this.itemStore && previousRune != weapon.strikingRune) {
                    if (previousRune > 0) {
                        let extractedRune: WeaponRune = this.get_CleanItems().weaponrunes.filter(rune => rune.striking == previousRune)[0];
                        this.characterService.grant_InventoryItem(this.get_Character(), this.get_Character().inventories[0], extractedRune, false, false, false, 1);
                    }
                    if (weapon.strikingRune > 0) {
                        let insertedRune: WeaponRune = this.get_Character().inventories[0].weaponrunes.filter(rune => rune.striking == weapon.strikingRune)[0];
                        this.characterService.drop_InventoryItem(this.get_Character(), this.get_Character().inventories[0], insertedRune, false, false, false, 1);
                    }
                }
                break;
        }
        this.characterService.set_Changed();
    }

    on_ArmorRuneChange(runeType: string, previousRune: number) {
        let armor: Equipment = this.item;
        switch (runeType) {
            case "potency":
                //If the rune has changed, the old one needs to be added to the inventory, and the new one needs to be removed from the inventory
                //If a stack exists, change the amount instead.
                //Don't do any of that if we're in the item store instead of the inventory.
                if (!this.itemStore && previousRune != armor.potencyRune) {
                    if (previousRune > 0) {
                        let extractedRune: ArmorRune = this.get_CleanItems().armorrunes.filter(rune => rune.potency == previousRune)[0];
                        this.characterService.grant_InventoryItem(this.get_Character(), this.get_Character().inventories[0], extractedRune, false, false, false, 1);
                    }
                    if (armor.potencyRune > 0) {
                        let insertedRune: ArmorRune = this.get_Character().inventories[0].armorrunes.filter(rune => rune.potency == armor.potencyRune)[0];
                        this.characterService.drop_InventoryItem(this.get_Character(), this.get_Character().inventories[0], insertedRune, false, false, false, 1);
                    }
                }
                //If the potency rune has been lowered and the resilient rune has become invalid, throw out the resilient rune
                if (armor.potencyRune < armor.resilientRune) {
                    let oldResilient: number = armor.resilientRune;
                    armor.resilientRune = 0;
                    this.on_ArmorRuneChange("resilient", oldResilient);
                }
                //As long as there are more property Runes assigned than allowed, throw out the last property rune
                while (armor.freePropertyRunes < 0) {
                    if (!this.itemStore) {
                        this.remove_ArmorPropertyRune(armor.propertyRunes.length - 1);
                    }
                    armor.propertyRunes.splice(armor.propertyRunes.length - 1, 1);
                }
                break;
            case "resilient":
                //If the rune has changed, the old one needs to be added to the inventory, and the new one needs to be removed from the inventory
                //If a stack exists, change the amount instead.
                //Don't do any of that if we're in the item store instead of the inventory.
                if (!this.itemStore && previousRune != armor.resilientRune) {
                    if (previousRune > 0) {
                        let extractedRune: ArmorRune = this.get_CleanItems().armorrunes.filter(rune => rune.resilient == previousRune)[0];
                        this.characterService.grant_InventoryItem(this.get_Character(), this.get_Character().inventories[0], extractedRune, false, false, false, 1);
                    }
                    if (armor.resilientRune > 0) {
                        let insertedRune: ArmorRune = this.get_Character().inventories[0].armorrunes.filter(rune => rune.resilient == armor.resilientRune)[0];
                        this.characterService.drop_InventoryItem(this.get_Character(), this.get_Character().inventories[0], insertedRune, false, false, false, 1);
                    }
                }
                break;
        }
        this.characterService.set_Changed();
    }

    add_WeaponPropertyRune(index: number) {
        let weapon = this.item;
        let rune = this.newPropertyRune[index].rune;
        let inv = this.newPropertyRune[index].inv;
        if (!weapon.propertyRunes[index] || rune !== weapon.propertyRunes[index]) {
            //If there is a rune in this slot, return the old rune to the inventory, unless we are in the item store. Then remove it from the item.
            if (weapon.propertyRunes[index]) {
                if (!this.itemStore) {
                    this.remove_WeaponPropertyRune(index);
                }
                weapon.propertyRunes.splice(index, 1);
            }
            //Then add the new rune to the item and (unless we are in the item store) remove it from the inventory.
            if (rune.name != "") {
                //Add a copy of the rune to the item
                let newLength = weapon.propertyRunes.push(Object.assign(new WeaponRune, JSON.parse(JSON.stringify(rune))));
                weapon.propertyRunes[newLength - 1] = this.characterService.reassign(weapon.propertyRunes[newLength - 1]);
                let newRune = weapon.propertyRunes[newLength - 1];
                newRune.amount = 1;
                newRune.loreChoices = newRune.loreChoices.map(choice => Object.assign(new LoreChoice(), choice));
                //If we are not in the item store, remove the inserted rune from the inventory, either by decreasing the amount or by dropping the item.
                //Also add the rune's lore if needed.
                if (!this.itemStore) {
                    this.characterService.drop_InventoryItem(this.get_Character(), inv, rune, false, false, false, 1);
                    if ((weapon.propertyRunes[newLength - 1] as WeaponRune).loreChoices.length) {
                        this.characterService.add_RuneLore(weapon.propertyRunes[newLength - 1]);
                    }
                }
            }
        }
        this.set_PropertyRuneNames();
        this.characterService.set_Changed();
    }

    remove_WeaponPropertyRune(index: number) {
        let weapon: Equipment = this.item;
        let oldRune: Rune = weapon.propertyRunes[index];
        this.characterService.grant_InventoryItem(this.get_Character(), this.get_Character().inventories[0], oldRune, false, false, false, 1);
        //Remove the Ancestral Echoing Lore if applicable.
        if (oldRune.loreChoices.length) {
            this.characterService.remove_RuneLore(oldRune);
        }
    }

    add_ArmorPropertyRune(insertedRuneName: string, index: number) {

    }

    remove_ArmorPropertyRune(index: number) {

    }

    set_PropertyRuneNames() {
        this.newPropertyRune =
            (this.item.propertyRunes ? [
                (this.item.propertyRunes[0] ? { rune: this.item.propertyRunes[0], inv: null } : { rune: new Rune(), inv: null }),
                (this.item.propertyRunes[1] ? { rune: this.item.propertyRunes[1], inv: null } : { rune: new Rune(), inv: null }),
                (this.item.propertyRunes[2] ? { rune: this.item.propertyRunes[2], inv: null } : { rune: new Rune(), inv: null })
            ] : [{ rune: new Rune(), inv: null }, { rune: new Rune(), inv: null }, { rune: new Rune(), inv: null }])
        this.newPropertyRune.filter(rune => rune.rune.name == "New Item").forEach(rune => {
            rune.rune.name = "";
        });
    }

    ngOnInit() {
        this.set_PropertyRuneNames();
    }

}
