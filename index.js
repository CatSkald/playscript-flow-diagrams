const stageSettings = {
  //reserved language constructs for the playscript
  vocabulary: {
    tagsStart: "[",
    tagsEnd: "]",
    valuesSeparator: ",",
    accostStart: "(To ",
    accostEnd: ")",
    end: "CURTAIN",
    actPrefix: "ACT ",
    scenePrefix: "SCENE ",
    directionClassName: "direction",
    characterClassName: "character",
    sceneClassName: "scene",
  },
  //the color palette of the diagram
  scenery: {
    connectionColor: "darkslategrey",
    connectionText: "black",
    sceneBorderColor: "darkslategrey",
    sceneBackgroundColor: "white",
  },
  getTagClassName(tag) {
    return "tag-" + tag.replace(/ /g, "_");
  },
  //custom tags (tag is generated using "getTagClassName" above)
  //styles documentation can be found here: https://js.cytoscape.org/
  costumes: [
    {
      selector: ".direction",
      style: {
        "background-color": "aquamarine",
        color: "black",
        shape: "rectangle",
      },
    },
    {
      selector: ".character",
      style: {
        "background-color": "darkblue",
        color: "white",
        shape: "round-rectangle",
      },
    },
    {
      selector: ".tag-Database",
      style: {
        shape: "barrel",
      },
    },
    {
      selector: ".tag-User",
      style: {
        shape: "round-pentagon",
        padding: "50px",
      },
    },
    {
      selector: ".tag-3rd_party",
      style: {
        "background-color": "dimgrey",
        color: "white",
      },
    },
    {
      selector: ".tag-Out_of_scope",
      style: {
        "background-color": "cornflowerblue",
        color: "white",
      },
    },
    {
      selector: ".tag-async",
      style: {
        "line-style": "dashed",
      },
    },
  ],
};

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
      const hasTags = value.includes(stageSettings.vocabulary.tagsStart);
      const description = hasTags
        ? value
            .substring(0, value.indexOf(stageSettings.vocabulary.tagsStart))
            .trim()
        : value;
      const tags = hasTags
        ? value
            .substring(description.length)
            .replace(stageSettings.vocabulary.tagsStart, "")
            .replace(stageSettings.vocabulary.tagsEnd, "")
            .split(stageSettings.vocabulary.valuesSeparator)
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
        if (scene === stageSettings.vocabulary.end) return;
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
      speech.forEach((remark) => {
        const isStageDirection = typeof remark === "string";
        if (isStageDirection) {
          currentCharacter = performStageDirection(remark, currentCharacter);
        } else {
          const nextCharacter = Object.keys(remark)[0];
          currentCharacter = performSpeech(
            nextCharacter,
            remark[nextCharacter],
            currentCharacter
          );
        }
      });
    };
    const performSpeech = (currentCharacter, speech, previousCharacter) => {
      const isCreated = this.stage.enterCharacter(
        currentCharacter,
        this.getCharacterTags(currentCharacter)
      );

      if (
        isCreated &&
        previousCharacter &&
        previousCharacter != currentCharacter
      ) {
        this.stage.address(previousCharacter, currentCharacter);
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

              this.stage.enterCharacter(
                addressee,
                this.getCharacterTags(addressee)
              );

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

    if (remark.startsWith(stageSettings.vocabulary.accostStart)) {
      this.type = this.typeDialogue;
      const accostEndIndex = remark.indexOf(stageSettings.vocabulary.accostEnd);
      const accost = remark
        .substring(stageSettings.vocabulary.accostStart.length, accostEndIndex)
        .split(stageSettings.vocabulary.valuesSeparator);
      accost.forEach((addressee) => {
        const indexOfTagsStart = addressee.indexOf(
          stageSettings.vocabulary.tagsStart
        );
        if (indexOfTagsStart !== -1) {
          const name = addressee.substring(0, indexOfTagsStart).trim();
          const tag = addressee
            .substring(indexOfTagsStart + 1, addressee.length - 1)
            .trim();
          this.addressees.push(name);
          this.tags.push(tag);
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
    return stageSettings.vocabulary.actPrefix + this.stage.act;
  }
  get currentScene() {
    return stageSettings.vocabulary.scenePrefix + this.stage.scene;
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
            "background-color": stageSettings.scenery.characterColor,
            color: stageSettings.scenery.characterText,
            shape: "rectangle",
            "text-halign": "center",
            "text-valign": "center",
            "text-wrap": "wrap",
            "text-max-width": 300,
            width: "label",
            height: "label",
            padding: "30px",
          },
        },
      ].concat(stageSettings.costumes),
      zoom: 1,
      pan: { x: 0, y: 0 },
      wheelSensitivity: 0.1,
      styleEnabled: true,
    });
    const directionNode = graph.add({
      group: "nodes",
      data: {
        id: stageSettings.vocabulary.directionClassName,
        label: "Processing description, user action or other operation",
      },
    });
    directionNode.addClass(stageSettings.vocabulary.directionClassName);
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
      node.addClass(stageSettings.vocabulary.characterClassName);
      c.tags.forEach((tag) =>
        node.addClass(stageSettings.getTagClassName(tag))
      );
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
            shape: "rectangle",
            padding: "20px",
          },
        },
        {
          selector: "." + stageSettings.vocabulary.characterClassName,
          style: {
            "font-weight": "bold",
          },
        },
        {
          selector: ":parent",
          style: {
            "background-color": stageSettings.scenery.sceneBackgroundColor,
            "font-weight": "bold",
            "border-width": "1px",
            "border-style": "dashed",
            "border-color": stageSettings.scenery.sceneBorderColor,
          },
        },
        {
          selector: "." + stageSettings.vocabulary.sceneClassName,
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
            color: stageSettings.scenery.edgeText,
            "line-color": stageSettings.scenery.connectionColor,
            "line-style": "solid",
            "target-arrow-color": stageSettings.scenery.connectionColor,
            "text-rotation": "autorotate",
            "text-wrap": "wrap",
            "text-max-width": 200,
            "text-background-color": stageSettings.scenery.sceneBackgroundColor,
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
      ].concat(stageSettings.costumes),
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
    // const description = stageSettings.vocabulary.actPrefix + this.stage.act;
    // return this.graph.add({
    //   group: "nodes",
    //   data: { id: description, description: description },
    // });
  }
  addScene() {
    this.stage.scene += 1;
    this.stage.direction = 0;
    const description = stageSettings.vocabulary.scenePrefix + this.stage.scene;
    const node = this.graph.add({
      group: "nodes",
      data: {
        id: description,
        //TODO only single act plays are supported - do we need more?
        //parent: this.stage.currentAct,
        label: description,
      },
    });
    node.addClass(stageSettings.vocabulary.sceneClassName);
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
    node.addClass(stageSettings.vocabulary.directionClassName);
    return node;
  }
  removeTrailingDot(text) {
    return text.trim().endsWith(".")
      ? text
          .trim()
          .substring(0, text.length - 1)
          .trim()
      : text.trim();
  }
  getNodeId(name) {
    return `${this.currentAct}.${this.currentScene}.${name}`;
  }
  enterCharacter(name, tags = []) {
    const nodeId = this.getNodeId(name);
    if (this.graph.$id(nodeId).length !== 0) return;

    const node = this.graph.add({
      group: "nodes",
      data: {
        id: nodeId,
        parent: this.currentScene,
        label: name,
      },
    });
    node.addClass(stageSettings.vocabulary.characterClassName);
    tags.forEach((tag) => {
      node.addClass(stageSettings.getTagClassName(tag));
    });
    return node;
  }
  address(from, to, description = "", tags = []) {
    description = this.removeTrailingDot(description);

    const edge = this.graph.add({
      group: "edges",
      data: {
        source: this.getNodeId(from),
        target: this.getNodeId(to),
        label: description,
      },
    });

    tags.forEach((tag) => {
      edge.addClass(stageSettings.getTagClassName(tag));
    });

    return edge;
  }
}
