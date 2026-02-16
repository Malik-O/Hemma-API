/** JWT payload embedded in tokens */
export interface JwtPayload {
  sub: string; // user uid
  email: string;
}
