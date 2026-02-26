import { AUTH_MESSAGES_EN, AUTH_MESSAGES_HI, AUTH_MESSAGES_ES } from "./index";

const MAP = {
    en: AUTH_MESSAGES_EN,
    hi: AUTH_MESSAGES_HI,
    es: AUTH_MESSAGES_ES
} as const;



export type Locale = keyof typeof MAP;


export function resolveAuthMessage(
    code: number,
    locale: Locale = "en"
): string {
    return MAP[locale][code] ?? "Unknown error";
}