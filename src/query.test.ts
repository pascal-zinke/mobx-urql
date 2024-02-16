import { Client } from "@urql/core";
import { autorun, observable, runInAction } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { interval, map, pipe } from "wonka";
import { setClient } from "./client";
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

const mockContext = {
  requestPolicy: "network-only",
} as const;

const observe = autorun;
const next = () => vi.advanceTimersToNextTimer();

beforeEach(() => {
  vi.useFakeTimers();
  mockQueryFn.mockClear();
  setClient(client);
});

describe("observableQuery", () => {
  it("should not fetch when not being observed", () => {
    const query = observableQuery(() => ({
      query: mockQuery,
    }));
    expect(client.query).toBeCalledTimes(0);
  });

  it("should start fetching when becoming observed", () => {
    const query = observableQuery(() => ({
      query: mockQuery,
    }));
    observe(query.result);
    expect(client.query).toBeCalledTimes(1);
  });

  it("should pass variables and context", () => {
    const query = observableQuery(() => ({
      query: mockQuery,
      variables: mockVariables,
      context: mockContext,
    }));
    observe(query.result);
    expect(client.query).toBeCalledWith(mockQuery, mockVariables, mockContext);
  });

  it("should update the result", () => {
    const query = observableQuery(() => ({
      query: mockQuery,
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
      query: mockQuery,
      variables: vars.get(),
    }));
    observe(query.result);
    runInAction(() => vars.set(mockVariables));
    expect(client.query).toBeCalledTimes(2);
  });

  it("should pause when args are undefined", () => {
    const query = observableQuery(() => undefined);
    observe(query.result);
    expect(client.query).toBeCalledTimes(0);
  });

  it("should resume when providing args again", () => {
    const pause = observable.box(true);
    const query = observableQuery(() => {
      if (!pause.get()) {
        return {
          query: mockQuery,
          variables: mockVariables,
        };
      }
    });
    observe(query.result);
    runInAction(() => pause.set(false));
    expect(client.query).toBeCalledTimes(1);
  });

  it("should fetch when manually reexecuting", () => {
    const query = observableQuery(() => ({
      query: mockQuery,
    }));
    query.reexecute();
    expect(client.query).toBeCalledTimes(1);
  });

  it("should pass variables and context when manually reexecuting", () => {
    const query = observableQuery(() => ({
      query: mockQuery,
      variables: mockVariables,
    }));
    query.reexecute(mockContext);
    expect(client.query).toBeCalledWith(mockQuery, mockVariables, mockContext);
  });

  it("should use default context when manually reexecuting without context", () => {
    const query = observableQuery(() => ({
      query: mockQuery,
      variables: mockVariables,
      context: mockContext,
    }));
    query.reexecute();
    expect(client.query).toBeCalledWith(mockQuery, mockVariables, mockContext);
  });

  it("should cancel the subscription when manually disposed", () => {
    const query = observableQuery(() => ({
      query: mockQuery,
    }));
    query.reexecute();
    next();
    expect(query.result().data).toBe(0);
    query.dispose();
    next();
    expect(query.result().data).toBe(0);
  });
});
