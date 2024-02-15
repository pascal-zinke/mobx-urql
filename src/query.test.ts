import { Client } from "@urql/core";
import { autorun, observable, runInAction } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { interval, map, pipe } from "wonka";
import { observableQuery } from "./query";

const mockQueryFn = vi.fn(() =>
  pipe(
    interval(100),
    map((i) => ({ data: i })),
  ),
);

const client = {
  query: mockQueryFn,
} as unknown as Client;

const mockQuery = `
  query todo($id: ID!) {
    todo(id: $id) {
      id
      text
      completed
    }
  }
`;

const mockVariables = {
  id: 1,
};

const observe = autorun;
const next = () => vi.advanceTimersToNextTimer();

beforeEach(() => {
  vi.useFakeTimers();
  mockQueryFn.mockClear();
});

describe("observableQuery", () => {
  it("should not fetch when not being observed", () => {
    const query = observableQuery(() => ({
      client,
      query: mockQuery,
      variables: mockVariables,
    }));
    expect(client.query).not.toBeCalled();
  });

  it("should start fetching when becoming observed", () => {
    const query = observableQuery(() => ({
      client,
      query: mockQuery,
      variables: mockVariables,
    }));
    observe(query.result);
    expect(client.query).toBeCalledTimes(1);
  });

  it("should pass variables to query function", () => {
    const query = observableQuery(() => ({
      client,
      query: mockQuery,
      variables: mockVariables,
    }));
    observe(query.result);
    expect(client.query).toBeCalledWith(mockQuery, mockVariables, undefined);
  });

  it("should update the result", () => {
    const query = observableQuery(() => ({
      client,
      query: mockQuery,
      variables: mockVariables,
    }));
    observe(query.result);
    next();
    expect(query.result().data).toBe(0);
    next();
    expect(query.result().data).toBe(1);
  });

  it("should reexecute when variables change", () => {
    const vars = observable.box(mockVariables);
    const query = observableQuery(() => ({
      client,
      query: mockQuery,
      variables: vars.get(),
    }));
    observe(query.result);
    runInAction(() => vars.set(mockVariables));
    expect(client.query).toBeCalledTimes(2);
  });

  it("should fetch when manually reexecuting", () => {
    const query = observableQuery(() => ({
      client,
      query: mockQuery,
      variables: mockVariables,
    }));
    observe(query.result);
    query.reexecute();
    expect(client.query).toBeCalledTimes(2);
  });

  it("should resume when return args", () => {
    const pause = observable.box(true);
    const query = observableQuery(() => {
      if (pause.get()) {
        return;
      }
      return {
        client,
        query: mockQuery,
        variables: mockVariables,
      };
    });
    observe(query.result);
    runInAction(() => pause.set(false));
    expect(client.query).toBeCalledTimes(1);
  });

  it("should cancel the subscription when manually disposed", () => {
    const query = observableQuery(() => ({
      client,
      query: mockQuery,
      variables: mockVariables,
    }));
    observe(query.result);
    next();
    expect(query.result().data).toBe(0);
    query.dispose();
    next();
    expect(query.result().data).toBe(0);
  });
});
