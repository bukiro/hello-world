import { v4 as uuidv4 } from 'uuid';
import { Weapon } from './Weapon';
import { Armor } from './Armor';
import { Shield } from './Shield';
import { WornItem } from './WornItem';
import { AlchemicalElixir } from './AlchemicalElixir';
import { Consumable } from './Consumable';
import { OtherConsumable } from './OtherConsumable';
import { HeldItem } from './HeldItem';
import { AdventuringGear } from './AdventuringGear';
import { Equipment } from './Equipment';
import { WeaponRune } from './WeaponRune';
import { ArmorRune } from './ArmorRune';
import { Potion } from './Potion';
import { OtherItem } from './OtherItem';
import { Item } from './Item';
import { Ammunition } from './Ammunition';
import { Scroll } from './Scroll';
import { CharacterService } from './character.service';
import { Oil } from './Oil';
import { Talisman } from './Talisman';
import { AlchemicalBomb } from './AlchemicalBomb';
import { AlchemicalTool } from './AlchemicalTool';
import { AlchemicalPoison } from './AlchemicalPoison';
import { Snare } from './Snare';
import { OtherConsumableBomb } from './OtherConsumableBomb';
import { Wand } from './Wand';

export class ItemCollection {
    public readonly _className: string = this.constructor.name;
    //This is the amount of bulk that can be ignored when weighing this inventory.
    public bulkReduction: number = 0;
    public id = uuidv4();
    //If an item grants an inventory, this is the item's ID.
    public itemId: string = "";
    public adventuringgear: AdventuringGear[] = [];
    public ammunition: Ammunition[] = [];
    public alchemicalelixirs: AlchemicalElixir[] = [];
    public armorrunes: ArmorRune[] = [];
    public armors: Armor[] = [];
    public helditems: HeldItem[] = [];
    public otherconsumables: OtherConsumable[] = [];
    public otherconsumablesbombs: OtherConsumableBomb[] = [];
    public otheritems: OtherItem[] = [];
    public potions: Potion[] = [];
    public shields: Shield[] = [];
    public weaponrunes: WeaponRune[] = [];
    public weapons: Weapon[] = [];
    public wornitems: WornItem[] = [];
    public scrolls: Scroll[] = [];
    public oils: Oil[] = [];
    public talismans: Talisman[] = [];
    public alchemicalbombs: AlchemicalBomb[] = [];
    public alchemicaltools: AlchemicalTool[] = [];
    public alchemicalpoisons: AlchemicalPoison[] = [];
    public snares: Snare[] = [];
    public wands: Wand[] = [];
    //You cannot add any items to an inventory that would break its bulk limit.
    constructor(public bulkLimit: number = 0) { };
    public readonly names: { name: string, key: string }[] = [
        { name: "Weapons", key: "weapons" },
        { name: "Armors", key: "armors" },
        { name: "Shields", key: "shields" },
        { name: "Alchemical Bombs", key: "alchemicalbombs" },
        { name: "Worn Items", key: "wornitems" },
        { name: "Held Items", key: "helditems" },
        { name: "Adventuring Gear", key: "adventuringgear" },
        { name: "Alchemical Tools", key: "alchemicaltools" },
        { name: "Weapon Runes", key: "weaponrunes" },
        { name: "Armor Runes", key: "armorrunes" },
        { name: "Scrolls", key: "scrolls" },
        { name: "Alchemical Elixirs", key: "alchemicalelixirs" },
        { name: "Potions", key: "potions" },
        { name: "Alchemical Poisons", key: "alchemicalpoisons" },
        { name: "Oils", key: "oils" },
        { name: "Talismans", key: "talismans" },
        { name: "Snares", key: "snares" },
        { name: "Ammunition", key: "ammunition" },
        { name: "Other Consumables", key: "otherconsumables" },
        { name: "Other Consumables (Bombs)", key: "otherconsumablesbombs" },
        { name: "Wands", key: "wands" }
    ]
    allEquipment() {
        return [].concat(this.adventuringgear, this.alchemicalbombs, this.otherconsumablesbombs, this.armors, this.helditems, this.shields, this.weapons, this.wornitems, this.wands);
        
    }
    allConsumables() {
        return [].concat(this.alchemicalelixirs, this.alchemicaltools, this.ammunition, this.oils, this.otherconsumables, this.potions, this.scrolls, this.talismans, this.snares, this.alchemicalpoisons);
    }
    allRunes() {
        return [].concat(this.armorrunes, this.weaponrunes);
    }
    allItems() {
        return [].concat(this.allConsumables(), this.allEquipment(), this.allRunes());
    }
    get_Bulk(rounded: boolean = true, reduced: boolean = false) {
        //All bulk gets calculated at *10 to avoid rounding issues with decimals,
        //Then returned at /10
        let sum: number = 0;
        function addup(item: Item | OtherItem) {
            let bulk = item instanceof OtherItem ? item.bulk : (item as Item).get_Bulk();
            if ((item as Equipment).carryingBulk && !(item as Equipment).equipped) {
                bulk = (item as Equipment).carryingBulk;
            }
            switch (bulk) {
                case "":
                    break;
                case "-":
                    break;
                case "L":
                    if (item.amount) {
                        sum += Math.floor(item.amount / ((item as Consumable).stack ? (item as Consumable).stack : 1));
                    } else {
                        sum += 1;
                    }
                    break;
                default:
                    if (item.amount) {
                        sum += parseInt(bulk) * 10 * Math.floor(item.amount / ((item as Consumable).stack ? (item as Consumable).stack : 1));
                    } else {
                        sum += parseInt(bulk) * 10;
                    }
                    break;
            }
        }
        this.allItems().forEach(item => {
            addup(item);
        })
        this.otheritems.forEach(item => {
            addup(item);
        })
        sum = Math.max(0, sum);
        //Either round to int, or else to 1 decimal
        if (rounded) {
            sum = Math.floor(sum / 10);
        } else {
            sum = Math.floor(sum) / 10;
        }
        if (reduced) {
            sum = Math.max(0, sum - this.bulkReduction);
        }
        return sum;
    }
    get_Name(characterService: CharacterService) {
        let name: string = ""
        if (!this.itemId) {
            characterService.get_Creatures().forEach(creature => {
                if (creature.type != "Familiar") {
                    if (creature.inventories[0] === this) {
                        name = creature.name || creature.type;
                    }
                    if (creature.inventories[1] === this) {
                        name = "Worn Tools";
                    }
                }
            })
        } else {
            characterService.get_Creatures().forEach(creature => {
                if (creature.type != "Familiar") {
                    if (creature.inventories.some(inventory => inventory === this)) {
                        creature.inventories.forEach(creatureInventory => {
                            let items = creatureInventory.allEquipment().filter(item => item.id == this.itemId);
                            if (items.length) {
                                name = items[0].get_Name();
                            }
                        });
                    }
                }
            })
        }
        return name;
    }
}
