export const ANALYTICS_RETENTION_MONTHS_ENV = 'ANALYTICS_RETENTION_MONTHS';
export const DEFAULT_ANALYTICS_RETENTION_MONTHS = 12;

export enum AnalyticsEntityType {
  JOB = 'JOB',
  EVENT = 'EVENT',
  AD = 'AD',
  APPLICATION = 'APPLICATION',
  SYSTEM = 'SYSTEM',
}

export enum AnalyticsEventType {
  AD_IMPRESSION = 'ad.impression',
  AD_CLICK = 'ad.click',
  AD_VIDEO_COMPLETED = 'ad.video_completed',
  JOB_VIEWED = 'job.viewed',
  APPLICATION_SUBMITTED = 'application.submitted',
  EVENT_VIEWED = 'event.viewed',
  EVENT_REGISTERED = 'event.registered',
  EVENT_EXTERNAL_REGISTRATION_CLICKED = 'event.external_registration_clicked',
  JOB_EXTERNAL_APPLY_CLICKED = 'job.external_apply_clicked',
  NOTIFICATION_READ = 'notification.read',
}
