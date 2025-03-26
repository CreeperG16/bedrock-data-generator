// emergency script i wrote in like two minutes in a repl at first to fix some mistakes I had already pushed to a PR :p

const fs = require("fs");
const recipes = require("./recipes.json");
const items = require("./items.json");
const items2 = require("./itemscopy.json");

const newRecipes = {};

for (const [resultId, recipe] of Object.entries(recipes)) {
    console.log(resultId);

    const newRecipe = [];
    for (const recipeVariant of recipe) {
        const newRecipeVariant = {};
        if ("inShape" in recipeVariant) {
            const newInShape = [];
            for (const row of recipeVariant.inShape) {
                newInShape.push(
                    row.map((id) =>
                        id === null ? null :
                        items.find((i) => 
                            i.name === items2.find((ii) => ii.id === id).name
                        ).id
                    )
                );
            }

            newRecipeVariant.inShape = newInShape;
        }
        if ("ingredients" in recipeVariant) {
            newRecipeVariant.ingredients = recipeVariant.ingredients.map(id =>
                id === null ? null :
                items.find(i =>
                    i.name === items2.find(ii => ii.id === id).name
                ).id
            )
        }
        
        if (Object.keys(recipeVariant).filter(k => !["inShape", "ingredients", "result"].includes(k)).length !== 0) {
            throw new Error(Object.keys(recipeVariant));
        }

        newRecipeVariant.result = {
            ...recipeVariant.result,
            id: items.find((i) =>
                items2.find((ii) => ii.id === recipeVariant.result.id).name === i.name
            ).id,
        };
        newRecipe.push(newRecipeVariant);
    }
    newRecipes[items.find((i) => items2.find((ii) => ii.id.toString() === resultId).name === i.name).id] = newRecipe;
}

fs.writeFileSync("./recipesfixed.json", JSON.stringify(newRecipes, null, 2));
