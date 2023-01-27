import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { Displays } from "src/types/Displays";
import { OFFER_TYPE } from "src/types/offer/OfferType";

// MARKET
export const isRefreshedAutoAtom = atomWithStorage<boolean>("isRefreshedAuto",false);
export const nameFilterValueAtom = atom<string>("");
export const tableOfferTypeAtom = atom<OFFER_TYPE>(OFFER_TYPE.SELL)

// INTERFACE 
export const displayChoosedAtom = atomWithStorage<Displays>("displayChoosed",Displays.TABLE);
export const shieldDisabledAtom = atomWithStorage<boolean>("shieldDisabled",false);
export const shieldValueAtom = atomWithStorage<number>("shieldValue",0.05);