export class QueryUserDto {
  search?: string;
  roleId?: string;
  roleName?: string;
  isBanned?: string;
  isDeleted?: string;
  fromDate?: string;
  toDate?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  order?: string;
}
