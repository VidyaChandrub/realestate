import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { DeviceTokensModule } from '../device-tokens/device-tokens.module';
import { PushNotificationListener } from './push-notification.listener';
import { PushPayloadBuilder } from './push-payload.builder';

@Module({
  imports: [FirebaseModule, DeviceTokensModule],
  providers: [PushNotificationListener, PushPayloadBuilder],
})
export class PushNotificationsModule {}
