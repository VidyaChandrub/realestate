export enum AdPlacement {
  DASHBOARD_BANNER = 'DASHBOARD_BANNER',
  JOB_LISTING = 'JOB_LISTING',
  SIDEBAR = 'SIDEBAR',
  OTHER = 'OTHER',
}

export enum AdStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  COMPLETED = 'COMPLETED',
  DRAFT = 'DRAFT',
}

export enum AdDisplayType {
  BANNER = 'BANNER',
  CARD = 'CARD',
}

export enum AdMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  HTML = 'HTML',
}

export enum AdCtaButtonStyle {
  FILLED = 'FILLED',
  OUTLINE = 'OUTLINE',
  GHOST = 'GHOST',
  TEXT = 'TEXT',
}

export enum AdCtaButtonSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

export enum AdCtaButtonPlacement {
  BOTTOM_LEFT = 'BOTTOM_LEFT',
  BOTTOM_CENTER = 'BOTTOM_CENTER',
  BOTTOM_RIGHT = 'BOTTOM_RIGHT',
  TOP_LEFT = 'TOP_LEFT',
  TOP_CENTER = 'TOP_CENTER',
  TOP_RIGHT = 'TOP_RIGHT',
}

export class Advertisement {}
