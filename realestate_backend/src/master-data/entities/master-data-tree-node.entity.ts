import { ApiProperty } from '@nestjs/swagger';

export class MasterDataTreeNodeEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  value!: string;
}
