import * as gridDraw from "./grid-draw.mjs";
import * as sequenceWorld from "./sequence-world.mjs";

export const families = {
  "grid-draw": { id: "grid-draw", ...gridDraw },
  "sequence-world": { id: "sequence-world", ...sequenceWorld },
};
