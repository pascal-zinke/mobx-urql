import {
  AnyVariables,
  DocumentInput,
  OperationContext,
  OperationResult,
} from "@urql/core";
import { createAtom } from "mobx";
import { filter, onPush, pipe, take, toPromise } from "wonka";
import { getClient } from ".";
import { State, initialState } from "./state";

type ObservableMutationState<TData> = State<TData>;

type ObservableMutationReturn<
  TData = any,
  TVariables extends AnyVariables = AnyVariables,
> = {
  result: () => ObservableMutationState<TData>;
  execute: (
    variables: TVariables,
    context?: Partial<OperationContext>,
  ) => Promise<OperationResult<TData>>;
};

function observableMutation<
  TData = any,
  TVariables extends AnyVariables = AnyVariables,
>(
  mutation: DocumentInput<TData, TVariables>,
): ObservableMutationReturn<TData, TVariables> {
  let state: State<TData> = initialState;

  const atom = createAtom("ObservableMutation");

  return {
    result: () => {
      atom.reportObserved();
      return state;
    },
    execute: (variables: TVariables, context?: Partial<OperationContext>) => {
      state = { ...state, fetching: true };
      atom.reportChanged();
      const client = getClient();
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
export type { ObservableMutationReturn, ObservableMutationState };
