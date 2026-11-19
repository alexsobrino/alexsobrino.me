---
name: new-note
description: Start a new Note from Alex's rough idea, ready for Alex to write in.
---

# New Note

Speak the glossary (`CONTEXT.md`): a **Note**, its **Tags**, its **Content language**.

The notes collection's schema in `src/content.config.ts` is the authority on frontmatter; where it disagrees with this skill, follow the schema.

## 1. Propose, then ask once

From the idea, propose the three things only Alex can settle, and ask about all three in one question:

- **Title**, in the Note's Content language.
- **Content language**: `es` or `en`, guessed from the language Alex wrote the idea in.
- **Tags**: show every Tag declared in `src/content/tags.yml`, recommending those the Note is _substantially about_. A Note earns a Tag by being about that topic, not by mentioning it. When the idea is substantially about a topic no Tag covers yet, propose that new Tag by name and ask whether the Note is substantially about it.

Decide the rest yourself: the date is today unless Alex gives one, and the description is one line drafted from the idea, in the Content language.

Done when Alex has confirmed or corrected the title, Content language and Tags, including a yes or no on every proposed new Tag.

## 2. Declare any new Tag

For each new Tag Alex confirmed the Note is substantially about, add it to `src/content/tags.yml` in the shape of the Tags already there: a short kebab-case ASCII slug (it becomes the Tag page's URL) holding the `name` the site shows.

Done when every confirmed new Tag is declared, and nothing else in `tags.yml` changed.

## 3. Write the Note

Pick the slug: a few words, lowercase, hyphenated, ASCII with accents dropped, **in the Note's Content language** (ADR-0001: the slug is the only part of a URL that follows the Content language), and used by no file in `src/content/notes/`.

Create `src/content/notes/<slug>.md`, its body Alex's idea as given, for Alex to write over:

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
- `tags` lists slugs from `tags.yml`, or `[]` for a Note with none.
- A Spanish Note leaves `lang` out: Spanish is the default. An English Note adds `lang: en` after `tags`.

Done when exactly one new file sits in `src/content/notes/`, its frontmatter in this shape and its slug in the Note's Content language.

## 4. Verify

Run CI's checks, in order:

```sh
npm run check && npm run build && npm test
```

Fix what they report in the Note and `tags.yml`. A failure in any other file is not this Note's to fix: stop and tell Alex.

Then confirm the Note is listed where readers look for it: `href="/notes/<slug>/"` appears in `dist/notes/index.html` and in `dist/notes/tags/<tag-slug>/index.html` for each of its Tags.

Done when check, build and tests pass, and the Note's link is on the Notes listing and on every one of its Tag pages.

## 5. Hand it back

Leave the Note uncommitted: pushing it to `main` publishes it, and Alex writes it first.

Done when Alex has the file path, its URL (`/notes/<slug>/`), its Tags, and any Tag you declared.
