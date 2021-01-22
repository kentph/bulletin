import { useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";

/**
 * Convenience wrapper around a useSelector that just returns a state field.
 *
 * @param sliceName Name of slice where field is located.
 * @param fieldName Name of field to get.
 */
export default function useFieldSelector<
  TSliceKey extends keyof RootState,
  TFieldKey extends keyof RootState[TSliceKey]
>(sliceName: TSliceKey, fieldName: TFieldKey): RootState[TSliceKey][TFieldKey] {
  return useSelector((state: RootState) => state[sliceName][fieldName]);
}
