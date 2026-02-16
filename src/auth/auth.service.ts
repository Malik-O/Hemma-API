import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { StoredUser } from '../users/user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

/** Shape returned to the client on successful auth */
export interface AuthResponse {
  accessToken: string;
  user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /* ──────────── Google OAuth ──────────── */

  /**
   * Verify a Google ID token (credential) by decoding its payload.
   * In production you should verify the signature with Google's public keys.
   * For simplicity we decode the JWT and trust the client-side Google SDK.
   */
  async googleAuth(credential: string): Promise<AuthResponse> {
    const payload = this.decodeGoogleToken(credential);

    if (!payload?.email) {
      throw new UnauthorizedException('Invalid Google credential');
    }

    let user = this.usersService.findByEmail(payload.email);

    if (!user) {
      const now = new Date().toISOString();
      user = this.usersService.create({
        uid: uuidv4(),
        email: payload.email,
        displayName: payload.name ?? payload.email.split('@')[0],
        photoURL: payload.picture ?? null,
        passwordHash: null,
        provider: 'google',
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Update profile info from Google on each login
      user = this.usersService.update(user.uid, {
        displayName: payload.name ?? user.displayName,
        photoURL: payload.picture ?? user.photoURL,
      })!;
    }

    return this.buildAuthResponse(user);
  }

  /* ──────────── Local Registration ──────────── */

  async register(
    email: string,
    displayName: string,
    password: string,
  ): Promise<AuthResponse> {
    const existing = this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const user = this.usersService.create({
      uid: uuidv4(),
      email,
      displayName,
      photoURL: null,
      passwordHash,
      provider: 'local',
      createdAt: now,
      updatedAt: now,
    });

    return this.buildAuthResponse(user);
  }

  /* ──────────── Local Login ──────────── */

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
  }

  /* ──────────── Get Current User ──────────── */

  getProfile(uid: string): AuthResponse['user'] | null {
    const user = this.usersService.findById(uid);
    if (!user) return null;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  }

  /* ──────────── Helpers ──────────── */

  private buildAuthResponse(user: StoredUser): AuthResponse {
    const payload: JwtPayload = { sub: user.uid, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
    };
  }

  /**
   * Decode a Google ID token (JWT) without external verification.
   * In production, use google-auth-library's `OAuth2Client.verifyIdToken`.
   */
  private decodeGoogleToken(
    token: string,
  ): { email?: string; name?: string; picture?: string } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8'),
      );
      return payload;
    } catch {
      return null;
    }
  }
}
