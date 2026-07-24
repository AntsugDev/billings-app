import * as SecureStore from 'expo-secure-store';
import dayjs from "dayjs";

export const exipred = async (exp?: string) => {
    try {
        if (exp)
            await auth('expired', exp)
    } catch (e) {
        throw e;
    }
}

export const isValid = async () => {
    try {
        const response = await getData('expired')
        if (response && typeof response === 'string') {
            const rExpired = dayjs(response)
            const now = dayjs()
            return rExpired.isAfter(now);
        }
        return true;
    } catch (e) {
        throw e
    }
}

export const globalLogin = async (data?: any) => {
    try {
        if (data) {
            let key = btoa(data?.username)
            let token = data?.access_token
            if (key && token) {
                await auth(key, token)
                await dataUser({username: data?.username, name: data?.name})
                await exipred(data?.expires_at)
            }
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
        await auth('data-user', JSON.stringify(user))
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
        const response = await getData('data-user')
        if (response && typeof response === 'string') {
            const decode = JSON.parse(response)
            let user: User = {
                username: decode?.email ?? "",
                name: decode?.name ?? "",
            }
            return user
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
        return !response ? response :  new Error("Impossibile estrarre i dati");
    } catch (e) {
        throw e;
    }
}

export const logout = async (key?: string) => {
    try {
        if (key)
            await SecureStore.deleteItemAsync(key)
    } catch (e) {
        throw e;
    }
}