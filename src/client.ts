import { Client } from "@urql/core";
import { observable } from "mobx";

const clientObservable = observable.box<Client | undefined>();

function setClient(client: Client) {
  clientObservable.set(client);
}

function getClient() {
  const client = clientObservable.get();
  if (!client) {
    throw new Error(
      "No client was provided. Please create a client and provide it with setClient.",
    );
  }
  return client;
}

export { getClient, setClient };
