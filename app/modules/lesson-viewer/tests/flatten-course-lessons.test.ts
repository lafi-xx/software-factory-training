import { describe, it, expect } from "vitest";
import { flattenCourseLessons } from "../index.server";

describe("flattenCourseLessons", () => {
  it("lists every lesson in module order, tagged with its module", () => {
    const course = {
      modules: [
        {
          id: 1,
          title: "Basics",
          lessons: [
            { id: 10, title: "Intro", moduleId: 1 },
            { id: 11, title: "Setup", moduleId: 1 },
          ],
        },
        { id: 2, title: "Empty", lessons: [] },
        {
          id: 3,
          title: "Advanced",
          lessons: [{ id: 30, title: "Generics", moduleId: 3 }],
        },
      ],
    };

    expect(flattenCourseLessons(course)).toEqual([
      { id: 10, title: "Intro", moduleId: 1, moduleTitle: "Basics" },
      { id: 11, title: "Setup", moduleId: 1, moduleTitle: "Basics" },
      { id: 30, title: "Generics", moduleId: 3, moduleTitle: "Advanced" },
    ]);
  });

  it("returns nothing for a course with no modules", () => {
    expect(flattenCourseLessons({ modules: [] })).toEqual([]);
  });
});
