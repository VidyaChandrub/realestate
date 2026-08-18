import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RolesGuard } from '../../auth/roles.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { MasterDataController } from '../../api/master-data.controller';

describe('MasterDataController RBAC metadata', () => {
  it('applies JwtAuthGuard and RolesGuard to mutating endpoints', () => {
    const createGuards = Reflect.getMetadata(GUARDS_METADATA, MasterDataController.prototype.create) as any[];
    const updateGuards = Reflect.getMetadata(GUARDS_METADATA, MasterDataController.prototype.update) as any[];
    const removeGuards = Reflect.getMetadata(GUARDS_METADATA, MasterDataController.prototype.remove) as any[];

    expect(createGuards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
    expect(updateGuards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
    expect(removeGuards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
  });

  it('sets admin role metadata on mutating endpoints', () => {
    const createRoles = Reflect.getMetadata('roles', MasterDataController.prototype.create) as string[];
    const updateRoles = Reflect.getMetadata('roles', MasterDataController.prototype.update) as string[];
    const removeRoles = Reflect.getMetadata('roles', MasterDataController.prototype.remove) as string[];

    expect(createRoles).toEqual(expect.arrayContaining(['admin']));
    expect(updateRoles).toEqual(expect.arrayContaining(['admin']));
    expect(removeRoles).toEqual(expect.arrayContaining(['admin']));
  });
});
