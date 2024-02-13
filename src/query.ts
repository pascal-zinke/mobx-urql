import {
  AnyVariables,
  Client,
  CombinedError,
  GraphQLRequestParams,
  Operation,
  OperationContext,
  OperationResult,
  OperationResultSource,
} from "@urql/core";
import { autorun, createAtom } from "mobx";
import { Subscription, pipe, subscribe } from "wonka";

type State<T> = {
  fetching: boolean;
  stale: boolean;
  data?: T;
  error?: CombinedError;
  extensions?: Record<string, any>;
  operation?: Operation<T>;
};

const initialState: State<unknown> = {
  fetching: false,
  stale: false,
  error: undefined,
  data: undefined,
  extensions: undefined,
  operation: undefined,
};

type Resolver<T> = (result: State<T>) => void;

type Args<TData = any, TVariables extends AnyVariables = AnyVariables> = {
  client: Client;
  context?: Partial<OperationContext>;
  pause?: boolean;
} & GraphQLRequestParams<TData, TVariables>;

function observableQuery<
  TData = any,
  TVariables extends AnyVariables = AnyVariables,
>(queryFn: () => Args<TData, TVariables>) {
  let state = initialState as State<TData>;
  let subscription: Subscription | undefined = undefined;
  let resolvers: Resolver<TData>[] = [];

  function resolve(result: State<TData>) {
    resolvers.forEach((resolve) => resolve(result));
    resolvers = [];
  }

  function fetch(
    source: OperationResultSource<OperationResult<TData, TVariables>>,
  ) {
    state.fetching = true;
    atom.reportChanged();
    subscription?.unsubscribe();
    subscription = pipe(
      source,
      subscribe((result) => {
        const prevResult = { ...state };
        state = {
          ...prevResult,
          ...result,
          data:
            result.data !== undefined ?? result.error
              ? result.data
              : prevResult.data,
          fetching: false,
        };
        resolve(state);
        atom.reportChanged();
      }),
    );
  }

  function start() {
    autorun(() => {
      const { client, query, variables, pause, context } = queryFn();
      if (pause) {
        return;
      }
      const source = client.query(query, variables as TVariables, context);
      fetch(source);
    });
  }

  function stop() {
    subscription?.unsubscribe();
    subscription = undefined;
  }

  const atom = createAtom("Query", start, stop);

  return {
    result() {
      atom.reportObserved();
      return state;
    },
    async reexecute(context?: Partial<OperationContext>) {
      const promise = new Promise<State<TData>>((_resolve) =>
        resolvers.push(_resolve),
      );
      const { client, query, variables } = queryFn();
      const source = client.query(query, variables as TVariables, context);
      fetch(source);
      return promise;
    },
    dispose() {
      stop();
    },
  };
}

export { observableQuery };
export type { State as ObservableQueryState };
