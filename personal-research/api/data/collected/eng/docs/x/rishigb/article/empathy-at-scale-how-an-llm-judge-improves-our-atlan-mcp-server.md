# Empathy at Scale: How an LLM Judge Improves Our Atlan MCP Server

**TL;DR:** An LLM judge scores every Atlan MCP outcome for real user value, and a loop turns the failures into shipped engineering fixes. I built it from 1,000 conversations read by hand.

At Atlan, we are obsessive about user value. It is nice that customers are using the product, but **usage is not value**. It only counts if they actually got what they came to do with the Atlan MCP. There are two ways to know: a user interview, deep but one customer at a time; or now, the proof of value in the trace itself, on every conversation at once.

Atlan is the [context layer for AI](https://atlan.com/), and it has an [MCP server](https://docs.atlan.com/product/capabilities/atlan-ai/how-tos/atlan-mcp-overview). Our customers use it in a variety of ways: inside their own coding agents like Claude Code and Cursor, inside their own agent development lifecycles, and through other harnesses like Glean. People keep finding new ways to build with it, from customer success agents to analytical solutions to competitive intelligence; you can see many of them in the [Atlan MCP Cookbook](https://atlan.com/mcp-cookbook/).

As the head of research, my job comes down to three questions.

1. What does value mean?
1. How is it measured?
1. How does that become action?

Ben has written about the [value loop as a concept](https://blog.atlan.com/product/measuring-user-value-on-an-mcp-server/). This post is about putting it into action: going from **empathy**, to designing the judge, to getting from a failed outcome to an **engineering fix**.

This work started with a quick realization about traces: you cannot make sense of one by looking at tool-call success. A call can come back a clean 200 and still hand the user nothing. 

> To mean anything, a trace needs a layer on top of it: learnings from the field, a layer of empathy, that turns raw calls into patterns you can act on and decisions you can make. Without it, all you have is tool-call success and failure.

![The empathy layer sits on top of the raw traces: a trace shows what happened, the judge shows whether it mattered.](https://pbs.twimg.com/media/HS7qrzpbQAAft03.jpg)

Fair warning: I am going to nerd out here. On the empathy, on the traces and the judge, on the actioning. These are the parts of the work I love most, and I hope you end up as excited about the journey as I am :)

## Identifying value, how it translates to traces, building a judge, and taking action

It starts with empathy. I spend a lot of my time with customers, the power users and the top accounts, because that is how I come to understand, deeply, what they are trying to do and whether they are getting it. To me, customer empathy is not a survey score; it is a real understanding of the person on the other side of the tool call.

By the end of my first cohort of interviews, I knew, anecdotally, what value meant for these users, and that they were getting it. What I could not see was what that value looked like in actual behavior: where in an agent’s journey it got unlocked, and how to make it better. You cannot hear that in an interview. You have to sit with the traces.

> Studying those traces by hand, I settled the first question fast: what you judge is the **whole outcome**, read across the whole trace, not the pipeline alone.

The value loop rests on **one move**: take that empathy from the field and codify it into a judge that runs on top of the traces, on every conversation, not just the ones I could read by hand. The judge says whether value was received. When it was not, it says what was missing, which points to what to build next. 

Here is how it came together.

![How the judge is built: field research encoded into a deterministic classifier and an LLM judge that reads each conversation end to end and scores every outcome 1 or 0.](https://pbs.twimg.com/media/HS7rWlgakAA9okA.jpg)

**Step one, manually and locally.** I started the hard way, by hand, one at a time, through a sample of 1,000 conversations (a conversation being the whole group of spans and traces that belong to it), grouped by the outcome ID that clients like Glean and Claude now send, where each outcome is one user intent. **That outcome ID is newer than it sounds, and it is what makes judging a whole conversation possible at all; the rest of the space is only just standardizing on it.** Reading them one by one, I started to see it: the structure, the rationale, what the agent was actually doing at each step, and the signals that tell whether the response was any good. The question underneath all of it is simple. Did the task get resolved, and did every part of the conversation get answered?

Could all of this just go to Claude to find the patterns? Sure. But unless you have already found a way to name the pattern yourself, the one only you can name, built from time in the field and the specific things you catch in a trace, the model just gets you to the wrong answer faster. This part had to be manual, and it paid off.

**Step two, designing the judge.** With the patterns in hand and the failure modes understood, I wrote all of it into a judge, built and validated locally. At a high level, it has two parts.

The first part is deterministic. Pure code, no LLM anywhere near it: a behavioral classifier I built does the work. It reads the traces, the behavior across a whole conversation, and the direction the user was pushing in, and buckets each person by what they were actually trying to do. Just search and discovery? Actively building something? Here for the regular maintenance and enrichment? Those are the personas, straight from the field. Turning them into a deterministic classifier is how the empathy became something to act on. That same layer also tags where in the pipeline things broke: retrieval, synthesis, selection, formulation, or infra.

> The fuzziest thing in all of research, what the user actually wanted, is now a deterministic classifier that runs on every trace. Empathy you can run in code.

The second part is non-deterministic: the LLM judge that reads the full trace, end to end, and calls whether the outcome actually landed for the user. Put the two together and one shot returns a lot. The verdict is one of nine outcomes, either resolved (including after recovery, or partial) or not_resolved, with the reason attached. The persona, use case, and category say what the user was trying to do. The break stage says where it broke. The rationale says why.

**How much of the trace to show it.** Most MCP traffic is multi-turn, more than 80% of it, so grading a single call misses almost everything. Before I settled on a model, I ran a smaller experiment that turned out to be half the lesson. I built the judge in versions and ran each against a fixed benchmark: 264 real traces, sampled from roughly 6,300 and deliberately stacked with the cases known to be hard to grade. Long, multi-step conversations (11+ tool calls, into the dozens in the benchmark and the hundreds in production), and redacted-output traces, where the rows were stripped from the logs for security, so the judge has to grade from metadata, not data. I graded every one of those 264 by hand first, to set the ground truth: 224 of them, about 85%, had actually delivered value, and 40 had not. That gave a fixed reference to score each version of the judge against. The model stayed constant. The only thing that changed was *how much of each trace the judge got to see*, and the more it saw, the better the verdicts got.

| Version | What the judge could see | Overall (264) | Long (11+) | Redacted |
|---|---|---|---|---|
| **v1** | The single best output, ~2,000 chars | **45%** | 46% | 37% |
| **v2** | Every call, each truncated to a sliver | **60%** | 34% | 44% |
| **v3** | The full conversation, read end to end | **79%** | **88%**  | **81%** |

The depth breakdown says it plainly. v2 was worst exactly where conversations were longest, because it could see that many steps happened but each was truncated to a sliver, so a long thread read like a pile of dead ends instead of a task being worked to completion. v3 was the first version that got *better* as conversations got longer, because it was the first one that could actually read the whole thing. And the jump was not the judge going soft: it caught successes v1 had wrongly failed and failures v1 had wrongly passed. It got more accurate in both directions. Against that 85% reference, v3’s 79% lands within a few points of the truth, while v1 (45%) and v2 (60%) badly under-counted the real passes.

The goal was never to overfit the judge to that human line. Ground truth is a reference, not a target: chase 85% exactly and you just teach the judge to imitate one batch of labels. 79% is a strong, honest read, close enough to trust what it says is happening, with enough room that a quick human spot-check every so often keeps surfacing where the judge itself can get better over time.

![The more of each conversation the judge could see, the more accurate its verdicts: from 45% (v1) to 79% (v3), against a human ground truth of about 85%.](https://pbs.twimg.com/media/HS7sXjWbYAAqUbm.jpg)

This only works if the model can hold the whole conversation at once. Some of these threads run hundreds of turns, and the smaller-context setups early on would lose the plot on the long ones, handing back a reason for a pass or a fail that made no sense because they had no idea what came before. They had hit their capacity and called it.

So the judge runs on a model with a context window big enough to read an entire conversation end to end and still reason across it. Which model that is will keep changing as the threads get more complex; the requirement is what stays fixed. More on that as the judging continues.

**Step three, moving to our traces and evals platform.** Once the judge held up locally, its verdicts matching the gaps I had already found by hand in the manual traces, I moved it onto our traces and evals platform. Now it scores outcomes live, in real time, instead of long after the fact, which means the numbers are decisions you can actually act on. The empathy that used to live in a notebook now runs on every conversation, continuously. :) 

## Failure modes

What is a failed outcome? One where the judge decided the user never reached value. It does not just hand back a zero; it points at what actually broke. Lined up, the same four failure modes kept surfacing.

1. **Misrouted tool.** The wrong tool got called for the ask, sending the question down a path that was never going to answer it, like leaning on metadata when the real answer needed an actual SQL query against a table.
1. **Multipart question.** The user packed several asks into one question, and only the first got answered, leaving the rest unresolved.
1. **Missing data.** The user asked about something that was never documented, so there was no underlying data or context anywhere to ground an answer in.
1. **Capability gap.** The user wanted something Atlan simply does not do today, often a write or create request, when the MCP was built to answer questions, not to act. Often they did not even know it was missing, because they reached Atlan through another client.

Two of these point straight at the roadmap: capability gap and missing data. When customers reach Atlan through a harness like Glean or their own agent, Atlan is abstracted away. They are not thinking about what Atlan provides today, only about the outcome they need to get to. So when Atlan cannot get them there, the failure is unusually precise. It shows which capabilities to build, and where the data itself is missing: data to enrich with the customer, so those answers start coming back through the system too. That is a roadmap: what to validate in research next, and what to build.

**Every failed outcome is a signal of a missed expectation, and an opportunity to build.**

## From a failure mode to a fix an engineer can act on

All of this means nothing if an engineer does not know what to fix. How do you take a failure mode and turn it into something an engineer can actually act on, so they know precisely what to change, and where?

![Every failure routes by type: the code gap to the daily agent and an engineer, the data gap to Customer Success, the product gap to Product leaders.](https://pbs.twimg.com/media/HS7s2RfbEAEl3yQ.jpg)

For that I do two things.

First, an agent runs in the runtime every day, sifting the failed outcomes to find which part of the system is breaking. Wired into our GitHub repo, it traces each pattern back to the code that owns it (planner, routing, fallback, or completion), points straight at the fix, and proposes a new eval so the same thing never quietly regresses. Second, I built a dataset on our traces and evals platform that runs on every change, so a new model or a wider context window can be tested before it ships.

The exception is when the data was never in the catalog.

A data gap is different: with no code to fix, it becomes a customer-success play to enrich the data, a UX nudge that flags what is missing in the moment, and a route to the admins or context agents who can document it at the source.

## What an engineer actually sees

![The engineer’s view: every outcome for one customer with its failure mode and verdict, and the same root cause surfacing across four customers.

](https://pbs.twimg.com/media/HS7tE32a8AArwjW.jpg)

So what actually lands in front of an engineer? This view. Every outcome, its failure mode, the verdict, and the rationale for what actually happened. And when the same reason shows up across customers, it surfaces as a pattern. Four customers, fourteen outcomes, one root cause.

From there, the patterns become ranked Linear tickets, sorted by impact over effort: how many outcomes and how many tenants a gap hits, divided by how much work the fix takes. The whole thing lands scoped enough that our AI SDLC can take it straight to a pull request, ready for human review and shipping.

And all of this is only meaningful because of the work that came before it in the pipeline: the judge, the classifier, the failure modes, the daily agent tracing patterns back to code. That context is what makes it possible to scope a problem with enough detail and enough examples that an engineer, human or agent, can make changes in the right parts of the code and test them, so the pattern does not repeat. That is what this entire pipeline has led to.

## The loop closes itself

Research used to sit at the edge of the process: run the study, hand over early signals about what to build, then wait to see what shipped. With AI, it can do far more than signal. It can define what value actually looks like in a user’s experience and check every outcome against it, continuously. The step now is to close that into a control loop: a system that watches its own outcomes, finds exactly where it let the user down, and opens the pull request to fix it. A well-scoped problem statement, handed to AI, AI engineers, and an AI SDLC working in tandem, drives fixes at scale so the outcomes actually get better for the user. Research stops being a report that lands after the fact and becomes a core part of the AI product-development lifecycle, which at Atlan is being rebuilt around AI end to end. That is what [Becoming Frontier](https://atlan.com/frontier/) looks like from inside research: getting more ambitious, not just more efficient.

![The whole loop end to end: the MCP server emits the traces, the judge scores them for value, and every miss ships back as a fix.](https://pbs.twimg.com/media/HS7tUinbIAA8mKq.jpg)

**For most teams, an eval is a report card. Ours is a control loop.** It traces the failure to the code, ranks the fix, and opens the pull request that resolves it, ready for a human to ship. The eval stops being a number to report and becomes the thing that redesigns the product.

The empathy this started with, a thousand conversations I read by hand, now runs in code on every outcome, all the way to a pull request. **Which means we no longer have to hope the value landed. The proof is in the trace.**
