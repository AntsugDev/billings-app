import * as SecureStore from 'expo-secure-store';
import {Utility} from "@/app/(tabs)/fatture";

export const KEY_DATA = 'utilities';
export const setDataUtilities = async (data: string) => {
    try {
        await SecureStore.setItemAsync(KEY_DATA, data)
    } catch (e) {
        throw e;
    }
}

export const getFromNameUtilities = async (name?: string) => {

    try {
        if(!name) return ;
        const response = await SecureStore.getItemAsync(KEY_DATA)
        if (response) {
            const decode = JSON.parse(response)
            return decode.filter((e:any) => {
                return e.name === name
            });
        }
        return null;
    } catch (e) {
        throw e;
    }
}