import { IsString } from 'class-validator';

/** `identifier` is either the OTP code or the scanned QR payload — the gate scanner/app doesn't need to know which. */
export class CheckInGatePassDto {
  @IsString()
  identifier!: string;
}
