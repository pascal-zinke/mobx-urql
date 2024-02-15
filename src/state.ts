import { CombinedError, Operation } from "@urql/core";

type State<T> = {
  fetching: boolean;
  stale: boolean;
  data?: T;
  error?: CombinedError;
  extensions?: Record<string, any>;
  operation?: Operation<T>;
};

const initialState: State<any> = {
  fetching: false,
  stale: false,
  error: undefined,
  data: undefined,
  extensions: undefined,
  operation: undefined,
};

export { initialState };
export type { State };
