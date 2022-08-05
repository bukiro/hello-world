import { CharacterService } from 'src/app/services/character.service';
import { Equipment } from 'src/app/classes/Equipment';
import { WeaponRune } from 'src/app/classes/WeaponRune';
import { Character } from 'src/app/classes/Character';
import { AlchemicalPoison } from 'src/app/classes/AlchemicalPoison';
import { ProficiencyChange } from 'src/app/classes/ProficiencyChange';
import { Creature } from 'src/app/classes/Creature';
import { ItemsService } from 'src/app/services/items.service';
import { TypeService } from 'src/app/services/type.service';
import { WeaponMaterial } from 'src/app/classes/WeaponMaterial';
import { Item } from './Item';
import { DiceSizes } from 'src/libs/shared/definitions/diceSizes';
import { WeaponProficiencies } from 'src/libs/shared/definitions/weaponProficiencies';
import { BasicRuneLevels } from 'src/libs/shared/definitions/basicRuneLevels';
import { Familiar } from './Familiar';
import { ShoddyPenalties } from 'src/libs/shared/definitions/shoddyPenalties';
import { StrikingTitleFromLevel } from 'src/libs/shared/util/runeUtils';

interface EmblazonArmamentSet {
    type: string;
    choice: string;
    deity: string;
    alignment: string;
    emblazonDivinity: boolean;
    source: string;
}

export class Weapon extends Equipment {
    //Weapons should be type "weapons" to be found in the database
    public type = 'weapons';
    //Weapons are usually moddable.
    public moddable = true;
    /** What type of ammo is used? (Bolts, arrows...) */
    public ammunition = '';
    /** What happens on a critical hit with this weapon? */
    public criticalHint = '';
    /** Number of dice for Damage: usually 1 for an unmodified weapon. Use 0 to notate exactly <dicesize> damage (e.g. 1 damage = 0d1). */
    public dicenum = 1;
    /** Size of the damage dice: usually 4-12, but can be 0, 1, etc. */
    public dicesize = DiceSizes.D6;
    /** What is the damage type? Usually S, B or P, but may include combinations". */
    public dmgType = '';
    /** Some weapons add additional damage like +1d4F. Use get_ExtraDamage() to read. */
    public readonly extraDamage = '';
    /** The weapon group, needed for critical specialization effects. */
    public group = '';
    /** How many hands are needed to wield this weapon? */
    public hands = '';
    /** Melee range in ft: 5 or 10 for weapons with Reach trait. */
    public melee = 0;
    /** Store any poisons applied to this item. There should be only one poison at a time. */
    public poisonsApplied: Array<AlchemicalPoison> = [];
    /**
     * What proficiency is used? "Simple Weapons", "Unarmed Attacks", etc.?
     * Use get_Proficiency() to get the proficiency for numbers and effects.
     */
    public prof: WeaponProficiencies = WeaponProficiencies.Simple;
    /**
     * Ranged range in ft - also add for thrown weapons.
     * Weapons can have a melee and a ranged value, e.g. Daggers that can thrown.
     */
    public ranged = 0;
    /** How many actions to reload this ranged weapon? */
    public reload = '';
    /** What kind of weapon is this based on? Needed for weapon proficiencies for specific magical items. */
    public weaponBase = '';
    /** Giant Instinct Barbarians can wield larger weapons. */
    public large = false;
    /** A Champion with the Divine Ally: Blade Ally Feat can designate one weapon or handwraps as his blade ally. */
    public bladeAlly = false;
    /** A Dwarf with the Battleforger feat can sharpen a weapon to grant the effect of a +1 potency rune. */
    public battleforged = false;
    /**
     * A Cleric with the Emblazon Armament feat can give a bonus to a shield or weapon that only works for followers of the same deity.
     * Subsequent feats can change options and restrictions of the functionality.
     */
    public emblazonArmament: Array<EmblazonArmamentSet> = [];
    public $emblazonArmament = false;
    public $emblazonEnergy = false;
    public $emblazonAntimagic = false;
    /** Dexterity-based melee attacks force you to use dexterity for your attack modifier. */
    public dexterityBased = false;
    /** If useHighestAttackProficiency is true, the proficiency level will be copied from your highest unarmed or weapon proficiency. */
    public useHighestAttackProficiency = false;
    public $traits: Array<string> = [];
    /** Shoddy weapons take a -2 penalty to attacks. */
    public $shoddy: ShoddyPenalties = ShoddyPenalties.NotShoddy;

    public readonly secondaryRuneTitleFunction: ((secondary: number) => string) = StrikingTitleFromLevel;

    public get secondaryRune(): BasicRuneLevels {
        return this.strikingRune;
    }

    public set secondaryRune(value: BasicRuneLevels) {
        this.strikingRune = value;
    }

    public recast(itemsService: ItemsService): Weapon {
        super.recast(itemsService);
        this.poisonsApplied =
            this.poisonsApplied.map(obj =>
                Object.assign<AlchemicalPoison, Item>(
                    new AlchemicalPoison(),
                    TypeService.restoreItem(obj, itemsService),
                ).recast(itemsService));
        this.material = this.material.map(obj => Object.assign(new WeaponMaterial(), obj).recast());
        this.propertyRunes =
            this.propertyRunes.map(obj => Object.assign<WeaponRune, Item>(
                new WeaponRune(),
                TypeService.restoreItem(obj, itemsService),
            ).recast(itemsService));

        return this;
    }

    public isWeapon(): this is Weapon { return true; }

    public title(options: { itemStore?: boolean; preparedProficiency?: string } = {}): string {
        const proficiency = (options.itemStore || !options.preparedProficiency) ? this.prof : options.preparedProficiency;

        return [
            proficiency.split(' ')[0],
            this.group,
        ].filter(part => part)
            .join(' ');
    }

    public effectivePrice(itemsService: ItemsService): number {
        let price = this.price;

        if (this.moddable) {
            if (this.potencyRune) {
                price += itemsService.cleanItems().weaponrunes.find(rune => rune.potency === this.potencyRune).price;
            }

            if (this.strikingRune) {
                price += itemsService.cleanItems().weaponrunes.find(rune => rune.striking === this.strikingRune).price;
            }

            this.propertyRunes.forEach(rune => {
                if (rune) {
                    // Due to orichalcum's temporal properties,
                    // etching the speed weapon property rune onto an orichalcum weapon costs half the normal Price.
                    const half = .5;

                    if (rune.name === 'Speed' && this.material?.[0]?.name.includes('Orichalcum')) {
                        price += Math.floor(rune.price * half);
                    } else {
                        price += rune.price;
                    }
                }
            });

            this.material.forEach(mat => {
                price += mat.price;

                if (parseInt(this.bulk, 10)) {
                    price += (mat.bulkPrice * parseInt(this.bulk, 10));
                }
            });
        }

        price += this.talismans.reduce((prev, next) => prev + next.price, 0);

        return price;
    }

    public effectiveProficiency(
        creature: Creature,
        characterService: CharacterService,
        charLevel: number = characterService.character.level,
    ): string {
        let proficiency = this.prof;
        // Some feats allow you to apply another proficiency to certain weapons, e.g.:
        // "For the purpose of determining your proficiency,
        // martial goblin weapons are simple weapons and advanced goblin weapons are martial weapons."
        const proficiencyChanges: Array<ProficiencyChange> = [];

        if (creature instanceof Familiar) {
            return '';
        }

        if (creature instanceof Character) {
            characterService.characterFeatsAndFeatures()
                .filter(feat => feat.changeProficiency.length && feat.have({ creature }, { characterService }, { charLevel }))
                .forEach(feat => {
                    proficiencyChanges.push(...feat.changeProficiency.filter(change =>
                        (!change.name || this.name.toLowerCase() === change.name.toLowerCase()) &&
                        (!change.trait || this.traits.some(trait => change.trait.includes(trait))) &&
                        (!change.proficiency || (this.prof && change.proficiency === this.prof)) &&
                        (!change.group || (this.group && change.group === this.group)),
                    ));
                });

            const proficiencies: Array<string> = proficiencyChanges.map(change => change.result);

            //Set the resulting proficiency to the best result by setting it in order of worst to best.
            if (proficiencies.includes(WeaponProficiencies.Advanced)) {
                proficiency = WeaponProficiencies.Advanced;
            }

            if (proficiencies.includes(WeaponProficiencies.Martial)) {
                proficiency = WeaponProficiencies.Martial;
            }

            if (proficiencies.includes(WeaponProficiencies.Simple)) {
                proficiency = WeaponProficiencies.Simple;
            }

            if (proficiencies.includes(WeaponProficiencies.Unarmed)) {
                proficiency = WeaponProficiencies.Unarmed;
            }
        }

        return proficiency;
    }

    public hasProficiencyChanged(currentProficiency: string): boolean {
        return currentProficiency !== this.prof;
    }

    protected _secondaryRuneName(): string {
        return this.secondaryRuneTitleFunction(this.effectiveStriking());
    }

    protected _bladeAllyName(): Array<string> {
        const words: Array<string> = [];

        if (this.bladeAlly) {
            this.bladeAllyRunes.forEach(rune => {
                let name: string = rune.name;

                if (rune.name.includes('(Greater)')) {
                    name = `Greater ${ rune.name.substring(0, rune.name.indexOf('(Greater)')) }`;
                } else if (rune.name.includes(', Greater)')) {
                    name = `Greater ${ rune.name.substring(0, rune.name.indexOf(', Greater)')) })`;
                }

                words.push(name);
            });
        }

        return words;
    }

}
