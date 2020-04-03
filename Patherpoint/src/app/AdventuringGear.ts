import { Equipment } from './Equipment';

export class AdventuringGear extends Equipment {
    //Adventuring Gear should be type "adventuringgear" to be found in the database
    public type: string = "adventuringgear";
    //Some Items get bought in stacks. Stack defines how many you buy at once,
    //and how many make up one instance of the items Bulk.
    public stack: number = 1;
    //How is this item used/worn/applied? Example: held in 1 hand
    public usage: string = "";
    //How many hands need to be free to use this item?
    public hands: string = "";
    //Adventuring Gear can usually not be equipped or invested, but with exceptions.
    public equippable: boolean = false;
    //Does this weapon count for the "Armored Skirt" functionality?
    public isArmoredSkirt: boolean = false;
}