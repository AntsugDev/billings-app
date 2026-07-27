import axios, {AxiosHeaders, AxiosRequestConfig, AxiosResponse} from "axios";
import {getAuthToken, globalLogin} from "@/scripts/store/AuthStore";
import {showError} from "@/scripts/store/ErrorStore";

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

        // Se la rotta non è il login, verifica ed imposta il token Bearer
        if (!params.url.includes('login')) {
            if (!token) {
                throw new Error("Per procedere con la richiesta è necessario un token valido");
            }
            headers.set('Authorization', `Bearer ${token}`);
        }

        const config: AxiosRequestConfig = {
            url: globalUrl,
            method: params.method,
            headers: headers,
            params: queryParams, // Axios appende la query string in automatico in modo sicuro
            data: params.body
        };
        console.log("------------------------------------------------------------------")
        console.log('REQUEST:', JSON.stringify(config, null, 2))
        console.log("------------------------------------------------------------------")

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

        throw errorResponse;
    }
};