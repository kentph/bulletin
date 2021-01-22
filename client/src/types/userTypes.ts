import { BaseInterface } from "./modelTypes";

export interface User extends BaseInterface {
  // Including all fields here for typing, even though
  // migrations are supposed to be the source of truth.
  username: string;
}

export type CurrentUser = User;

export interface Client extends BaseInterface {
  name: string;
  userId: string;
}

export interface Auth extends BaseInterface {
  username: string;
  userId: string;
  hashed: string;
}
