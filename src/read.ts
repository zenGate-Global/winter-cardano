import { Data } from './data';
import { ObjectDatum } from './models';

export function getEventDatum(plutusData: string): ObjectDatum {
  return Data.from<ObjectDatum>(
    plutusData,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    ObjectDatum
  );
}
