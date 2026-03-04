/// <reference types="vite/client" />

// Allow importing .jsx modules without type errors
declare module '*.jsx' {
    const component: any;
    export default component;
}

// Specific module declarations for existing JS files
declare module '@/context/AuthContext' {
    export function useAuth(): {
        user: any;
        login: (userData: any, token: string, resetRequired?: boolean) => void;
        logout: () => void;
        loading: boolean;
    };
    export function AuthProvider(props: { children: React.ReactNode }): JSX.Element;
}

declare module '@/api/axios' {
    import { AxiosInstance } from 'axios';
    const api: AxiosInstance;
    export default api;
}
