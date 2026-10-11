import { getDb } from "./db";
import { users, challenges } from "./schema";
export async function seed() {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values({
        id: "zyvara-editorial",
        subject: "system:editorial",
        name: "Zyvara",
      })
      .onConflictDoNothing();
    await tx
      .insert(challenges)
      .values([
        {
          id: "campus-cleanup",
          creatorId: "zyvara-editorial",
          title: "A cleaner corner of campus",
          category: "Cleanup",
          description:
            "Choose a small shared outdoor space and give it a thoughtful cleanup. Work safely, use gloves, and leave sharp or hazardous materials to trained staff.",
          requirements: [
            "Show the cleaned outdoor area in your result photo.",
            "Describe what you collected and how you disposed of it safely.",
          ],
        },
        {
          id: "plant-something",
          creatorId: "zyvara-editorial",
          title: "Make room for something green",
          category: "Planting",
          description:
            "Plant a locally appropriate seedling or care for an existing plant. Choose a suitable container or an approved growing space.",
          requirements: [
            "Show the plant and its growing space.",
            "Describe the care you provided and your next care step.",
          ],
        },
        {
          id: "sort-recycling",
          creatorId: "zyvara-editorial",
          title: "Give materials a second chapter",
          category: "Recycling",
          description:
            "Check your local recycling guidance, then sort a small collection of household or campus materials into the correct streams.",
          requirements: [
            "Show the sorted materials in your result photo.",
            "Explain how you checked what your local collection accepts.",
          ],
        },
        {
          id: "conserve-water",
          creatorId: "zyvara-editorial",
          title: "Start a water-saving habit",
          category: "Conservation",
          description:
            "Take one practical step to conserve water, such as installing an approved aerator or creating a rainwater collection setup where permitted.",
          requirements: [
            "Show the conservation setup or action.",
            "Explain how it will help you use water thoughtfully.",
          ],
        },
      ])
      .onConflictDoNothing();
  });
}
