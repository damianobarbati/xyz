# Testing 

- Add proper unit and integration testing (eg: vitest)
- Add proper interaction testing (eg: components on React Story)
- Add proper e2e testing on happy paths (eg: Playwright)
- Add unit tests only for complex pure functions/algorithms
- Add integration tests for feature flows
- Do not write clever test helpers, be explicit
- Make test setup explicit
  - Load the required fixture inside the test when possible.
  - Do not put a default fixture in `beforeEach` when only some tests need it.
  - A reader must see the test input without searching for hidden setup.
- Avoid redundant expectations.
  - One expectation must prove one behavior.
  - Remove a second expectation when the first one already proves the same result.
  - Keep an explicit exclusion check when exclusion is the behavior under test.
- Don't write meaningless tests that add no coverage or behavior value.
- Prefer vitest `.matchObject` assertions to group expectations.
