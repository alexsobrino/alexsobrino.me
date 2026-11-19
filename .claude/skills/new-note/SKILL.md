---
name: new-note
description: Start a new Note from a rough idea, with its frontmatter, slug and Tags in the right shape. Use when Alex wants to start, draft or add a Note.
---

# New Note

Turn Alex's rough idea into one new Note file, correctly shaped and ready for Alex to write in. Use the glossary's words throughout (`CONTEXT.md`): it is a **Note**, its topics are **Tags**, and the language it is written in is its **Content language**.

The notes collection's schema in `src/content.config.ts` is the authority on frontmatter; if it disagrees with this skill, follow the schema.

## 1. Propose, then ask once

From the idea, work out a proposal for the three things only Alex can settle, and ask about all three in one question:

- **Title**, in the Note's Content language.
- **Content language**: `es` or `en`. Guess from the language Alex wrote the idea in.
- **Tags**: read `src/content/tags.yml` and offer the declared Tags the Note is _substantially about_. A Note earns a Tag by being about that topic, not by mentioning it. If the idea is substantially about a topic with no declared Tag, propose that new Tag by name and ask whether the Note is substantially about it.

Everything else you decide yourself: the date is today unless Alex gives one, and the description is one line drafted from the idea, in the Content language.

Done when Alex has confirmed or corrected the title, Content language and Tags, including a yes or no on every proposed new Tag.

## 2. Declare any new Tag

Only for a new Tag Alex confirmed the Note is substantially about: add it to `src/content/tags.yml`, keyed by a short kebab-case ASCII slug (the Tag page's URL is `/notes/tags/<slug>/`), with the `name` the site shows. Match the shape of the Tags already there.

## 3. Write the Note

Pick the slug: a few words, lowercase, hyphenated, ASCII with accents dropped, **in the Note's Content language** (ADR-0001: the slug is the only part of the URL that follows the Content language). It must not match a file already in `src/content/notes/`.

Create `src/content/notes/<slug>.md`:

```markdown
---
title: '<title>'
date: <YYYY-MM-DD>
description: '<one line>'
tags: [<tag-slug>, <tag-slug>]
---

<Alex's rough idea, as given>
```

- Single-quote `title` and `description`, doubling any `'` inside them (`'It''s'`), so a `:` or `#` can't break the YAML.
- `tags` lists slugs from `tags.yml`; write `tags: []` when the Note has none.
- A Spanish Note leaves `lang` out: Spanish is the default. Any other Content language adds a line after `tags`, such as `lang: en`.
- The body is the idea as Alex gave it, a starting point for Alex to write over.

## 4. Verify

Run CI's checks, in order, and fix whatever they report until all three pass:

```sh
npm run check && npm run build && npm test
```

Then confirm the Note is listed where readers will look for it: `href="/notes/<slug>/"` appears in `dist/notes/index.html` and in `dist/notes/tags/<tag-slug>/index.html` for each of its Tags.

Done when check, build and tests pass, and the Note's link is on the Notes listing and on every one of its Tag pages.

## 5. Hand it back

Leave the Note uncommitted: pushing it to `main` publishes it, and Alex writes it first. Tell Alex the file path, its URL (`/notes/<slug>/`), its Tags, and any Tag you declared.
