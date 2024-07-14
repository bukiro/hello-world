import { Injectable } from '@angular/core';
import { ArmorMaterial } from 'src/app/classes/items/armor-material';
import { ShieldMaterial } from 'src/app/classes/items/shield-material';
import { WeaponMaterial } from 'src/app/classes/items/weapon-material';
import * as json_armormaterials from 'src/assets/json/armormaterials';
import * as json_shieldmaterials from 'src/assets/json/shieldmaterials';
import * as json_weaponmaterials from 'src/assets/json/weaponmaterials';
import { ImportedJsonFileList } from '../../definitions/types/json-imported-item-file-list';
import { DataLoadingService } from './data-loading.service';

@Injectable({
    providedIn: 'root',
})
export class ItemMaterialsDataService {

    private _armorMaterials: Array<ArmorMaterial> = [];
    private _shieldMaterials: Array<ShieldMaterial> = [];
    private _weaponMaterials: Array<WeaponMaterial> = [];
    private _initialized = false;

    constructor(
        private readonly _dataLoadingService: DataLoadingService,
    ) { }

    public get stillLoading(): boolean {
        return !this._initialized;
    }

    public armorMaterials(): Array<ArmorMaterial> {
        if (!this.stillLoading) {
            return this._armorMaterials;
        } else { return [new ArmorMaterial()]; }
    }

    public shieldMaterials(): Array<ShieldMaterial> {
        if (!this.stillLoading) {
            return this._shieldMaterials;
        } else { return [new ShieldMaterial()]; }
    }

    public weaponMaterials(): Array<WeaponMaterial> {
        if (!this.stillLoading) {
            return this._weaponMaterials;
        } else { return [new WeaponMaterial()]; }
    }

    public initialize(): void {
        this._armorMaterials = this._dataLoadingService.loadSerializable(
            json_armormaterials as ImportedJsonFileList<ArmorMaterial>,
            'armorMaterials',
            'name',
            ArmorMaterial,
        );

        this._shieldMaterials = this._dataLoadingService.loadSerializable(
            json_shieldmaterials,
            'shieldMaterials',
            ['name', 'itemFilter'],
            ShieldMaterial,
        );

        this._weaponMaterials = this._dataLoadingService.loadSerializable(
            json_weaponmaterials,
            'weaponMaterials',
            'name',
            WeaponMaterial,
        );

        this._initialized = true;
    }

}
