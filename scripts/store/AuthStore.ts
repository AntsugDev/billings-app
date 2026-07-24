import * as SecureStore from 'expo-secure-store';
import dayjs from "dayjs";

export const AUTH_TOKEN_KEY = 'auth-token';
export const USER_DATA_KEY = 'data-user';
export const EXPIRED_KEY = 'expired';

type LoginPayload = {
    response?: any;
    fallbackUsername?: string;
}

const pickFirstString = (...values: any[]) => {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
}

const resolveLoginPayload = (payload?: LoginPayload | any) => {
    const response = payload?.response ?? payload;
    const userSource = response?.user ?? response?.utente ?? response?.data?.user ?? response?.data ?? response;

    const username = pickFirstString(
        userSource?.username,
        userSource?.email,
        response?.username,
        response?.email,
        response?.user?.username,
        response?.user?.email,
        payload?.fallbackUsername,
    );

    const name = pickFirstString(
        userSource?.name,
        userSource?.nome,
        response?.name,
        response?.nome,
        username,
    );

    const token = pickFirstString(
        response?.access_token,
        response?.accessToken,
        response?.token,
        response?.data?.access_token,
        response?.data?.accessToken,
        response?.data?.token,
    );

    const expiresAt = pickFirstString(
        response?.expires_at,
        response?.expiresAt,
        response?.expiration,
        response?.data?.expires_at,
        response?.data?.expiresAt,
        response?.data?.expiration,
    );

    return { username, name, token, expiresAt };
}

export const exipred = async (exp?: string) => {
    try {
        if (exp)
            await auth(EXPIRED_KEY, exp)
        else
            await SecureStore.deleteItemAsync(EXPIRED_KEY)
    } catch (e) {
        throw e;
    }
}

export const isValid = async () => {
    try {
        const token = await getAuthToken();
        if (!token) return false;
        return true;
    } catch (e) {
        throw e
    }
}

export const globalLogin = async (payload?: LoginPayload | any) => {
    try {
        if (payload) {
            const { username, name, token, expiresAt } = resolveLoginPayload(payload)
            if (!username || !token) {
                throw new Error('La risposta di login non contiene username/email o token');
            }

            const user: User = { username, name }
            const userTokenKey = btoa(username)
            await auth(AUTH_TOKEN_KEY, token)
            await auth(userTokenKey, token)
            await dataUser(user)
            await exipred(expiresAt)
        }

    } catch (e) {
        throw e
    }
}

export const auth = async (key: string, token: string) => {
    try {
        await SecureStore.setItemAsync(key, token)
    } catch (e) {
        throw e;
    }
}

export const dataUser = async (user: User) => {
    try {
        await auth(USER_DATA_KEY, JSON.stringify(user))
    } catch (e) {
        throw e;
    }
}

export interface User {
    username: string
    name: string
}

export const getDataUser = async () => {
    try {
        const response = await getData(USER_DATA_KEY)
        if (response && typeof response === 'string') {
            const decode = JSON.parse(response)
            let user: User = {
                username: decode?.username ?? decode?.email ?? "",
                name: decode?.name ?? "",
            }
            return user
        }
        return null;

    } catch (e) {
        throw e;
    }
}

export const getAuthToken = async (username?: string) => {
    try {
        const token = await getData(AUTH_TOKEN_KEY);
        if (token) return token;

        if (username) {
            return await getData(btoa(username));
        }

        const user = await getDataUser();
        if (user?.username) {
            return await getData(btoa(user.username));
        }

        return null;
    } catch (e) {
        throw e;
    }
}

export const getData = async (key?: string) => {
    try {
        if (!key) return null;
        const response = await SecureStore.getItemAsync(key)
        return response;
    } catch (e) {
        throw e;
    }
}

export const logout = async (key?: string) => {
    try {
        if (key)
            await SecureStore.deleteItemAsync(key)
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY)
        await SecureStore.deleteItemAsync(USER_DATA_KEY)
        await SecureStore.deleteItemAsync(EXPIRED_KEY)
    } catch (e) {
        throw e;
    }
}