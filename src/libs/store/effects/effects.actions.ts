import { createAction, props } from '@ngrx/store';
import { Effect } from 'src/app/classes/effects/effect';
import { CreatureTypeIds } from 'src/libs/shared/definitions/creatureTypeIds';

export const replaceEffects = createAction(
    '[EFFECTS] Replace',
    props<{ id: CreatureTypeIds; effects: Array<Effect> }>(),
);
