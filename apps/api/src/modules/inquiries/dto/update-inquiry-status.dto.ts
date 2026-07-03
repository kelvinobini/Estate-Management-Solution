import { IsIn } from 'class-validator';

export class UpdateInquiryStatusDto {
  @IsIn(['new', 'contacted', 'dismissed'])
  status!: string;
}
