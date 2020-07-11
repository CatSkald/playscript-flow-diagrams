# Playscript Flow Diagrams

> Let your services perform!

[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen)](/LICENSE)

This small project allows you to automatically generate flow diagrams based on textual representation in a form of a playscript written in _YAML_.

A helpful tool for anyone who is more into literature than visual arts, or who prefers typing over drawing.

## Glossary

A small glossary of playwriting terms.

- **Play** - a work of drama, consisting mostly of dialogue between characters and intended for theatrical performance rather than just reading.
- **Playscript** - a text of the play.
- **Playwright** - a person who writes plays. Start using this library and feel free to add "playwriting" to your CV 😄
- **Plot** - the sequence of events which take place in a story (or on a diagram).
- **Act** - a play is divided into acts, similar to what chapters are in a novel. An act is subdivided into scenes.
- **One-acter** - a play consisting of a single act.
- **Scene** - a scene is a unit of action. Usually each scene is set at one specified location, but in our case each scene represents one flow.
- **Character** - a figure who undertakes the action of the plot. In our case it can be user, application, service, system, etc.
- **Dialogue** - spoken interchange or conversation between two or more characters.
- **Stage direction** - information included in the script in addition to the dialogues (similar to the "narrator text"): descriptions of characters, their actions, side effects of their actions, etc.
- **Scenery** - the set, decor and appearance of the stage.
- **Costumes** - a character's clothing. In our case appearance of the characters and connections on the diagram (shape, color, border).

## Examples

Sample playscripts can be found in the [examples](./examples) folder. Just copy content into the [editor](https://refined-github-html-preview.kidonng.workers.dev/CatSkald/playscript-flow-diagrams/raw/master/index.html) and see it in action.

The list of available tags and styles is defined in `stageSettings.scenery` and `stageSettings.costumes` in [index.js](./index.js).

## Used Libraries

- [js-yaml](https://github.com/nodeca/js-yaml) to parse YAML
- [Cytoscape.js](https://js.cytoscape.org/) to draw diagrams
- [CodeMirror](https://codemirror.net/) browser code editor for the demo
