export interface IUser {
  id: string;
  email: string;
  fullName: string;
  avatar: string;
  role: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    rolePermissions: any[];
  },
  ban: string | null,
  roleId: string,
  banId: string | null,
  isDeleted: boolean,
  timeBan: string | null,
  availableAmount: number,
  lockAmount: number,
  timeUnBan: string | null,
  createdAt: string,
  updatedAt: string,
  deletedAt: string | null
}