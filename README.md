# mobx-urql

mobx-urql is a library that provides [mobx](https://mobx.js.org/) bindings for the graphql client [urql](https://github.com/urql-graphql/urql). It allows you to easily integrate urql with MobX to manage your application state.

## Installation

Use your package manager of choice to install `mobx-urql`:

#### npm

```sh
npm install mobx-urql
```

#### yarn

```sh
yarn add mobx-urql
```

#### pnpm

```sh
pnpm add mobx-urql
```

## Usage

The library provides an `observableQuery` function for querying data and an `observableMutation` function for sending mutations. In the following example, we'll use an imaginary GraphQL API for querying and updating todos. The documentation assumes that you already have a basic understanding of both `urql` and `mobx`. Let's get into it.

## Query

### Runnning a query

First we'll want to fetch our list of todos. We'll assume that our urql client is already set up and we have created our `TodosQuery`.

```js
import { observableQuery } from "mobx-urql";
import { autorun } from "mobx";

const query = observableQuery(() => ({
  client, // your urql client
  query: TodosQuery, // your query
}));

autorun(() => {
  console.log(query.result().data);
});
```

Here we created our first `observableQuery`. We can use the `result()` function to access the queries latest result. The result object is an [OperationResult](https://commerce.nearform.com/open-source/urql/docs/api/core/#operationresult) with an additional `fetching` property indicating whether data is currently being fetch.

It is important to note that the query is only executed, when the result is being observed i.e. `result()` has been called inside a tracked function. You can read more about mobx's reactivity [here](https://mobx.js.org/understanding-reactivity.html). When the result is not beeing observed anymore, the underlying subscription is automatically disposed.

### Updating variables

Let's say we want to filter our list of todo items with a search string. We updated our `TodosQuery` to accept a variable called `search`.

```js
import { observableQuery } from "mobx-urql";
import { autorun, observable } from "mobx";

const search = observable.box("");

const query = observableQuery(() => ({
  client, // your urql client
  query: TodosQuery, // your query
  variables: {
    search: search.get(),
  },
}));

autorun(() => {
  console.log(query.result().data);
});

search.set("foo");
```

If we run this code, we'll see that our query is executed twice. This is because `observableQuery` tracks all observables inside its arguments and reexecutes if any of them change. Again, you can read more about mobx's reactivity [here](https://mobx.js.org/understanding-reactivity.html).

### Pausing the query

We can pause a query by simply returning `undefined` as `observableQuery`'s arguments. This is sometimes useful if a query has mandatory variables, but we don't have any value yet. Let's say we want to fetch todos for a specific todo list, but the user has not selected a list yet.

```js
import { observableQuery } from "mobx-urql";
import { autorun, observable } from "mobx";

const list = observable.box(null);

const query = observableQuery(() => {
  const listId = list.get().id;
  if (listId == null) return;
  return {
    client, // your urql client
    query: TodosQuery, // your query
    variables: { listId },
  };
});

autorun(() => {
  console.log(query.result().data);
});

list.set({ id: 1 });
```

### Context options

We can optionally pass context options to `observableQuery`.

```js
import { observableQuery } from "mobx-urql";
import { autorun } from "mobx";

const query = observableQuery(() => ({
  client, // your urql client
  query: TodosQuery, // your query
  context: {
    requestPolicy: "network-only",
  },
}));
```

### Manually reexecuting

We can manually reexecute a query by using the `reexecute` function. This asynchronous function returns the new result object and updates the the query's `result()`. We can optionally pass in context options as well.

```js
import { observableQuery } from "mobx-urql";
import { autorun } from "mobx";

const query = observableQuery(() => ({
  client, // your urql client
  query: TodosQuery, // your query
}));

autorun(() => {
  console.log(query.result().data);
});

const result = await query.reexecute({ requestPolicy: "network-only" });
```

Manually reexecuting a paused query will resolve immediately and return the current result object.

Warning: Manually reexecuting a query that never becomes observed creates a memory leak. That means if you call `reexecute()` and never call `result()` inside a tracked function, you have to manually call `query.dispose()`. This should rarely be the case however.

## Mutation

### Sending a mutation

Let's say we want to complete a todo from our list. We created a `CompleteTodoMutation` that takes in an `id` of a todo. Again our urql `client` is already set up as well.

```js
import { observableMutation } from "mobx-urql";

const mutation = observableMutation({
  client, // your urql client
  mutation: CompleteTodoMutation, // your mutation
});

mutation.execute({ id: 1 });
```

Here we created an `observableMutation` and then called the `execute` function to send our mutation to our API. This function accepts the variables for the mutation and optionally some context options as a second argument.

### Using the mutation result

We have two ways of accessing our mutations result. We can either – just like with our query – call `result()` on our mutation to get the latest result object, or we can use the promise that is returned from the `execute` function.

```js
import { observableMutation } from "mobx-urql";
import { autorun } from "mobx";

const mutation = observableMutation({
  client, // your urql client
  mutation: CompleteTodoMutation, // your mutation
});

autorun(() => {
  console.log(mutation.result().data);
});

const result = await mutation.execute({ id: 1 });
```
