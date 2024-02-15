import {
  AnyVariables,
  Client,
  GraphQLRequestParams,
  OperationContext,
  OperationResult,
  OperationResultSource,
} from "@urql/core";
import { autorun, createAtom } from "mobx";
import { Subscription, pipe, subscribe } from "wonka";
import { State, initialState } from "./state";

type Resolver<T> = (result: State<T>) => void;

type ObservableQueryState<TData> = State<TData>;

type ObservableQueryArgs<
  TData = any,
  TVariables extends AnyVariables = AnyVariables,
> = {
  client: Client;
  context?: Partial<OperationContext>;
} & GraphQLRequestParams<TData, TVariables>;

type ObservableQueryReturn<TData = any> = {
  result: () => ObservableQueryState<TData>;
  reexecute: (
    context?: Partial<OperationContext>,
  ) => Promise<ObservableQueryState<TData>>;
  dispose: () => void;
};

function observableQuery<
  TData = any,
  TVariables extends AnyVariables = AnyVariables,
>(
  argsGetter: () => ObservableQueryArgs<TData, TVariables> | undefined,
): ObservableQueryReturn<TData> {
  let state = initialState;
  let subscription: Subscription | undefined = undefined;
  let resolvers: Resolver<TData>[] = [];

  function resolve(result: State<TData>) {
    resolvers.forEach((resolve) => resolve(result));
    resolvers = [];
  }

  function fetch(
    source: OperationResultSource<OperationResult<TData, TVariables>>,
  ) {
    state = { ...state, fetching: true };
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
      const args = argsGetter();
      if (!args) {
        return;
      }
      const { client, query, variables, context } = args;
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
      const args = argsGetter();
      if (!args) {
        return Promise.resolve(state);
      }
      const { client, query, variables } = args;
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
export type {
  ObservableQueryArgs,
  ObservableQueryReturn,
  ObservableQueryState,
};
