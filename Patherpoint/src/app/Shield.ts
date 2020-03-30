import { Item } from './Item'
import { ActivityGain } from './ActivityGain';
import { ItemGain } from './ItemGain';
import { EffectGain } from './EffectGain';

export class Shield implements Item {
    public notes: string = "";
    public desc: string = "";
    public name: string = "";
    public level: number = 0;
    public price: number = 0;
    public displayName: string = "";
    public showNotes: boolean = false;
    public showName: boolean = false;
    public raised: boolean = false;
    public takingCover: boolean = false;
    public type: string = "shields";
    public bulk: string = "";
    public hide: boolean = false;
    public equippable: boolean = true;
    public equip: boolean = false;
    public invested: boolean = false;
    public speedpenalty: number = 0;
    public acbonus: number = 0;
    public coverbonus: number = 0;
    public traits: string[] = [];
    public material: string = "";
    public showon: string = "";
    public hint: string = "";
    public gainActivity: string[] = [];
    public gainItems: ItemGain[] = [];
    public effects: EffectGain[] = [];
    public specialEffects: EffectGain[] = [];
    get_Name() {
        if (this.displayName.length) {
            return this.displayName;
        } else {
            return this.name;
        }
    }
}