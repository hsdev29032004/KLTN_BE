import { User } from '@prisma/client';

export const buildJwtPayload = (user: User) => {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatar: user.avatar,
    roleId: user.roleId,
    banId: user.banId,
    isDeleted: user.isDeleted,
    timeBan: user.timeBan,
    timeUnBan: user.timeUnBan,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
  };
}