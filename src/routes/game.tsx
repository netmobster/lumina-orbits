import { createFileRoute } from "@tanstack/react-router";
import { OrbisCanvas } from "@/components/orbis/OrbisCanvas";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "ORBIS — A Living Physics System" },
      { name: "description", content: "A meditative gravity-and-merge simulation. Watch glowing bodies drift, clump, and combine in deep space." },
      { property: "og:title", content: "ORBIS — A Living Physics System" },
      { property: "og:description", content: "Meditative gravity simulation. Bioluminescent bodies drift and merge." },
    ],
  }),
  component: Game,
});

function Game() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <OrbisCanvas />
      <h1 className="sr-only">ORBIS — A Living Physics System</h1>
    </main>
  );
}