const { selectAbilityUsages } = require("../../libs/util");

const CHARIZARD = ["Blaze", "Solar Power"];
const MEGA_Y = ["Drought"];

test("A mega keeps its base forme abilities scaled to 100%", () => {
  const kept = selectAbilityUsages(
    [
      { ability: "Solar Power", percent: 70 },
      { ability: "Blaze", percent: 27 },
      { ability: "Drought", percent: 3 },
    ],
    { formeAbilities: MEGA_Y, baseAbilities: CHARIZARD }
  );

  expect(kept).toEqual([
    { name: "Solar Power", percent: 72.16 },
    { name: "Blaze", percent: 27.84 },
  ]);
  expect(kept.reduce((sum, entry) => sum + entry.percent, 0)).toBeCloseTo(100);
});

test("A mega falls back on its own ability when the base ones are absent", () => {
  const kept = selectAbilityUsages([{ ability: "Drought", percent: 100 }], {
    formeAbilities: MEGA_Y,
    baseAbilities: CHARIZARD,
  });

  expect(kept).toEqual([{ name: "Drought", percent: 100 }]);
});

test("Unknown abilities and those under 1% are dropped, the rest reaches 100%", () => {
  const kept = selectAbilityUsages(
    [
      { ability: "Blaze", percent: 60 },
      { ability: "Solar Power", percent: 30 },
      { ability: "Levitate", percent: 9.5 },
      { ability: "Drought", percent: 0.5 },
    ],
    { formeAbilities: CHARIZARD }
  );

  expect(kept).toEqual([
    { name: "Blaze", percent: 66.67 },
    { name: "Solar Power", percent: 33.33 },
  ]);
});

test("No ability usage gives no row", () => {
  expect(selectAbilityUsages(undefined, {})).toEqual([]);
  expect(selectAbilityUsages([], { formeAbilities: CHARIZARD })).toEqual([]);
});
