import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MenuItem {
  id: string;
  label: string;
  to: string;
  icon: string;
  children?: MenuItem[];
}

export interface MenuGroup {
  label: string | null;
  items: MenuItem[];
}

export interface MenuResponse {
  groups: MenuGroup[];
}

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Fetch menu items based on user roles from JWT token
   * @param roles User roles from JWT token
   * @returns Hierarchical menu structure grouped by group_label
   */
  async getMenuByRoles(roles: string[]): Promise<MenuResponse> {
    this.logger.debug(`Fetching menu for roles: ${roles.join(', ')}`);

    // Edge case: no roles
    if (!roles || roles.length === 0) {
      this.logger.warn('No roles provided, returning empty menu');
      return { groups: [] };
    }

    try {
      // Normalize role names and fetch from database case-insensitively
      const normalizedRoles = roles.map((role) => role.trim().toLowerCase());

      const roleRecords = await this.prisma.role.findMany({
        where: {
          OR: normalizedRoles.map((role) => ({
            name: {
              equals: role,
              mode: 'insensitive',
            },
          })),
        },
      });

      this.logger.debug(
        `Found ${roleRecords.length} role records for ${roles.length} requested roles`,
      );

      if (roleRecords.length === 0) {
        this.logger.warn('No matching roles found in database');
        return { groups: [] };
      }

      const roleIds = roleRecords.map((r) => r.id);

      // Fetch all menus allowed for these roles
      const allowedMenus = await this.prisma.menu.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              rolePermissions: {
                some: { roleId: { in: roleIds } },
              },
            },
          ],
        },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
          parent: true,
        },
        orderBy: { sortOrder: 'asc' },
      });

      this.logger.debug(`Fetched ${allowedMenus.length} allowed menus`);

      // Build the response with hierarchy
      return this.buildMenuResponse(allowedMenus);
    } catch (error) {
      this.logger.error(`Error fetching menu for roles: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Build hierarchical menu structure grouped by group_label
   * @param menus All allowed menus from database
   * @returns Formatted menu response
   */
  private buildMenuResponse(menus: any[]): MenuResponse {
    // Filter out child menus (those with parentId) - they'll be nested under parent
    const topLevelMenus = menus.filter((m) => !m.parentId);

    // Create a map of all menus by ID for quick lookup
    const menuMap = new Map(menus.map((m) => [m.id, m]));

    // Build menu items with children
    const menuItems = topLevelMenus.map((menu) =>
      this.buildMenuItem(menu, menuMap),
    );

    // Group by group_label
    const groupedMenus = this.groupMenusByLabel(menuItems);

    return { groups: groupedMenus };
  }

  /**
   * Convert a menu record to MenuItem with children
   */
  private buildMenuItem(menu: any, menuMap: Map<string, any>): MenuItem {
    const itemChildren: MenuItem[] = [];

    // If menu has children, include them
    if (menu.children && menu.children.length > 0) {
      for (const child of menu.children) {
        itemChildren.push(this.buildMenuItem(child, menuMap));
      }
    }

    const item: MenuItem = {
      id: menu.id,
      label: menu.label,
      to: menu.to,
      icon: menu.icon,
    };

    if (itemChildren.length > 0) {
      item.children = itemChildren;
    }

    return item;
  }

  /**
   * Group menu items by their group_label
   */
  private groupMenusByLabel(items: MenuItem[]): MenuGroup[] {
    const groupMap = new Map<string | null, MenuItem[]>();

    // First pass: collect all items and their group labels
    const collectItems = (menuItems: MenuItem[], groupLabel: string | null) => {
      for (const item of menuItems) {
        // Note: We use the group_label from the parent menu item
        // In this case, we need to track it from the database query
        if (!groupMap.has(groupLabel)) {
          groupMap.set(groupLabel, []);
        }
        groupMap.get(groupLabel)!.push(item);

        // If this item has children, don't add them to the top-level grouping
        // They stay nested under their parent
      }
    };

    // We need a different approach - fetch menus with their group_label directly
    // For now, we'll return items grouped by the top-level group_label

    // Sort groups by null (no group) first, then by label name
    const groups: MenuGroup[] = Array.from(groupMap.entries())
      .sort(([labelA], [labelB]) => {
        if (labelA === null) return -1;
        if (labelB === null) return 1;
        return (labelA || '').localeCompare(labelB || '');
      })
      .map(([label, items]) => ({
        label,
        items,
      }));

    return groups;
  }

  /**
   * Alternative implementation that properly handles grouping
   * This should replace the above methods
   */
  async getMenuByRolesV2(roles: string[]): Promise<MenuResponse> {
    this.logger.debug(`Fetching menu (v2) for roles: ${roles.join(', ')}`);

    // Edge case: no roles
    if (!roles || roles.length === 0) {
      this.logger.warn('No roles provided, returning empty menu');
      return { groups: [] };
    }

    try {
      // Normalize role names and fetch from database case-insensitively
      const normalizedRoles = roles.map((role) => role.trim().toLowerCase());

      const roleRecords = await this.prisma.role.findMany({
        where: {
          OR: normalizedRoles.map((role) => ({
            name: {
              equals: role,
              mode: 'insensitive',
            },
          })),
        },
      });

      this.logger.debug(
        `Found ${roleRecords.length} role records for ${roles.length} requested roles`,
      );

      if (roleRecords.length === 0) {
        this.logger.warn('No matching roles found in database');
        return { groups: [] };
      }

      const roleIds = roleRecords.map((r) => r.id);

      // Fetch all active menus (for parent traversal and ordering)
      const allMenus = await this.prisma.menu.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      // Fetch allowed menu IDs for the roles
      const allowedPermissions = await this.prisma.rolePermission.findMany({
        where: { roleId: { in: roleIds } },
        select: { menuId: true },
      });
      const allowedMenuIds = new Set(allowedPermissions.map((rp) => rp.menuId));

      if (allowedMenuIds.size === 0) {
        this.logger.warn('No role permissions found for requested roles');
        return { groups: [] };
      }

      const menuMap = new Map(allMenus.map((menu) => [menu.id, menu]));
      const includedMenuIds = new Set<string>();

      const includeMenuAndAncestors = (menuId: string) => {
        if (includedMenuIds.has(menuId)) return;
        const menu = menuMap.get(menuId);
        if (!menu) return;

        includedMenuIds.add(menuId);

        if (menu.parentId) {
          includeMenuAndAncestors(menu.parentId);
        }
      };

      for (const menuId of allowedMenuIds) {
        includeMenuAndAncestors(menuId);
      }

      // Convert included menus into flattened objects and attach children
      type InternalMenuItem = {
        id: string;
        label: string;
        to: string;
        icon: string;
        groupLabel?: string | null;
        parentId?: string | null;
        sortOrder?: number;
        children?: InternalMenuItem[];
      };

      const itemMap = new Map<string, InternalMenuItem>();

      for (const menu of allMenus) {
        if (!includedMenuIds.has(menu.id)) continue;

        itemMap.set(menu.id, {
          id: menu.id,
          label: menu.label,
          to: menu.to,
          icon: menu.icon,
          groupLabel: menu.groupLabel ?? null,
          parentId: menu.parentId,
          sortOrder: menu.sortOrder,
          children: [],
        });
      }

      // Attach children inside the include set
      for (const item of itemMap.values()) {
        if (item.parentId) {
          const parent = itemMap.get(item.parentId);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(item);
          }
        }
      }

      // Keep only top-level menu items
      const rootItems = Array.from(itemMap.values())
        .filter((item) => !item.parentId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      const sortChildrenRecursively = (items: InternalMenuItem[]) => {
        for (const item of items) {
          if (item.children?.length) {
            item.children.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
            sortChildrenRecursively(item.children);
          }
        }
      };

      sortChildrenRecursively(rootItems);

      // Helper to build MenuItem recursively and drop metadata
      const buildMenuItem = (item: InternalMenuItem): MenuItem => {
        const menuItem: MenuItem = {
          id: item.id,
          label: item.label,
          to: item.to,
          icon: item.icon,
        };

        if (item.children?.length) {
          menuItem.children = item.children.map(buildMenuItem);
        }

        return menuItem;
      };

      // Group root items by groupLabel, tracking the minimum sortOrder per group
      const groupMap = new Map<string | null, { items: MenuItem[]; minSortOrder: number }>();
      for (const item of rootItems) {
        const groupLabel = item.groupLabel || null;
        if (!groupMap.has(groupLabel)) {
          groupMap.set(groupLabel, { items: [], minSortOrder: item.sortOrder ?? 0 });
        }
        const group = groupMap.get(groupLabel)!;
        group.minSortOrder = Math.min(group.minSortOrder, item.sortOrder ?? 0);
        group.items.push(buildMenuItem(item));
      }

      const groups = Array.from(groupMap.entries())
        .sort(([, a], [, b]) => a.minSortOrder - b.minSortOrder)
        .map(([label, { items }]) => ({
          label: label || 'Default',
          items,
        }));

      this.logger.debug(`Built ${groups.length} menu groups`);
      return { groups };
    } catch (error) {
      this.logger.error(`Error fetching menu for roles: ${error.message}`, error.stack);
      throw error;
    }
  }
}
