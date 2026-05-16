import { createFileRoute } from "@tanstack/react-router";
import { BackgroundAura } from "@/components/orbis/BackgroundAura";
import { OrbisCanvas } from "@/components/orbis/OrbisCanvas";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ORBIS — A Living Physics System" },
      { name: "description", content: "A meditative gravity-and-merge simulation. Watch glowing bodies drift, clump, and combine in deep space." },
      { property: "og:title", content: "ORBIS — A Living Physics System" },
      { property: "og:description", content: "Meditative gravity simulation. Bioluminescent bodies drift and merge." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <BackgroundAura />
      <OrbisCanvas />
      <h1 className="sr-only">ORBIS — A Living Physics System</h1>
    </main>
  );
}
