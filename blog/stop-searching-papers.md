---
title: "Stop searching papers. Start navigating problems."
date: 2026-06-21
tags: [knowledge-graph, research, openalex, side-project, react]
canonical_url: ""   # put your portfolio URL here once it's live
---

# Stop searching papers. Start navigating problems.

A while back I tried to find out how distributed consensus actually got solved. Not one paper — the whole story. Who tried what, what blew up, what stuck.

You know how that goes. Google Scholar coughs up 2.3 million results. You open six tabs. Two are paywalled, one is a survey of surveys, one is a 1998 PDF scanned slightly crooked, and by the fourth you've forgotten what you were looking for. Forty minutes later I closed everything and read the Wikipedia article I'd been trying to avoid.

That annoyed me more than it should have. Because the information *exists*. It's just stored in the worst possible shape for a human who's actually curious.

## Papers are the wrong unit

Here's the thing nobody says out loud: we store knowledge as papers, but no human thinks in papers. Nobody wakes up wanting to read "paper #4,812,003." You want to know how a *problem* moved. Distributed consensus. Protein folding. Word embeddings. The paper is just the container the idea shipped in.

So the unit is wrong. Everything — search engines, citation graphs, "related papers" — is built around the container instead of the thing inside it.

Flip it. Make the **problem** the primary object, and hang everything off it:

> Problem → attempts → evidence → breakthroughs → what's still open.

That's it. That's the whole bet. You don't browse a library, you read a map. "Here's how consensus evolved: FLP says it's impossible, here's the trick everyone used to dodge that, here's Paxos, here's the part where Raft won on *readability* of all things, here's what's still unsolved."

I wanted to navigate that. So I built it. It's called Knowledge OS, it's live, and it's free: **evolve-snowy.vercel.app**.

## The graveyard I was walking into

Quick reality check, because I'm not the first person to think "GitHub for knowledge" and the idea has a body count.

Microsoft Academic Graph: shut down. Meta's Galactica, an AI that wrote science: pulled in *three days* because it confidently made things up. Half a dozen others are alive but circling the same drain. The hard part was never the database. SQLite can hold a few million rows in its sleep. The hard part is trust.

Because the moment a tool tells a researcher something interpretive — "this approach failed," "this is unsolved," "these two fields should talk" — and gets it wrong *once* in their own subfield, they never trust it again. Reasonably. So the design rule wrote itself:

**It is not allowed to make stuff up.** Everything traces back to data. If it can't ground a claim, it doesn't make the claim.

This is also why, when I built the "AI Scientist" part (the bit that suggests where a field could go), I made it *refuse* to detect contradictions. It can tell you "these two communities share a ton of authors but their papers never cite each other, maybe poke at that" — because that's just arithmetic on a graph. It will not tell you "Paper A refutes Paper B," because honestly figuring that out needs reading the actual claims, and faking it is exactly how you become a cautionary tweet.

## What I actually built

The boring-but-honest architecture:

- **The corpus** comes from OpenAlex — ~250 million papers, completely free, no key. I pulled 14,400 of them across 36 CS problems, with ~379k citation links and 25k authors. Stored in SQLite. (Yes, OpenAlex is real-world data, which means I have a paper in there literally titled "Lecture Notes in Computer Science 1205" sitting on 38,000 citations. The real world is messy. I left the mess visible instead of pretending.)
- **Problems** start as OpenAlex's topic tags, then I run TF-IDF + k-means over each one to *discover* the sub-problems hiding inside. No LLM. This isn't a cost dodge — per-paper LLM calls genuinely don't scale to millions of papers, but clustering does. The thing that's "good enough and infinite" beats the thing that's "great and bankrupt."
- **Timelines, the citation graph, "what this problem draws on"** — all just computed off the graph.
- **Ask it stuff** with ⌘K. "How did cryptography evolve?" "Who works on it?" It figures out what you're asking, pulls the right slice, and answers with citations. It runs entirely in your browser. There is no model behind it. It's dumb in the one honest way that matters: it only repeats what the data actually says.

No backend. No API keys. No bill. The Python builds a pile of JSON, a React app reads it, and the whole site is static. It costs me zero dollars a month to run, which is the correct price for a side project.

## The part where it looked like every other AI side project

I'll be honest about the embarrassing stretch. The first UI I shipped was *fine*. Clean. Centered. Four identical cards. The kind of thing that screams "a language model made this on a Tuesday."

I looked at it and went: this is boring. Minimal isn't supposed to mean boring — minimal is supposed to mean *expensive-looking*.

So I threw it out and gave it an actual point of view. Editorial. Serif headlines (Fraunces), a clay accent instead of the default startup-purple, warm off-white paper, hairline rules, little index numbers like a research journal. The signature move is a live knowledge-graph that shows a real problem branching into its attempts and breakthroughs, because the product *is* the graph — might as well lead with it.

Took a few tries. The lesson, again: the engine was done in days; making it not look generic took longer than I'd like to admit.

## What it can't do (yet)

- It only knows computer science right now. The engine doesn't care about the domain — widening it is basically one filter — but I had to start somewhere.
- "Problems" are topics-plus-clustering, which is coarser than reading every paper end to end. The full LLM pass is built and wired; it's just switched off until I feel like paying for it.
- Some citation counts look low because OpenAlex splits them across duplicate records. *Attention Is All You Need* shows a number that would make Vaswani sad. Not my bug, but I'm not hiding it either.

## So

I set out to answer one question — "how did this problem evolve?" — without drowning in PDFs. Now I can. You walk in through a problem, watch it grow decade by decade, see what won and what's still open, and ask it questions in plain English, and nothing in it is allowed to lie to you.

That feels like the right shape for knowledge. Less library, more map.

It's at **evolve-snowy.vercel.app**, the code's on GitHub, and if you want to argue with me about whether "topic" and "problem" are the same thing (they're not), my inbox is open.
