import type { LocationRecord } from "@/lib/app-data";
import { t } from "@/lib/i18n";
import { getLaneDiagram, LANE } from "./laneDiagram";

// A schematic of the saved details only: no measured length, no entrance
// geometry. Text carries the same facts, so the picture is never the only path.
export function LaneDiagram({ entry }: { entry: LocationRecord }) {
  const diagram = getLaneDiagram(entry);

  if (!diagram) {
    return null;
  }

  const { lane, side, distance, mark } = diagram;
  const details = [
    lane ? t.value.laneN(lane) : "",
    side ? t.value.factSide(side) : "",
    distance ? t.value.factDistance(distance) : "",
  ].filter(Boolean);
  const third = LANE.h / 3;

  return (
    <figure className="lane-diagram">
      <svg
        aria-label={t.value.diagramAlt(details.join(", "))}
        className="lane-diagram__svg"
        role="img"
        viewBox="0 0 96 128"
      >
        <rect className="lane-diagram__lane" x={LANE.x} y={LANE.y} width={LANE.w} height={LANE.h} />
        {mark ? <rect className="lane-diagram__mark" x={mark.x} y={mark.y} width={mark.w} height={mark.h} /> : null}
        <path
          className="lane-diagram__grid"
          d={`M${LANE.x} ${LANE.y + third}h${LANE.w}M${LANE.x} ${LANE.y + 2 * third}h${LANE.w}`}
        />
        <path className="lane-diagram__viewer" d="M48 117l7 9h-14z" />
      </svg>
      <figcaption className="lane-diagram__caption">{t.value.diagramCaption}</figcaption>
      <details className="lane-diagram__help">
        <summary>{t.value.diagramHelpTitle}</summary>
        <p>{t.value.diagramHelp}</p>
      </details>
    </figure>
  );
}
