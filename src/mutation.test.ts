import { Client } from "@urql/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { delay, fromValue, pipe } from "wonka";
import { setClient } from "./client";
import { observableMutation } from "./mutation";

const mockMutationFn = vi.fn(() => pipe(fromValue({ data: 1 }), delay(100)));

const client = {
  mutation: mockMutationFn,
} as unknown as Client;

const mockMutation = `
  mutation addTodo($text: String!) {
    id
    text
    completed
  }
`;

const mockVariables = {
  text: "Foo",
};

const mockContext = {
  requestPolicy: "network-only",
} as const;

const next = () => vi.advanceTimersToNextTimer();

beforeEach(() => {
  vi.useFakeTimers();
  mockMutationFn.mockClear();
  setClient(client);
});

describe("observableMutation", () => {
  it("should initialize default state", () => {
    const mutation = observableMutation(mockMutation);
    expect(mutation.result().data).toBeUndefined();
    expect(mutation.result().fetching).toBe(false);
  });

  it("should update state when starting to fetch", () => {
    const mutation = observableMutation(mockMutation);
    mutation.execute(mockVariables);
    expect(mutation.result().fetching).toBe(true);
    expect(mutation.result().data).toBeUndefined();
  });

  it("should update state when fetching is done", async () => {
    const mutation = observableMutation(mockMutation);
    mutation.execute(mockVariables);
    next();
    expect(mutation.result().fetching).toBe(false);
    expect(mutation.result().data).toBe(1);
  });

  it("should only execute once", () => {
    const mutation = observableMutation(mockMutation);
    mutation.execute(mockVariables);
    expect(client.mutation).toBeCalledTimes(1);
  });

  it("should pass variables and context", () => {
    const mutation = observableMutation(mockMutation);
    mutation.execute(mockVariables, mockContext);
    expect(client.mutation).toBeCalledWith(
      mockMutation,
      mockVariables,
      mockContext,
    );
  });
});
