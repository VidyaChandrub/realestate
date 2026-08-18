import { Controller, Get, Logger, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MenuResponse, MenuService } from '../menu/menu.service';

@Controller('api/v1/menu')
export class MenuController {
  private readonly logger = new Logger(MenuController.name);

  constructor(private readonly menuService: MenuService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getMenu(@Request() req): Promise<MenuResponse> {
    const user = req.user;
    this.logger.log(`Menu requested by user: ${user.email}`);

    const roles = user.role ? [user.role] : [];
    this.logger.debug(`User has roles: ${roles.join(', ')}`);

    const menu = await this.menuService.getMenuByRolesV2(roles);
    this.logger.log(`Returning menu with ${menu.groups.length} groups for user ${user.email}`);

    return menu;
  }
}
