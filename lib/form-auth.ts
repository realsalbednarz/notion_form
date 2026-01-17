import { cookies } from 'next/headers';
import { Client } from '@notionhq/client';
import { db } from './db/client-postgres';
import { formUsers, magicLinkTokens } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { randomBytes } from 'crypto';

const FORM_SESSION_COOKIE = 'notion_form_user_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const NOTION_CHECK_INTERVAL = 60 * 15; // 15 minutes
const MAGIC_LINK_EXPIRY = 60 * 15; // 15 minutes

interface FormSessionData {
  formUserId: string;
  email: string;
  exp: number;
}

// Session encoding/decoding
function encodeSession(data: FormSessionData): string {
  const secret = process.env.SESSION_SECRET || 'dev-secret';
  const payload = JSON.stringify(data);
  const signature = Buffer.from(`${payload}.${secret}`).toString('base64');
  return Buffer.from(`${payload}|${signature}`).toString('base64');
}

function decodeSession(token: string): FormSessionData | null {
  try {
    const secret = process.env.SESSION_SECRET || 'dev-secret';
    const decoded = Buffer.from(token, 'base64').toString();
    const [payload, signature] = decoded.split('|');

    const expectedSignature = Buffer.from(`${payload}.${secret}`).toString('base64');
    if (signature !== expectedSignature) {
      return null;
    }

    const data = JSON.parse(payload) as FormSessionData;
    if (data.exp < Date.now()) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

// Verify email exists in Notion workspace
export async function verifyWorkspaceMember(email: string): Promise<{
  isValid: boolean;
  notionUserId?: string;
  name?: string;
  avatarUrl?: string;
}> {
  const notionApiKey = process.env.NOTION_API_KEY;
  if (!notionApiKey) {
    throw new Error('NOTION_API_KEY not configured');
  }

  const notion = new Client({ auth: notionApiKey });

  try {
    // Get all users in the workspace
    const response = await notion.users.list({});

    // Find user by email
    for (const user of response.results) {
      if (user.type === 'person' && user.person?.email === email) {
        return {
          isValid: true,
          notionUserId: user.id,
          name: user.name || undefined,
          avatarUrl: user.avatar_url || undefined,
        };
      }
    }

    return { isValid: false };
  } catch (error) {
    console.error('Error verifying workspace member:', error);
    throw error;
  }
}

// Generate magic link token
export async function createMagicLinkToken(email: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY * 1000);

  await db.insert(magicLinkTokens).values({
    email,
    token,
    expiresAt,
  });

  return token;
}

// Verify magic link token
export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  const result = await db.query.magicLinkTokens.findFirst({
    where: and(
      eq(magicLinkTokens.token, token),
      gt(magicLinkTokens.expiresAt, new Date())
    ),
  });

  if (!result || result.usedAt) {
    return null;
  }

  // Mark token as used
  await db.update(magicLinkTokens)
    .set({ usedAt: new Date() })
    .where(eq(magicLinkTokens.id, result.id));

  return result.email;
}

// Create or update form user
export async function createOrUpdateFormUser(
  email: string,
  notionUserId: string | undefined,
  name: string | undefined,
  avatarUrl: string | undefined
) {
  let formUser = await db.query.formUsers.findFirst({
    where: eq(formUsers.email, email),
  });

  const now = new Date();

  if (formUser) {
    await db.update(formUsers)
      .set({
        notionUserId: notionUserId || formUser.notionUserId,
        name: name || formUser.name,
        avatarUrl: avatarUrl || formUser.avatarUrl,
        lastNotionCheck: now,
        isActive: true,
        updatedAt: now,
      })
      .where(eq(formUsers.id, formUser.id));

    formUser = { ...formUser, lastNotionCheck: now };
  } else {
    const [newUser] = await db.insert(formUsers)
      .values({
        email,
        notionUserId,
        name,
        avatarUrl,
        lastNotionCheck: now,
        isActive: true,
      })
      .returning();

    formUser = newUser;
  }

  return formUser;
}

// Set form user session cookie
export async function setFormUserSessionCookie(formUserId: string, email: string): Promise<void> {
  const cookieStore = await cookies();

  const session: FormSessionData = {
    formUserId,
    email,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };

  cookieStore.set(FORM_SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

// Clear form user session
export async function clearFormUserSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(FORM_SESSION_COOKIE);
}

// Get current form user with Notion membership check
export async function getCurrentFormUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(FORM_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = decodeSession(token);
  if (!session) {
    return null;
  }

  try {
    const formUser = await db.query.formUsers.findFirst({
      where: eq(formUsers.id, session.formUserId),
    });

    if (!formUser || !formUser.isActive) {
      return null;
    }

    // Check if we need to re-verify Notion membership
    const lastCheck = formUser.lastNotionCheck?.getTime() || 0;
    const needsCheck = Date.now() - lastCheck > NOTION_CHECK_INTERVAL * 1000;

    if (needsCheck) {
      const verification = await verifyWorkspaceMember(formUser.email);

      if (!verification.isValid) {
        // User no longer in workspace - deactivate
        await db.update(formUsers)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(formUsers.id, formUser.id));

        await clearFormUserSessionCookie();
        return null;
      }

      // Update last check time
      await db.update(formUsers)
        .set({
          lastNotionCheck: new Date(),
          notionUserId: verification.notionUserId,
          name: verification.name,
          avatarUrl: verification.avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(formUsers.id, formUser.id));

      return {
        ...formUser,
        lastNotionCheck: new Date(),
        notionUserId: verification.notionUserId,
        name: verification.name,
        avatarUrl: verification.avatarUrl,
      };
    }

    return formUser;
  } catch (error) {
    console.error('Error getting form user:', error);
    return null;
  }
}
