---
name: new-note
description: Start a new Note from Alex's rough idea or draft, its body written in Alex's voice.
---

# New Note

Speak the glossary (`CONTEXT.md`): a **Note**, its **Tags**, its **Content language**.

The notes collection's schema in `src/content.config.ts` is the authority on frontmatter; where it disagrees with this skill, follow the schema.

Alex brings an **idea** (a few rough lines) or a **draft** (a body Alex wrote). Either way it ends as one Note whose body follows the voice guide in step 3, built only from what Alex said.

A draft can already be a Note file that isn't published yet (not on `main`): a **Note-file draft**. It keeps its file, slug and frontmatter; only its body is reworked.

## 1. Propose, then ask once

From the idea or draft, propose what only Alex can settle, and ask about all of it in one question:

- **Title**, in the Note's Content language.
- **Content language**: `es` or `en`, guessed from the language Alex wrote in.
- **Tags**: show every Tag declared in `src/content/tags.yml`, recommending those the Note is _substantially about_. A Note earns a Tag by being about that topic, not by mentioning it. When the Note is substantially about a topic no Tag covers yet, propose that new Tag by name and ask whether the Note is substantially about it.
- **What the Note says**: its point, why it matters now, and what the reader should take away. From an idea, ask Alex for all three. From a draft, read them out of the draft and offer them back for Alex to confirm.

A Note-file draft asks only what the Note says.

Decide the rest yourself: the date is today unless Alex gives one, and the description is one line drafted from the point Alex confirms, in the Content language.

Done when Alex has confirmed or corrected every item asked, including a yes or no on every proposed new Tag.

## 2. Declare any new Tag

For each new Tag Alex confirmed the Note is substantially about, add it to `src/content/tags.yml` in the shape of the Tags already there: a short kebab-case ASCII slug (it becomes the Tag page's URL) holding the `name` the site shows.

Done when every confirmed new Tag is declared, and nothing else in `tags.yml` changed.

## 3. Draft the body

Read the published Notes (those in `src/content/notes/` on `main`): they are the voice, and the guide below names what they share. Then draft the body from Alex's material alone: the idea or draft and Alex's answers from step 1. Restructure, cut and sharpen freely; every experience, opinion and fact stays Alex's. Reworking a draft keeps every claim Alex made in it.

When the body needs something Alex hasn't given (a moment for the hook, the reason behind an opinion, an example, a link), ask Alex for it, and draft that part from the answer.

Done when the body follows every line of the voice guide, and you can point to where Alex said each claim in it.

### Voice guide

Drawn from the published Notes; its examples quote "Reto: un libro al mes", the first of them.

- **Hook first.** The first lines carry the tension or the reason to care; background follows. "Reto" opens on the shift itself ("Estamos viviendo un cambio de paradigma en la ingeniería de software") and names the challenge only in its third paragraph.
- **Short paragraphs, one idea each**, of one to three sentences.
- **Bold the single line that matters most**, the one a skimming reader should leave with: in "Reto", the challenge itself, **leer, como mínimo, un libro al mes.** One bold line per Note, even though "Reto" also bolds a second phrase. A list of parallel things bolds each item's name instead, as "Reto" does for its books.
- **`##` sections only when the Note is long enough** that a reader needs to find their way in it. Headings are short and plain, and can be a question ("¿Y tú qué me recomiendas?"). A short Note is a run of paragraphs.
- **Link what the Note names**, inline, as "Reto" links each book, using the URL Alex gives.
- **Close by turning to the reader**: a question or an invitation in the second person. "Reto" ends on "Y si tienes un libro que te cambió la forma de programar, me encantaría saber cuál es." The point is already made, so the closing moves forward instead of summing up.
- **Written in the Note's Content language** from the first word. Spanish reads the way Alex writes it: first person, _tú_ to the reader, everyday idiom over phrasing carried over from English ("da igual los años que llevemos en esto", "sobre la marcha").

## 4. Write the Note

A Note-file draft: replace its body with the drafted one, and leave its frontmatter and slug as they are.

Otherwise, pick the slug: a few words, lowercase, hyphenated, ASCII with accents dropped, **in the Note's Content language** (ADR-0001: the slug is the only part of a URL that follows the Content language), and used by no file in `src/content/notes/`.

Create `src/content/notes/<slug>.md`:

```markdown
---
title: '<title>'
date: <YYYY-MM-DD>
description: '<one line>'
tags: [<tag-slug>, <tag-slug>]
---

<the drafted body>
```

- Single-quote `title` and `description`, doubling any `'` inside them (`'It''s'`), so a `:` or `#` can't break the YAML.
- `tags` lists slugs from `tags.yml`, or `[]` for a Note with none.
- A Spanish Note leaves `lang` out: Spanish is the default. An English Note adds `lang: en` after `tags`.

Done when the Note is exactly one file in `src/content/notes/` holding the drafted body, and, unless it is a Note-file draft, its frontmatter is in this shape and its slug in the Note's Content language.

## 5. Verify

Run CI's checks, in order:

```sh
npm run check && npm run build && npm test
```

Fix what they report in the Note and `tags.yml`. A failure in any other file is not this Note's to fix: stop and tell Alex.

Then confirm the Note is listed where readers look for it: `href="/notes/<slug>/"` appears in `dist/notes/index.html` and in `dist/notes/tags/<tag-slug>/index.html` for each of its Tags.

Done when check, build and tests pass, and the Note's link is on the Notes listing and on every one of its Tag pages.

## 6. Hand it back

Show Alex the body in full, then sum up the main changes in a few bullets, each naming what changed and the line of the voice guide it serves ("moved the challenge below the shift: hook first"). From an idea, the changes are how you shaped it into a body.

Alex has the final say: apply any correction Alex gives, then verify again.

Leave the Note uncommitted: pushing it to `main` publishes it, and Alex reads it first.

Done when Alex has the body, the summary of changes, the file path, its URL (`/notes/<slug>/`), its Tags, and any Tag you declared, and every correction Alex gave is applied and verified.
