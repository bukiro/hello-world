import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbPopoverModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CashModule } from 'src/libs/shared/cash/cash.module';
import { TagsModule } from 'src/libs/shared/tags/tags.module';
import { ItemModule } from 'src/libs/shared/item/item.module';
import { GridIconModule } from 'src/libs/shared/ui/grid-icon/grid-icon.module';
import { InventoryModule } from 'src/libs/inventory/inventory.module';
import { CraftingComponent } from './crafting.component';
import { ButtonComponent } from 'src/libs/shared/ui/button/components/button/button.component';
import { FlyInMenuComponent } from 'src/libs/shared/ui/fly-in-menu/fly-in-menu.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,

        NgbTooltipModule,
        NgbPopoverModule,

        CashModule,
        TagsModule,
        ItemModule,
        GridIconModule,
        InventoryModule,
        ButtonComponent,
        FlyInMenuComponent,
    ],
    declarations: [
        CraftingComponent,
    ],
    exports: [
        CraftingComponent,
    ],
})
export class CraftingModule { }
