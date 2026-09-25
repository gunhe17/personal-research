# Prompting best practices

> Learn how to write effective prompts to get the most out of Poolside.

* [Be direct and specific](#be-direct-and-specific)
* [Minimize distracting context](#minimize-distracting-context)
* [Use multi-turn effectively](#use-multi-turn-effectively)
* [Encourage step-by-step progress for complex tasks](#encourage-step-by-step-progress-for-complex-tasks)

## Be direct and specific

When communicating with Poolside, as with humans, the clearer the task specification, the likelier it is that it gets solved.

* When interacting with Poolside, use clear and direct instructions, and avoid ambiguity.
* For large and complex tasks, avoid ambiguity by breaking down your task into smaller well-specified prompts.
* If you expect Poolside to produce code changes, prefer to ask it in an imperative manner like “add a function …”, “modify this code to …”, “change the `X` class to …”.

| Original Prompt                                                                                                                                                                            | Improved Prompt                                                                                                                                                                                                                                                                                                                                                                          |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `I need documentation for this file` <br /> It’s unclear what form the documentation should be in, and whether you are asking for the information, or want Poolside to add it to the file. | `Add docstrings with "args" and "return" sections to all methods in this file.` <br /> Specific, and it asks for code changes directly.                                                                                                                                                                                                                                                  |
| `Add a search function here` <br /> A lot of ambiguity here that leaves the correct implementation up for interpretation.                                                                  | `Add a search endpoint under /books/search/<title> that lets users search for books by a fuzzy title match.` <br /> Some ambiguity still exists, such as how to perform the search, but the task is well specified.                                                                                                                                                                      |
| `Make this code easier to maintain` <br /> An ambiguous and fairly complex task that implies multiple sub-tasks.                                                                           | `Split the main function into smaller functions. Replace the magic values with configurable constants. Refactor the code to use a class for X instead of passing all values individually.` <br /> You can often split a complex task into multiple concrete steps. If the breakdown is not clear, ask Poolside for suggestions, such as `How could I make this code easier to maintain?` |

## Minimize distracting context

Poolside can work with large contexts, but it may still focus on context that seems relevant to your question or task but is not. For best performance, minimize the irrelevant context you pass to Poolside.

* Include only the files relevant to your query in the context. Remove additional files/resources added with `@file` when they become irrelevant.
* Start a new conversation or clear the current one if the conversation history becomes irrelevant to the current task.
* Do not enable additional context like errors or application dependencies, if they are not directly relevant to your task.

## Use multi-turn effectively

Poolside has access to the full conversation history within the current conversation. Here are some tips to use this more effectively:

* Avoid ambiguous references to previous conversation turns. In many contexts, “this”, or “it” can refer to multiple things, and Poolside may not catch which one you mean.
* Be careful when you make code changes in the context files while referring to code changes earlier in the conversation. Code changes suggested by Poolside refer to the state of the context when Poolside generated the response, and it can get confused when the current file content does not match the state from the earlier turn you mean.
* A common pattern is to use multi-turn prompting to iterate on and refine Poolside's code suggestions in follow-up prompts. To avoid cluttering the conversation history, iterate until you get a good answer, apply it, and then start a new session for the next task.
* Use `/new` to start a new conversation or `/clear` to clean up the current conversation when the conversation history becomes irrelevant or cluttered.

## Encourage step-by-step progress for complex tasks

For more complex tasks, it can help to instruct Poolside to approach the task step by step. This gives Poolside more room to work through the task carefully and produce a more detailed, accurate answer. Not every task benefits from this approach, and it is not recommended for straightforward problems.

<Note>
  For complex tasks, try to add some version of “Work step by step. Briefly
  explain your approach and progress.” at the end of the prompt.
</Note>

| Original prompt                                                                                                                                                                                                                                                            | Improved prompt                                                                                                                                                                                                                                            |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ``Add a new `TopoSorter` class that implements the `Sorter` interface.`` <br /> While Poolside can succeed on complex tasks directly, answers can sometimes be superficial. For instance, the answer may focus only on making sure the new class adheres to the interface. | ``Add a new `TopoSorter` class that implements the `Sorter` interface. Work step by step. Briefly explain your approach and progress.`` <br /> Encouraging step-by-step progress generally leads to a more detailed and in-depth answer for complex tasks. |

{/*
<CardGroup cols={1}>
<Card>
  <iframe
    src="https://www.loom.com/embed/a3c5147dab44401397ae13454cf1ff4a?sid=b3a74264-4de5-4194-9562-653b4dd1d267"
    title="best practices - embed"
    className="w-full h-96 rounded-xl"
  ></iframe>
</Card>
</CardGroup>
*/}
