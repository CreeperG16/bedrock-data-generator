module.exports = async (craftingData) => {
  let id = 0;
  const recipes = {};
  for (const { type, recipe } of craftingData.recipes) {
    if (type === "shapeless") {
      let obj = recipes[recipe.output[0].network_id];
      if (!obj) {
        obj = [];
        recipes[recipe.output[0].network_id] = obj;
      }

      obj.push({
        ingredients: recipe.input.map((ing) => ing.network_id),
        result: {
          count: recipe.output[0].count,
          id: recipe.output[0].network_id,
        },
      });
    } else if (type === "shaped") {
      let obj = recipes[recipe.output[0].network_id];
      if (!obj) {
        obj = [];
        recipes[recipe.output[0].network_id] = obj;
      }

      obj.push({
        inShape: recipe.input.map((row) => row.map((ing) => (ing.type === "invalid" ? null : ing.network_id))),
        result: {
          count: recipe.output[0].count,
          id: recipe.output[0].network_id,
        }
      });
    } else if (type === "shulker_box") {
      // ...
    }
  }

  return recipes;
};
