import {
  AnyVariables,
  Client,
  DocumentInput,
  OperationContext,
  OperationResult,
} from "@urql/core";
import { createAtom } from "mobx";
import { filter, onPush, pipe, take, toPromise } from "wonka";
import { State, initialState } from "./state";

type ObservableMutationState<TData> = State<TData>;

type ObservalbeMutationArgs<
  TData = any,
  TVariables extends AnyVariables = AnyVariables,
> = {
  mutation: DocumentInput<TData, TVariables>;
  client: Client;
  context?: Partial<OperationContext>;
};

type ObservableMutationReturn<
  TData = any,
  TVariables extends AnyVariables = AnyVariables,
> = {
  result: () => ObservableMutationState<TData>;
  execute: (variables: TVariables) => Promise<OperationResult<TData>>;
};

function observableMutation<
  TData = any,
  TVariables extends AnyVariables = AnyVariables,
>(
  argsGetter: () => ObservalbeMutationArgs<TData, TVariables>,
): ObservableMutationReturn<TData, TVariables> {
  let state: State<TData> = initialState;

  const atom = createAtom("ObservableMutation");

  return {
    result: () => {
      atom.reportObserved();
      return state;
    },
    execute: (variables: TVariables) => {
      const { client, mutation, context } = argsGetter();
      state = { ...state, fetching: true };
      atom.reportChanged();
      return pipe(
        client.mutation(mutation, variables, context),
        onPush((result) => {
          state = {
            fetching: false,
            stale: result.stale,
            data: result.data,
            error: result.error,
            extensions: result.extensions,
            operation: result.operation,
          };
          atom.reportChanged();
        }),
        filter((result) => !result.hasNext),
        take(1),
        toPromise,
      );
    },
  };
}

export { observableMutation };
export type {
  ObservableMutationReturn,
  ObservableMutationState,
  ObservalbeMutationArgs,
};
