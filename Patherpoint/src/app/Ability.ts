import { CharacterService } from './character.service';

export class Ability {
    public effects: string[] = [];
    constructor (
    public name: string = "",
    ) {}
    baseValue(characterService) {
        //Get baseValues from the character if they exist, otherwise 10
        let baseValue = characterService.get_Character().baseValues.filter(baseValue => baseValue.name == this.name)[0].value;
        return (baseValue) ? baseValue : 10;
    }
    value(characterService) {
    //Calculates the ability with all active effects
        //Get any boosts from the character and sum them up
        //Boosts are +2 until 18, then +1
        //Flaws are always -2
        let boosts = characterService.get_Character().boosts.filter(boost => boost.name == this.name)
        let boostSum: number = 0;
        boosts.forEach(boost => {
            if (boost.type == "boost") {
                boostSum += (boostSum < 8) ? 2 : 1;
            } else if (boost.type == "flaw") {
                boostSum -= 2; 
            }
        })
        //Get all active effects on the ability
        let itembonus = 0; //$scope.getEffects(this);
        //Add the effect bonus to the base value - parseInt'ed because it's from a textbox - and return it
        return this.baseValue(characterService) + boostSum + itembonus;
    }
    mod(characterService) {
        //Calculates the ability modifier from the effective ability in the usual d20 fashion - 0-1 > -5; 2-3 > -4; ... 10-11 > 0; 12-13 > 1 etc.
        return Math.floor((this.value(characterService)-10)/2)
    }
}