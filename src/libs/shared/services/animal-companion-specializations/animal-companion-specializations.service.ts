import { Injectable } from '@angular/core';
import { AnimalCompanion } from 'src/app/classes/creatures/animal-companion/animal-companion';
import { AnimalCompanionSpecialization } from 'src/app/classes/creatures/animal-companion/animal-companion-specialization';
import { DeepPartial } from '../../definitions/types/deep-partial';
import { AnimalCompanionsDataService } from '../data/animal-companions-data.service';
import { TypeService } from '../type/type.service';

@Injectable({
    providedIn: 'root',
})
export class AnimalCompanionSpecializationsService {

    constructor(
        private readonly _animalCompanionsDataService: AnimalCompanionsDataService,
        private readonly _typeService: TypeService,
    ) { }

    public restoreSpecializationFromSave(spec: DeepPartial<AnimalCompanionSpecialization>): AnimalCompanionSpecialization {
        let restoredSpecialization: AnimalCompanionSpecialization | undefined;

        if (spec.name) {
            const libraryObject = this._animalCompanionsDataService.companionSpecializations(spec.name)[0];

            if (libraryObject) {
                //Map the restored object onto the library object and keep the result.
                restoredSpecialization = libraryObject.clone().with(spec);
            }
        }

        return restoredSpecialization || AnimalCompanionSpecialization.from(spec);
    }

    public cleanSpecializationForSave(spec: AnimalCompanionSpecialization): void {
        if (spec.name) {
            const libraryObject = this._animalCompanionsDataService.companionSpecializations(spec.name)[0];

            if (libraryObject) {
                (Object.keys(spec) as Array<keyof AnimalCompanionSpecialization>).forEach(key => {
                    if (key !== 'name') {
                        // If the Object has a name, and a library item can be found with that name,
                        // compare the property with the library item.
                        // If they have the same value, delete the property from the item - it can be recovered during loading via the name.
                        if (JSON.stringify(spec[key]) === JSON.stringify(libraryObject[key])) {
                            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                            delete spec[key];
                        }
                    }
                });
            }
        }
    }

    public addSpecialization(companion: AnimalCompanion, spec: AnimalCompanionSpecialization, levelNumber: number): void {
        const newSpec = spec.clone();

        newSpec.level = levelNumber;

        companion.class.specializations.push(newSpec);
    }

    public removeSpecialization(companion: AnimalCompanion, spec: AnimalCompanionSpecialization): void {
        companion.class.specializations = companion.class.specializations.filter(specialization => specialization.name !== spec.name);
    }

}
