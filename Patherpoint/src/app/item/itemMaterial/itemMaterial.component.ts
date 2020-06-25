import { Component, OnInit, Input } from '@angular/core';
import { Weapon } from 'src/app/Weapon';
import { Armor } from 'src/app/Armor';
import { Shield } from 'src/app/Shield';
import { WeaponMaterial } from 'src/app/WeaponMaterial';
import { CharacterService } from 'src/app/character.service';
import { ItemsService } from 'src/app/items.service';
import { Material } from 'src/app/Material';

@Component({
    selector: 'app-itemMaterial',
    templateUrl: './itemMaterial.component.html',
    styleUrls: ['./itemMaterial.component.css']
})
export class ItemMaterialComponent implements OnInit {

    @Input()
    item: Weapon | Armor | Shield;
    @Input()
    craftingStation: boolean = false;

    public newWeaponMaterial: { material: Material, disabled?: boolean }[];
    public inventories: string[] = [];

    constructor(
        public characterService: CharacterService,
        private itemsService: ItemsService
    ) { }

    trackByIndex(index: number, obj: any): any {
        return index;
    }

    get_Character() {
        return this.characterService.get_Character();
    }

    get_InitialWeaponMaterials() {
        let weapon = this.item as Weapon;
        //Start with one empty rune to select nothing.
        let allWeaponMaterials: { material: WeaponMaterial, disabled?: boolean }[] = [{ material: new WeaponMaterial() }];
        allWeaponMaterials[0].material.name = "";
        //Add the current choice, if the item has a rune at that index.
        if (weapon.material[0]) {
            allWeaponMaterials.push(this.newWeaponMaterial[0] as { material: WeaponMaterial });
        }
        return allWeaponMaterials;
    }

    get_WeaponMaterials() {
        let weapon: Weapon = this.item as Weapon;
        let allWeaponMaterials: { material: WeaponMaterial, disabled?: boolean }[] = [];
        this.itemsService.get_WeaponMaterials().forEach(material => {
            allWeaponMaterials.push({ material: material });
        })
        //Set all materials to disabled that have the same name as any that is already equipped.
        allWeaponMaterials.forEach((material: { material: WeaponMaterial, disabled?: boolean }) => {
            if (weapon.material[0] && weapon.material[0].name == material.material.name) {
                material.disabled = true;
            }
        });
        let crafting = 0;
        if (this.craftingStation) {
            let character = this.get_Character();
            crafting = this.characterService.get_Skills(character, "Crafting")[0]?.level(character, this.characterService, character.level) || 0;
        }
        //Disable all materials whose requirements are not met.
        allWeaponMaterials.forEach(material => {
            if (
                (
                    //If you are crafting this item yourself, you must fulfill the crafting skill requirement.
                    !this.craftingStation ||
                    material.material.craftingRequirement <= crafting
                ) &&
                (
                    //You can't change to a material that doesn't support the currently equipped runes.
                    material.material.runeLimit ?
                        (
                            !this.item.propertyRunes.find(rune => rune.level > material.material.runeLimit) &&
                            (this.item.potencyRune == 1 ? material.material.runeLimit >= 2 : true) &&
                            (this.item.potencyRune == 2 ? material.material.runeLimit >= 10 : true) &&
                            (this.item.potencyRune == 3 ? material.material.runeLimit >= 16 : true) &&
                            (this.item.strikingRune == 1 ? material.material.runeLimit >= 4 : true) &&
                            (this.item.strikingRune == 2 ? material.material.runeLimit >= 12 : true) &&
                            (this.item.strikingRune == 3 ? material.material.runeLimit >= 19 : true)
                        )
                        : true
                )
            ) {
                material.disabled = false;
            } else {
                material.disabled = true;
            }
        });
        return allWeaponMaterials.sort(function (a, b) {
            if (a.material.name > b.material.name) {
                return 1;
            }
            if (a.material.name < b.material.name) {
                return -1;
            }
            return 0;
        }).sort((a, b) => a.material.level - b.material.level);
    }

    add_WeaponMaterial() {
        let weapon = this.item as Weapon;
        let material = this.newWeaponMaterial[0].material;
        if (!weapon.material[0] || material !== weapon.material[0]) {
            //If there is a material in this slot, remove the old material from the item.
            if (weapon.material[0]) {
                weapon.material.shift();
            }
            //Then add the new material to the item.
            if (material.name != "") {
                //Add a copy of the material to the item
                weapon.material.push(Object.assign(new WeaponMaterial, JSON.parse(JSON.stringify(material))));
            }
        }
        this.set_MaterialNames();
        this.characterService.process_ToChange();
    }

    set_MaterialNames() {
        if (this.item.constructor == Weapon) {
            let weapon = this.item as Weapon;
            this.newWeaponMaterial =
                (weapon.material ? [
                    (weapon.material[0] ? { material: weapon.material[0] } : { material: new WeaponMaterial() })
                ] : [{ material: new WeaponMaterial() }])
        }

    }

    ngOnInit() {
        this.set_MaterialNames();
    }

}