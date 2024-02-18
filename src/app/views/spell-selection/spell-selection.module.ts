import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbPopoverModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { ActionIconsModule } from 'src/libs/shared/ui/action-icons/action-icons.module';
import { SpellModule } from 'src/libs/shared/spell/spell.module';
import { GridIconModule } from 'src/libs/shared/ui/grid-icon/grid-icon.module';
import { SpellSelectionComponent } from './spell-selection.component';
import { TagsModule } from 'src/libs/shared/tags/tags.module';
import { SpellChoiceModule } from 'src/libs/shared/spell-choice/spell-choice.module';
import { ButtonModule } from 'src/libs/shared/ui/button/button.module';
import { FlyInMenuComponent } from 'src/libs/shared/ui/fly-in-menu/fly-in-menu.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,

        NgbTooltipModule,
        NgbPopoverModule,

        ActionIconsModule,
        SpellModule,
        GridIconModule,
        TagsModule,
        SpellChoiceModule,
        ButtonModule,
        FlyInMenuComponent,
    ],
    declarations: [
        SpellSelectionComponent,
    ],
    exports: [
        SpellSelectionComponent,
    ],
})
export class SpellSelectionModule { }
