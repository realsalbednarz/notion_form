import { cookies } from 'next/headers';
import { db } from './db/client-postgres';
import { users, oauthTokens } from './db/schema';
import { eq } from 'drizzle-orm';

const SESSION_COOKIE = 'notion_form_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface SessionData {
  userId: string;
  exp: number;
}

// Simple session encoding (in production, use proper JWT or encrypted cookies)
function encodeSession(data: SessionData): string {
  const secret = process.env.SESSION_SECRET || 'dev-secret';
  const payload = JSON.stringify(data);
  const signature = Buffer.from(
    `${payload}.${secret}`
  ).toString('base64');
  return Buffer.from(`${payload}|${signature}`).toString('base64');
}

function decodeSession(token: string): SessionData | null {
  try {
    const secret = process.env.SESSION_SECRET || 'dev-secret';
    const decoded = Buffer.from(token, 'base64').toString();
    const [payload, signature] = decoded.split('|');

    const expectedSignature = Buffer.from(
      `${payload}.${secret}`
    ).toString('base64');

    if (signature !== expectedSignature) {
      return null;
    }

    const data = JSON.parse(payload) as SessionData;

    if (data.exp < Date.now()) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<string> {
  const session: SessionData = {
    userId,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };

  return encodeSession(session);
}

export async function setSessionCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const token = await createSession(userId);

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return decodeSession(token);
}

export async function getCurrentUser() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    return user || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export async function getUserAccessToken(userId: string): Promise<string | null> {
  try {
    const token = await db.query.oauthTokens.findFirst({
      where: eq(oauthTokens.userId, userId),
      orderBy: (tokens, { desc }) => [desc(tokens.createdAt)],
    });

    return token?.accessToken || null;
  } catch (error) {
    console.error('Error fetching access token:', error);
    return null;
  }
}

// Notion OAuth helpers
export function getNotionAuthUrl(state?: string): string {
  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = process.env.NOTION_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/notion/callback`;

  if (!clientId) {
    throw new Error('NOTION_CLIENT_ID is not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    owner: 'user',
    redirect_uri: redirectUri,
  });

  if (state) {
    params.set('state', state);
  }

  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string) {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/notion/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Notion OAuth credentials not configured');
  }

  const response = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange code for token');
  }

  return response.json();
}

export async function createOrUpdateUser(tokenData: any) {
  const {
    access_token,
    token_type,
    workspace_id,
    workspace_name,
    owner,
  } = tokenData;

  const notionUserId = owner?.user?.id;
  const email = owner?.user?.person?.email;
  const name = owner?.user?.name;
  const avatarUrl = owner?.user?.avatar_url;

  if (!notionUserId) {
    throw new Error('No user ID in token response');
  }

  // Check if user exists
  let user = await db.query.users.findFirst({
    where: eq(users.notionUserId, notionUserId),
  });

  if (user) {
    // Update existing user
    await db.update(users)
      .set({
        email,
        name,
        avatarUrl,
        workspaceId: workspace_id,
        workspaceName: workspace_name,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  } else {
    // Create new user
    const [newUser] = await db.insert(users)
      .values({
        notionUserId,
        email,
        name,
        avatarUrl,
        workspaceId: workspace_id,
        workspaceName: workspace_name,
      })
      .returning();

    user = newUser;
  }

  // Save/update OAuth token
  const existingToken = await db.query.oauthTokens.findFirst({
    where: eq(oauthTokens.userId, user.id),
  });

  if (existingToken) {
    await db.update(oauthTokens)
      .set({
        accessToken: access_token,
        tokenType: token_type,
        workspaceId: workspace_id,
        updatedAt: new Date(),
      })
      .where(eq(oauthTokens.id, existingToken.id));
  } else {
    await db.insert(oauthTokens)
      .values({
        userId: user.id,
        accessToken: access_token,
        tokenType: token_type,
        workspaceId: workspace_id,
      });
  }

  return user;
}
