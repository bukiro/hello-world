import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsComponent } from './components/effects/effects.component';
import { StickyPopoverModule } from '../shared/sticky-popover/sticky-popover.module';
import { GridIconModule } from '../shared/ui/grid-icon/grid-icon.module';
import { NgbPopoverModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TagsModule } from '../shared/tags/tags.module';
import { ConditionModule } from '../shared/condition/condition.module';
import { FormsModule } from '@angular/forms';
import { TimeModule } from '../shared/time/time.module';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,

        NgbTooltipModule,
        NgbPopoverModule,

        StickyPopoverModule,
        GridIconModule,
        TagsModule,
        ConditionModule,
        TimeModule,
    ],
    declarations: [
        EffectsComponent,
    ],
    exports: [
        EffectsComponent,
    ],
})
export class EffectsModule { }
