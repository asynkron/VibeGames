# Agent Guidelines

- Always capture and attach screenshots for visual or interactive changes. Run the updated experience and verify the browser console is free of errors before taking the screenshot.
- NEVER EVER leave legacy code in the repository, if you update something you need to complete the task.
- If you try to keep legacy support or any form of "backwards compatabillity", you immediately fail the current task and go directly to jail!
- Always always fully migrate code to any new API/functions/structure.
- When a task is done:
  * check browser for console errors
  * Take screenshots
  * grep/rg the codebase for any mention of legacy, fallback, backwards compat or any other variants that could point to trailing legacy code, if found, the task is not done, continue until no such trace is left..
