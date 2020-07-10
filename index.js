const vocabulary = {
  tagsStart: "[",
  tagsEnd: "]",
  valuesSeparator: ",",
  accostStart: "(To ",
  accostEnd: ")",
  end: "CURTAIN",
};

const decor = {
  characterColor: "blue",
  characterText: "white",
  directionColor: "lightgreen",
  directionText: "black",
  connectionColor: "darkblue",
  connectionText: "black",
  sceneBorderColor: "lightgreen",
  sceneBackgroundColor: "white",
};

const customTags = [
  {
    selector: ".tag-3rd_party",
    style: {
      "background-color": "gray",
      color: "white",
    },
  },
  {
    selector: ".tag-Out_of_scope",
    style: {
      "background-color": "lightblue",
      color: "black",
    },
  },
  {
    selector: ".tag-async",
    style: {
      "line-style": "dashed",
    },
  },
];

class Play {
  constructor(stageContainerId, charactersContainerId, yaml) {
    this.DOM = {
      stageId: stageContainerId,
      charactersId: charactersContainerId,
    };

    this.script = jsyaml.load(yaml);
    this.title = this.script.TITLE;
    this.author = this.script.BY;
    this.synopsis = this.script.SYNOPSIS;
    this.characters = this.parseCharacters(this.script.CHARACTERS);
    this.plot = this.script.PLOT;
  }
  parseCharacters(characters) {
    return characters.map((c) => {
      const name = Object.keys(c)[0];
      const value = c[name].trim();
      const hasTags = value.includes(vocabulary.tagsStart);
      const description = hasTags
        ? value.substring(0, value.indexOf(vocabulary.tagsStart)).trim()
        : value;
      const tags = hasTags
        ? value
            .substring(description.length)
            .replace(vocabulary.tagsStart, "")
            .replace(vocabulary.tagsEnd, "")
            .split(vocabulary.valuesSeparator)
            .map((tag) => tag.trim())
        : [];

      return {
        name: name,
        description: description,
        tags: tags,
      };
    });
  }
  getCharacterTags(name) {
    return this.characters.filter(
      (c) => c.name.toUpperCase() === name.toUpperCase()
    )[0].tags;
  }
  perform() {
    this.stage = new Stage(this.DOM.stageId);
    this.stage.introduceCharacters(this.DOM.charactersId, this.characters);

    const performAct = (scenes) => {
      scenes.forEach((scene) => {
        if (scene === vocabulary.end) return;
        this.stage.addScene();
        performScene(scene[this.stage.currentScene]);
      });
    };
    const performStageDirection = (remark, currentCharacter) => {
      this.stage.addDirection(remark);
      if (currentCharacter)
        this.stage.address(currentCharacter, this.stage.currentDirection);

      return this.stage.currentDirection;
    };
    const performScene = (speech) => {
      let currentCharacter = null;
      const costumes = {};
      speech.forEach((remark) => {
        const isStageDirection = typeof remark === "string";
        if (isStageDirection) {
          currentCharacter = performStageDirection(remark, currentCharacter);
        } else {
          const nextCharacter = Object.keys(remark)[0];
          currentCharacter = performSpeech(
            nextCharacter,
            remark[nextCharacter],
            currentCharacter,
            costumes
          );
        }
      });
    };
    const performSpeech = (
      currentCharacter,
      speech,
      previousCharacter,
      costumes
    ) => {
      if (!costumes[currentCharacter]) {
        costumes[currentCharacter] = this.stage.enterCharacter(
          currentCharacter,
          this.getCharacterTags(currentCharacter)
        );

        if (previousCharacter && previousCharacter != currentCharacter) {
          this.stage.address(previousCharacter, currentCharacter);
        }
      }

      speech.forEach((line) => {
        const remark = new Remark(line);
        switch (remark.type) {
          case remark.typeDirection:
            performStageDirection(remark.text, currentCharacter);
            break;
          case remark.typeDialogue:
            remark.addressees.forEach((addressee) => {
              if (!addressee) return;
              if (!costumes[addressee]) {
                costumes[addressee] = this.stage.enterCharacter(
                  addressee,
                  this.getCharacterTags(addressee)
                );
              }
              this.stage.address(
                currentCharacter,
                addressee,
                remark.text,
                remark.tags
              );
            });

            break;
          default:
            break;
        }
      });

      return currentCharacter;
    };

    this.stage.addAct();
    performAct(this.plot[0][this.stage.currentAct]);
    this.stage.refresh();
  }
}

class Remark {
  constructor(remark) {
    this.typeDialogue = "dialogue";
    this.typeDirection = "stage direction";
    this.addressees = [];
    this.tags = [];

    if (remark.startsWith(vocabulary.accostStart)) {
      this.type = this.typeDialogue;
      const accostEndIndex = remark.indexOf(vocabulary.accostEnd);
      const accost = remark
        .substring(vocabulary.accostStart.length, accostEndIndex)
        .split(vocabulary.valuesSeparator);
      accost.forEach((addressee) => {
        const indexOfTagsStart = addressee.indexOf(vocabulary.tagsStart);
        if (indexOfTagsStart !== -1) {
          const name = addressee.substring(0, indexOfTagsStart);
          const tag = addressee.substring(
            indexOfTagsStart + 1,
            addressee.length - 1
          );
          this.addressees.push(name.trim());
          this.tags.push(tag.trim());
        } else {
          this.addressees.push(addressee.trim());
        }
      });
      this.text = remark.substring(accostEndIndex + 1, remark.length);
    } else {
      this.type = this.typeDirection;
      this.text = remark.substring(1, remark.length - 1);
    }
  }
}

class Stage {
  constructor(stageContainerId) {
    this.stage = {
      act: 0,
      scene: 0,
      direction: 0,
    };
    this.graph = this.build(stageContainerId);
  }
  get currentAct() {
    return "ACT " + this.stage.act;
  }
  get currentScene() {
    return "SCENE " + this.stage.scene;
  }
  get currentDirection() {
    return this.stage.direction;
  }
  introduceCharacters(id, characters) {
    const graph = cytoscape({
      container: document.getElementById(id),
      style: [
        {
          selector: "node",
          style: {
            content: "data(label)",
            "background-color": decor.characterColor,
            color: decor.characterText,
            shape: "round-rectangle",
            "text-halign": "center",
            "text-valign": "center",
            "text-wrap": "wrap",
            "text-max-width": 300,
            width: "label",
            height: "label",
            padding: "30px",
          },
        },
        {
          selector: ".direction",
          style: {
            "background-color": decor.directionColor,
            color: decor.directionText,
            shape: "round-hexagon",
          },
        },
      ].concat(customTags),
      // initial viewport state:
      zoom: 1,
      pan: { x: 0, y: 0 },
      styleEnabled: true,
    });
    const directionNode = graph.add({
      group: "nodes",
      data: {
        id: "direction",
        label: "Processing description, user action or other operation",
      },
    });
    directionNode.addClass("direction");
    characters.forEach((c) => {
      let label = `${c.name}\n\n${c.description}`;
      if (c.tags.length > 0) label += `\n(${c.tags.join(", ")})`;

      const node = graph.add({
        group: "nodes",
        data: {
          id: c.name,
          label: label,
        },
      });
      c.tags.forEach((tag) => node.addClass(this.getTagClassName(tag)));
    });
    graph
      .layout({
        name: "grid",
        fit: true,
        padding: 5,
        avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
        avoidOverlapPadding: 30, // extra spacing around nodes when avoidOverlap: true
        nodeDimensionsIncludeLabels: true, // Excludes the label when calculating node bounding boxes for the layout algorithm
        spacingFactor: undefined, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
        condense: false, // uses all available space on false, uses minimal space on true
        sort: undefined,
      })
      .run();
  }
  build(id) {
    return cytoscape({
      container: document.getElementById(id),
      style: [
        {
          selector: "node",
          style: {
            content: "data(label)",
            "text-halign": "center",
            "text-valign": "center",
            "text-wrap": "wrap",
            "text-max-width": 160,
            width: "label",
            height: "label",
            shape: "round-rectangle",
            padding: "20px",
          },
        },
        {
          selector: ".character",
          style: {
            "background-color": decor.characterColor,
            color: decor.characterText,
            "font-weight": "bold",
            shape: "round-rectangle",
          },
        },
        {
          selector: ".direction",
          style: {
            "background-color": decor.directionColor,
            color: decor.directionText,
            "font-weight": "normal",
            shape: "round-hexagon",
            "text-max-width": 150,
            padding: "30px",
          },
        },
        {
          selector: ":parent",
          style: {
            "background-color": decor.sceneBackgroundColor,
            "font-weight": "bold",
            "border-width": "1px",
            "border-style": "dashed",
            "border-color": decor.sceneBorderColor,
          },
        },
        {
          selector: ".scene",
          style: {
            "text-valign": "top",
          },
        },
        {
          selector: "edge",
          style: {
            content: "data(label)",
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            width: 2,
            color: decor.edgeText,
            "line-color": decor.connectionColor,
            "line-style": "solid",
            "target-arrow-color": decor.connectionColor,
            "text-rotation": "autorotate",
            "text-wrap": "wrap",
            "text-max-width": 200,
            "text-background-color": decor.sceneBackgroundColor,
            "text-background-opacity": 1,
            "text-background-padding": "0px",
            "text-background-shape": "round-rectangle",
            "loop-sweep": "-40deg",
            "loop-direction": "-180deg",
            "control-point-step-size": "70px",
            "source-endpoint": "outside-to-node-or-label",
            "target-endpoint": "outside-to-node-or-label",
          },
        },
      ].concat(customTags),
      // initial viewport state:
      zoom: 1,
      pan: { x: 0, y: 0 },
      // interaction options:
      minZoom: 0.15,
      maxZoom: 2,
      wheelSensitivity: 0.1,
      zoomingEnabled: true,
      userZoomingEnabled: true,
      panningEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: true,
      selectionType: "single",
      touchTapThreshold: 4,
      desktopTapThreshold: 2,
      autolock: false,
      autoungrabify: false,
      autounselectify: false,
      // rendering options:
      headless: false,
      styleEnabled: true,
    });
  }
  refresh() {
    this.graph
      .layout({
        name: "klay",
        padding: 5,
        klay: {
          borderSpacing: 2, // Minimal amount of space to be left to the border
          crossingMinimization: "LAYER_SWEEP", // Strategy for crossing minimization.
          cycleBreaking: "GREEDY", // Strategy for cycle breaking. Cycle breaking looks for cycles in the graph and determines which edges to reverse to break the cycles. Reversed edges will end up pointing to the opposite direction of regular edges (that is, reversed edges will point left if edges usually point right).
          direction: "RIGHT", // Overall direction of edges: horizontal (right / left) or vertical (down / up)
          edgeRouting: "SPLINES", // Defines how edges are routed (POLYLINE, ORTHOGONAL, SPLINES)
          edgeSpacingFactor: 2, // Factor by which the object spacing is multiplied to arrive at the minimal spacing between edges.
          feedbackEdges: false, // Whether feedback edges should be highlighted by routing around the nodes.
          fixedAlignment: "NONE", // Tells the BK node placer to use a certain alignment instead of taking the optimal result.  This option should usually be left alone.
          inLayerSpacingFactor: 1.5, // Factor by which the usual spacing is multiplied to determine the in-layer spacing between objects.
          layoutHierarchy: true, // Whether the selected layouter should consider the full hierarchy
          linearSegmentsDeflectionDampening: 1, // Dampens the movement of nodes to keep the diagram from getting too large.
          mergeEdges: false, // Edges that have no ports are merged so they touch the connected nodes at the same points.
          mergeHierarchyCrossingEdges: true, // If hierarchical layout is active, hierarchy-crossing edges use as few hierarchical ports as possible.
          nodeLayering: "INTERACTIVE", // Strategy for node layering.
          nodePlacement: "LINEAR_SEGMENTS", // Strategy for Node Placement
          routeSelfLoopInside: false, // Whether a self-loop is routed around or inside its node.
          separateConnectedComponents: true, // Whether each connected component should be processed separately
          spacing: 60, // Overall setting for the minimal amount of space to be left between objects
          thoroughness: 3, // How much effort should be spent to produce a nice layout..
        },
      })
      .run();
  }
  addAct() {
    this.stage.act += 1;
    this.stage.scene = 0;
    //TODO only single act plays are supported - do we need more?
    // const description = "ACT " + this.stage.act;
    // return this.graph.add({
    //   group: "nodes",
    //   data: { id: description, description: description },
    // });
  }
  addScene() {
    this.stage.scene += 1;
    this.stage.direction = 0;
    const description = "SCENE " + this.stage.scene;
    const node = this.graph.add({
      group: "nodes",
      data: {
        id: description,
        //TODO only single act plays are supported - do we need more?
        //parent: this.stage.currentAct,
        label: description,
      },
    });
    node.addClass("scene");
    return node;
  }
  addDirection(direction) {
    this.stage.direction += 1;
    const node = this.graph.add({
      group: "nodes",
      data: {
        id: this.getNodeId(this.currentDirection),
        parent: this.currentScene,
        label: direction,
      },
    });
    node.addClass("direction");
    return node;
  }
  getNodeId(name) {
    return `${this.currentAct}.${this.currentScene}.${name}`;
  }
  getTagClassName(tag) {
    return "tag-" + tag.replace(/ /g, "_");
  }
  enterCharacter(name, tags = []) {
    const node = this.graph.add({
      group: "nodes",
      data: {
        id: this.getNodeId(name),
        parent: this.currentScene,
        label: name,
      },
    });
    node.addClass("character");
    tags.forEach((tag) => {
      node.addClass(this.getTagClassName(tag));
    });
    return node;
  }
  address(from, to, description = "", tags = []) {
    //remove trailing dot
    if (description.endsWith(".")) {
      description = description.substring(0, description.length - 1);
    }

    const edge = this.graph.add({
      group: "edges",
      data: {
        source: this.getNodeId(from),
        target: this.getNodeId(to),
        label: description,
      },
    });

    tags.forEach((tag) => {
      edge.addClass(this.getTagClassName(tag));
    });

    return edge;
  }
}