# Curiosity Report: Mutation Testing

## Why is Mutation Testing cool?

I decided to learn more about a test verification strategy called "mutation testing." This topic is very interesting to me, because software is starting to be mostly written by AI, and consequently that means that AI is also writing most of the tests. The problem with that is if left unchecked, the tests can become meaningless if AI changes them or hardcodes them to pass even on faulty code. Mutation testing allows us to be able to see whether a test is actually pinning the correct behavior we think it is or not.

## What exactly is Mutation Testing? (with Stryker)

Stryker is one of the libraries that does mutation testing. It will introduce bugs and mutants into your code by finding return statements and changing properties of the return values. If none of the mutants or bugs break your test, then the mutant survived and you have an ineffective test. If at least one mutant or bug breaks your test, then you killed the mutant, and your tests are effective.

## How are mutants actually generated?

Mutants are generated in two steps (as explained [here](https://github.com/nickmoone/Pitest-Reactor/blob/master/so_you_want_to_build_mutation_testing_system.md)):

1. The bytecode is scanned for all possible mutations. A mutation is combination of:
   - The mutation operator
   - The class and method signature
   - The index to the original code
2. The mutant lists are handed off to "minions" (child processes) that generate the byte code for each mutant.

## What is state of the art for doing this efficiently today?

Today, in order for mutation testing to be fast and effective, "mutation switching" works by injecting mutants into your code all at once, but running tests with one mutant active per function, and then switching the active mutant each test run.

Here is an example from their post:

```js
function add(a, b) {
  return a + b;
}

//becomes -->

function add(a, b) {
  if (global.activeMutant === 0) {
    // 👾
  } else {
    return global.activeMutant === 1
      ? a - b // 👽
      : a + b;
  }
}
```

## Does mutation testing reveal something about our jwt pizza tests?

I decided to conduct an experiment using mutation testing on jwt pizza to see if our tests are really verifying what we think they are. Payment.tsx has 89% line coverage in my code base. After running my experiment I found out shocking news:

5 surviving mutants were found:

1. The singular/plural pie label can be wrong.

   ```diff
   {order.items.length} pie{order.items.length > 1 ? 's' : ''}
   + {order.items.length} pie{order.items.length > 1 ? 's' : "Stryker was here!"}
   ```

2. The "Send me those pizzas" message can appear under wrong conditions.

   ```diff
   {!errMessage && order.items.length > 1 && (
   -  <div className="text-neutral-100 p-2 rounded-md">Send me those {order.items.length} pizzas right now!</div>
   -)}
   +{true}
   ```

3. The total can subtract prices instead of adding them.

   ```diff
   {order.items.reduce((a: any, c: any) => a + c.price, 0).toLocaleString()} ₿
   + {order.items.reduce((a: any, c: any) => a - c.price, 0).toLocaleString()} ₿
   ```

## Steps to reproduce the experiment

## Set Up Stryker

Run the setup wizard:

```sh
npm init stryker@latest
```

Choose these options in order:

1. `None/other`
2. `command`
3. Press Enter
4. Press Enter
5. `npm`
6. `JavaScript`

Then set up `stryker.config.mjs`:

```js
// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "command",
  commandRunner: {
    command: "npm test",
  },
  mutate: ["src/views/payment.tsx"],
  coverageAnalysis: "off",
};

export default config;
```

Run mutation testing:

```sh
npx stryker run
```

## Conclusion

I learned that even having high test coverage does not actually guarantee that your tests are ensuring your code is behaving the way you think it is. If someone accidentally changed how the price gets calculated and made it so that it subtracted instead of added, the test would have passed and they would have moved forward with confidence. Mutation testing helps to find which tests are not yet completely testing all broken cases.


## References


- [How mutants are generated](https://github.com/nickmoone/Pitest-Reactor/blob/master/so_you_want_to_build_mutation_testing_system.md)
- [Stryker documentation](https://stryker-mutator.io/docs/) — introduction
- [Mutation switching](https://stryker-mutator.io/blog/announcing-stryker-4-mutation-switching) — Stryker 4 announcement
