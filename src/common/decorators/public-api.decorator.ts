import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublicApi';
export const PublicAPI = () => SetMetadata(IS_PUBLIC_KEY, true);