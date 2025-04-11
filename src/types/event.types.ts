import type { PlutusScript } from "@meshsdk/core";

export type EventFactoryValidators = {
  objectEvent: PlutusScript;
  singleton: PlutusScript;
};
