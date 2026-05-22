import ProjectCanvas from "../components/ProjectCanvas.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

export default function SystemMap() {
  return (
    <div>
      <SectionHeader
        eyebrow="Interactive canvas"
        title="The plan as a draggable system."
        copy="The Konva canvas is intentionally simple: five nodes, explicit dependencies, touch fallback through accessible controls, and no decorative complexity hiding the operating logic."
      />
      <ProjectCanvas />
    </div>
  );
}
