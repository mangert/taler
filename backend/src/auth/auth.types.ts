export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface JwtAccessTokenPayload {
  sub: string;
  email: string;
}
