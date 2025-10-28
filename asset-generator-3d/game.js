// The 3D meshes for the generator have been fully removed. The remaining code keeps
// the UI responsive while explaining that no geometry is available.

let modelCounter = 0;

function createModel(overrides = {}) {
  const id = overrides.id ?? `model-${modelCounter++}`;
  const lineage = overrides.lineage ? [...overrides.lineage] : [];

  return {
    id,
    displayName: overrides.displayName ?? `Decommissioned Frame ${modelCounter}`,
    profile: overrides.profile ?? "Unavailable",
    summary:
      overrides.summary ??
      "All previous starship meshes have been removed at the user's request.",
    tags: overrides.tags ? [...overrides.tags] : [],
    lineage,
  };
}

function mutateModel(baseModel) {
  return createModel({
    lineage: [...(baseModel.lineage ?? []), baseModel.id],
  });
}

function createTagBadge(tag) {
  const span = document.createElement("span");
  span.textContent = tag;
  return span;
}

function createNotice(text) {
  const wrapper = document.createElement("div");
  wrapper.className = "stage-view__notice";

  const message = document.createElement("p");
  message.textContent = text;
  wrapper.appendChild(message);

  return wrapper;
}

function renderSelectedSection(model, onMutate, onRandomise) {
  const section = document.createElement("section");
  section.className = "model-stage";

  const header = document.createElement("header");
  header.className = "model-stage__header";

  const title = document.createElement("h2");
  title.className = "model-stage__title";
  title.textContent = model.displayName;
  header.appendChild(title);

  const subtitle = document.createElement("p");
  subtitle.textContent = model.profile;
  subtitle.setAttribute("aria-label", `Profile: ${model.profile}`);
  header.appendChild(subtitle);

  const actions = document.createElement("div");
  actions.className = "model-stage__actions";

  const mutateButton = document.createElement("button");
  mutateButton.className = "button";
  mutateButton.type = "button";
  mutateButton.textContent = "Mutate Children";
  mutateButton.addEventListener("click", onMutate);

  const randomButton = document.createElement("button");
  randomButton.className = "button";
  randomButton.type = "button";
  randomButton.textContent = "New Seed";
  randomButton.addEventListener("click", onRandomise);

  actions.append(mutateButton, randomButton);
  header.appendChild(actions);
  section.appendChild(header);

  const view = document.createElement("div");
  view.className = "stage-view";
  view.appendChild(createNotice("No 3D geometry to display."));
  section.appendChild(view);

  const description = document.createElement("div");
  description.className = "model-description";

  const summary = document.createElement("p");
  summary.textContent = model.summary;
  description.appendChild(summary);

  const tagsRow = document.createElement("div");
  tagsRow.className = "variant-card__tags";
  model.tags.forEach((tag) => tagsRow.appendChild(createTagBadge(tag)));
  description.appendChild(tagsRow);

  section.appendChild(description);

  return section;
}

function renderVariantsSection(models, onSelect) {
  const section = document.createElement("section");
  section.className = "model-stage";

  const header = document.createElement("header");
  header.className = "model-stage__header";

  const title = document.createElement("h3");
  title.className = "model-stage__title";
  title.textContent = "Mutated Variants";
  header.appendChild(title);

  const hint = document.createElement("p");
  hint.textContent = models.length
    ? "Click a variant to promote it to the main stage."
    : "No alternative meshes are available.";
  header.appendChild(hint);

  section.appendChild(header);

  if (models.length === 0) {
    return section;
  }

  const grid = document.createElement("div");
  grid.className = "variant-grid";

  models.forEach((model) => {
    const card = document.createElement("article");
    card.className = "variant-card";
    card.tabIndex = 0;

    const cardTitle = document.createElement("h4");
    cardTitle.className = "variant-card__title";
    cardTitle.textContent = model.displayName;
    card.appendChild(cardTitle);

    const tags = document.createElement("div");
    tags.className = "variant-card__tags";
    model.tags.forEach((tag) => tags.appendChild(createTagBadge(tag)));
    card.appendChild(tags);

    const view = document.createElement("div");
    view.className = "variant-card__view";
    view.appendChild(createNotice("Empty variant"));
    card.appendChild(view);

    card.addEventListener("click", () => onSelect(model));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(model);
      }
    });

    grid.appendChild(card);
  });

  section.appendChild(grid);
  return section;
}

function generateMutations(model) {
  return [mutateModel(model), mutateModel(model), mutateModel(model)];
}

function initGenerator(root) {
  let selected = createModel();
  let variants = generateMutations(selected);

  const render = () => {
    root.innerHTML = "";

    const selectedSection = renderSelectedSection(
      selected,
      () => {
        variants = generateMutations(selected);
        render();
      },
      () => {
        selected = createModel();
        variants = generateMutations(selected);
        render();
      },
    );

    const variantsSection = renderVariantsSection(variants, (model) => {
      selected = model;
      variants = generateMutations(selected);
      render();
    });

    root.appendChild(selectedSection);
    root.appendChild(variantsSection);
  };

  render();
}

window.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("generator");
  if (root) {
    initGenerator(root);
  }
});
