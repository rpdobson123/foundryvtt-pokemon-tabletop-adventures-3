import { EntitySheetHelper } from "../helper.js";
import { ATTRIBUTE_TYPES } from "../constants.js";
import { dexData } from "./complete-dex.js";
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class PokemonSheet extends ActorSheet {
  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["worldbuilding", "sheet", "actor"],
      template: "systems/pokemon-pta3/templates/pokemon.html",
      width: 600,
      height: 600,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "pokedex",
        },
      ],
      scrollY: [".biography", ".items", ".attributes"],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(options) {
    const context = await super.getData(options);
    EntitySheetHelper.getAttributeData(context.data);
    context.shorthand = !!game.settings.get("pokemon-pta3", "macroShorthand");
    context.systemData = context.data.system;
    context.systemData.pokedexName = context.data.system.pokedexName || 'N/A';
    context.statBlock = this.object.statBlock;
    context.dexImg = this.object.dexImg || this.DEFAULT_IMG;
    context.bioText = this.object.bioText;
    context.dtypes = ATTRIBUTE_TYPES;
    context.biographyHTML = await TextEditor.enrichHTML(
      context.systemData.biography,
      {
        secrets: this.document.isOwner,
        async: true,
      }
    );
    return context;
  }

  getPokemonByName(name) {
    if (!name) return {};
    return dexData.pokemon.find((pokemon) => {
      return pokemon.name.toLocaleLowerCase() === name.toLocaleLowerCase();
    }) || {};
  }
  /* -------------------------------------------- */

  DEFAULT_IMG = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/International_Pok%C3%A9mon_logo.svg/2560px-International_Pok%C3%A9mon_logo.svg.png'

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    
    html
      .find(`.header-fields input[name="system.pokedexName"]`)
      .change(event => {
        const newDexName = event.currentTarget.value;
        const pokemonData = this.getPokemonByName(newDexName);
        const newName = event.currentTarget.value;
        this.object.name = newName;
        this.object.system.pokedexName = newName || 'N/A';
        this.object.pokedexData = pokemonData;
        this.object.dexImg = pokemonData.avatar || this.DEFAULT_IMG;
        this.object.prototypeToken.texture.src = pokemonData.avatar || this.DEFAULT_IMG;
        this.object.img = pokemonData.avatar || this.DEFAULT_IMG;
        this.object.bioText = pokemonData.bio ? pokemonData.bio
          .replaceAll('%20', ' ')
          .replaceAll('%3Cp', '')
          .replaceAll('%3E', '')
          .replaceAll('%2C', ',')
          .replaceAll('%E9', 'e')
          .replaceAll('%3C/p', '')
          .replaceAll('%0A', ' ') : '';

          const pokemonAttributes = {};
          pokemonData.attribs.forEach((attrib) => pokemonAttributes[attrib.name] = attrib);
          console.log({pokemonAttributes});
        this.object.statBlock = {
          "Atk": pokemonAttributes.atkbase.current,
          "Def": pokemonAttributes.defbase.current,
          "SpAtk": pokemonAttributes.spatkbase.current,
          "SpDef": pokemonAttributes.spdefbase.current,
          "Speed": pokemonAttributes.spdbase.current,
        };

        this.object.prototypeToken.name = newName;
        console.log(this.object);
        this._render(true);
      })

    // Attribute Management
    html
      .find(".attributes")
      .on(
        "click",
        ".attribute-control",
        EntitySheetHelper.onClickAttributeControl.bind(this)
      );
    html
      .find(".groups")
      .on(
        "click",
        ".group-control",
        EntitySheetHelper.onClickAttributeGroupControl.bind(this)
      );
    html
      .find(".attributes")
      .on(
        "click",
        "a.attribute-roll",
        EntitySheetHelper.onAttributeRoll.bind(this)
      );

  }

  /* -------------------------------------------- */

  /**
   * Handle click events for Item control buttons within the Actor Sheet
   * @param event
   * @private
   */
  _onItemControl(event) {
    event.preventDefault();

    // Obtain event data
    const button = event.currentTarget;
    const li = button.closest(".item");
    const item = this.actor.items.get(li?.dataset.itemId);

    // Handle different actions
    switch (button.dataset.action) {
      case "create":
        const cls = getDocumentClass("Item");
        return cls.create(
          { name: game.i18n.localize("SIMPLE.ItemNew"), type: "item" },
          { parent: this.actor }
        );
      case "edit":
        return item.sheet.render(true);
      case "delete":
        return item.delete();
    }
  }

  /* -------------------------------------------- */

  /**
   * Listen for roll buttons on items.
   * @param {MouseEvent} event    The originating left click event
   */
  _onItemRoll(event) {
    let button = $(event.currentTarget);
    const li = button.parents(".item");
    const item = this.actor.items.get(li.data("itemId"));
    let r = new Roll(button.data("roll"), this.actor.getRollData());
    return r.toMessage({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<h2>${item.name}</h2><h3>${button.text()}</h3>`,
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    formData = EntitySheetHelper.updateAttributes(formData, this.object);
    formData = EntitySheetHelper.updateGroups(formData, this.object);
    return formData;
  }
}
