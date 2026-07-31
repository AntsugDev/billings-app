import axios, {AxiosHeaders, AxiosRequestConfig, AxiosResponse} from "axios";
import {delToken, getAuthToken, globalLogin, logoutStore} from "@/scripts/store/AuthStore";
import {showError} from "@/scripts/store/ErrorStore";
import * as Sentry from '@sentry/react-native';
import {use} from "react";
import {router} from "expo-router";

export interface ResponseOK<T = any> {
    data: T;
    status: number;
    message: string | null;
}

export interface ResponseKO {
    success: boolean;
    status: number;
    error: string;
    details: any;
}

export interface ParamsApi {
    url: string;
    queryString?: Map<string, any> | Record<string, any> | null;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | string;
    body?: any;
    key?: string // username opzionale per recuperare token legacy
}

export const CallApi = async (params: ParamsApi): Promise<ResponseOK> => {
    let config: AxiosRequestConfig = {}
    try {
        const path_base = process.env.EXPO_PUBLIC_API_URL;
        const globalUrl = path_base + params.url;

        // Convertiamo eventuale Map in oggetto standard per Axios (che gestisce l'encoding automaticamente)
        let queryParams: Record<string, any> | undefined = undefined;
        if (params.queryString) {
            if (params.queryString instanceof Map) {
                queryParams = Object.fromEntries(params.queryString);
            } else {
                queryParams = params.queryString;
            }
        }

        const token = params.url.includes('login') ? null : await getAuthToken(params.key);

        const headers = new AxiosHeaders();
        headers.set('Content-Type', 'application/json');
        headers.set('Accept', 'application/json');
        if (!params.url.includes('login')) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        config = {
            url: globalUrl,
            method: params.method,
            headers: headers,
            params: queryParams, // Axios appende la query string in automatico in modo sicuro
            data: params.body
        };
        Sentry.addBreadcrumb({
            category: 'api',
            level: "info",
            message: `Chiamata ${config.method || 'GET'} a ${config.url}`,
            data: {
                queryString: queryParams,
                body: config.data
            }
        })
        const response: AxiosResponse = await axios(config);
        if (params.url.includes('login')) {
            await globalLogin({response: response.data, fallbackUsername: params.body?.email ?? params.body?.username})
        }
        // console.log('RESPONSE:', JSON.stringify(response.data, null, 2))
        if (response.data?.data)
            return {
                data: response.data.data,
                status: response.status,
                message: response.statusText
            };
        else
            return {
                data: response.data,
                status: response.status,
                message: response.statusText
            };

    } catch (e: any) {
        // Gestione avanzata degli errori di Axios per popolare la ResponseKO
        const errorResponse: ResponseKO = {
            success: false,
            status: e.response?.status || 500,
            error: e.message || 'Errore di connessione',
            details: e.response?.data || null
        };

        // Estrazione messaggio d'errore leggibile
        let errorMsg = errorResponse.error;
        if (errorResponse.details) {
            if (typeof errorResponse.details === 'string') {
                errorMsg = errorResponse.details;
            } else if (errorResponse.details.message) {
                errorMsg = errorResponse.details.message;
            } else if (errorResponse.details.error) {
                errorMsg = errorResponse.details.error;
            }
        }

        // Visualizza l'overlay di errore globale
        showError(errorMsg);
        Sentry.captureException(errorResponse, {
            extra: {
                payload_request: config,
            },
        });

        throw errorResponse;
    }
};

export const logoutApi = async (user?:string) => {
    try {
        if(user) {
            const response = await CallApi({
                url: '/logout',
                method: 'GET'
            } as ParamsApi)
            console.log('LOGOUT EFFETTUATO', response)
            if (response)
                await logoutStore(user)
        }else{
            await delToken()
        }
    } catch (e) {
        console.log('LOGOUT EXC',e)
        throw e;
    }
}