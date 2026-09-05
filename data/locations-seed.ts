import { StateItem, LgaItem, PollingUnitItem } from "@/types";
import rawData from "./nigeria-locations.json";

export const NIGERIA_STATES: StateItem[] = rawData.states as StateItem[];
export const NIGERIA_LGAS: LgaItem[] = rawData.lgas as LgaItem[];
export const NIGERIA_POLLING_UNITS: PollingUnitItem[] = rawData.pollingUnits as PollingUnitItem[];
